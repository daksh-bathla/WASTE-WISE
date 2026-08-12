const path = require('path');
const { analyzeProductImage } = require('./geminiService');
const { decomposeComponents } = require('./openrouterService');
const { runSafetyGate, getOverallDisposition } = require('./safetyGate');
const { getWeather } = require('../utils/weather');
const { getSeason } = require('../utils/seasonHelper');
const { fastDecompose, FAST_TRACK_TIMEOUT } = require('./fastTrackService');

const PEEL_NAME_PATTERN = /peel|peels|rind|shell|scrap|citrus|orange|lemon|lime|banana|mango|apple|potato|watermelon|coconut|mosambi/i;

const isPeelLikeName = (name = '') => PEEL_NAME_PATTERN.test(String(name).toLowerCase());

const cleanPeelName = (name = '') => String(name || '')
  .replace(/\s*\([^)]*\)\s*/gi, ' ')
  .replace(/\b(main body|product layer|packaging layer|organic)\b/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const buildPeelComponents = (name) => {
  const clean = cleanPeelName(name);
  if (!clean || !isPeelLikeName(clean)) return null;
  return [{
    component_name: clean,
    component_type: 'organic',
    material: 'organic',
    condition: 'good',
    estimated_percentage: 100,
  }];
};

const runAnalysisPipeline = async (req, pool) => {
  const pipelineStartTime = Date.now();
  console.log(`[AnalysisPipeline] Starting analysis for user ${req.user?.id || req.body.user_id}`);

  const safeParse = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return val; }
    }
    return val;
  };

  const {
    user_id,
    input_type,
    location_lat,
    location_lng,
    product_name,
    category,
    expiry_date,
    expiry_type,
    quantity,
    raw_input,
  } = req.body;
  
  const ingredients = safeParse(req.body.ingredients);
  const peels = safeParse(req.body.peels);
  const packaging_materials = safeParse(req.body.packaging_materials);
  const device_info = safeParse(req.body.device_info);

  const photo_data = req.file ? req.file.buffer.toString('base64') : req.body.photo_data;
  const photo_mime = req.file ? req.file.mimetype : req.body.photo_mime;
  const effectiveUserId = (req.user?.id && req.user.id !== 'guest') ? req.user.id : null;

  // Set overall pipeline timeout - must complete within 12 seconds
  const pipelineTimeout = 30000;
  let pipelineTimedOut = false;
  const timeoutTimer = setTimeout(() => {
    pipelineTimedOut = true;
    console.log(`[AnalysisPipeline] Overall pipeline timeout reached (${pipelineTimeout}ms)`);
  }, pipelineTimeout);

  try {
    const weather = await getWeather(location_lat || 28.6139, location_lng || 77.209);
    const season = getSeason(new Date().getMonth() + 1);

    let visionData = null;
    const userSelectedType = input_type;
    const prefillVision = safeParse(req.body.vision_data);
    if (prefillVision && typeof prefillVision === 'object' && !prefillVision.vision_failed) {
      visionData = prefillVision;
      console.log('[AnalysisPipeline] Using vision data from scan page (skipping duplicate API call)');
    } else if (photo_data && photo_mime && !pipelineTimedOut) {
      const skipVision = Boolean(userSelectedType && userSelectedType !== 'other');
      if (skipVision) {
        console.log(`[AnalysisPipeline] Skipping vision — user selected ${userSelectedType}`);
      } else {
        console.log(`[AnalysisPipeline] Image file received (MIME: ${photo_mime})`);
        try {
          console.log('[AnalysisPipeline] Running vision analysis...');
          const visionTimeout = new Promise((resolve) => {
            setTimeout(() => {
              console.log('[AnalysisPipeline] Vision analysis timeout');
              resolve(null);
            }, 12000);
          });
          visionData = await Promise.race([
            analyzeProductImage(photo_data, photo_mime),
            visionTimeout,
          ]);

          if (visionData && !visionData.vision_failed) {
            console.log('[AnalysisPipeline] Vision succeeded:', visionData.product_name || visionData.detected_category);
          } else {
            console.log('[AnalysisPipeline] Vision unavailable, continuing with form values');
          }
        } catch (error) {
          console.warn('[AnalysisPipeline] Vision failed, continuing with form values:', error.message);
        }
      }
    }

    let effectiveInputType = userSelectedType;

    // User-selected category beats vision — avoids misclassifying phones as "other".
    if (userSelectedType && userSelectedType !== 'other') {
      effectiveInputType = userSelectedType;
    } else if (visionData?.detected_category && !visionData?.vision_failed) {
      effectiveInputType = visionData.detected_category;
    }

    const inferredName = product_name || (Array.isArray(peels) ? peels.join(', ') : peels) || '';
    if (userSelectedType === 'food_peels' || isPeelLikeName(inferredName)) {
      effectiveInputType = 'food_peels';
    }
    if (device_info?.device_category || input_type === 'electronics') {
      effectiveInputType = 'electronics';
    }

    const [scanResult] = await pool.query(
      `INSERT INTO scans (user_id, input_type, location_lat, location_lng, weather_temp, weather_humidity, weather_uv, season)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [effectiveUserId || null, effectiveInputType, location_lat, location_lng, weather.temp, weather.humidity, weather.uv, season]
    );
    const scanId = scanResult.insertId;

    let finalProductName = product_name
      || (visionData?.product_name && !/^(scanned item|unknown|item)$/i.test(String(visionData.product_name)) ? visionData.product_name : null)
      || raw_input
      || 'Unknown Item';
    let finalCategory = category || (visionData?.category) || input_type;
    let finalExpiryDate = expiry_date || (visionData?.expiry_date);
    let finalExpiryType = expiry_type || (visionData?.expiry_type) || 'none';
    let finalIngredients = ingredients || (visionData?.ingredients) || [];
    let riskIndicators = visionData?.risk_indicators || [];

    if (effectiveInputType === 'food_peels' && peels) {
      finalProductName = Array.isArray(peels) ? peels.join(', ') : peels;
      finalCategory = 'peels';
    }

    if (effectiveInputType === 'waste_packaging' && packaging_materials) {
      finalProductName = `Waste packaging: ${Array.isArray(packaging_materials) ? packaging_materials.join(', ') : packaging_materials}`;
      finalCategory = 'packaging';
    }

    if (effectiveInputType === 'electronics' && device_info) {
      finalProductName = `${device_info.brand || ''} ${device_info.device_category}`.trim();
      finalCategory = 'electronics';
    }

    const daysPastExpiry = finalExpiryDate ? Math.floor((Date.now() - new Date(finalExpiryDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    let photoUrl = null;
    if (photo_data) {
      const uploadDir = path.join(__dirname, '../uploads');
      if (!require('fs').existsSync(uploadDir)) require('fs').mkdirSync(uploadDir, { recursive: true });
      const fileName = `scan_${scanId}.${(photo_mime || 'image/jpeg').split('/')[1] || 'jpg'}`;
      require('fs').writeFileSync(require('path').join(uploadDir, fileName), Buffer.from(photo_data, 'base64'));
      photoUrl = `/uploads/${fileName}`;
    }

    const [itemResult] = await pool.query(
      `INSERT INTO items (scan_id, product_name, category_id, expiry_type, expiry_date, days_past_expiry, risk_level, raw_input, photo_url)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      [scanId, finalProductName, finalExpiryType, finalExpiryDate || null, daysPastExpiry, 'safe', raw_input || JSON.stringify(req.body), photoUrl]
    );
    const itemId = itemResult.insertId;

    let components = [];
    if (effectiveInputType === 'food_peels') {
      const peelSource = peels || product_name || finalProductName;
      const peelList = Array.isArray(peelSource)
        ? peelSource.filter(Boolean)
        : String(peelSource || '').split(/,|\band\b/i).map((part) => part.trim()).filter(Boolean);
      components = (peelList.length ? peelList : [cleanPeelName(finalProductName) || finalProductName]).map((peel) => ({
        component_name: cleanPeelName(peel) || peel,
        component_type: 'organic',
        material: 'organic',
        condition: 'good',
        estimated_percentage: Math.round(100 / Math.max(peelList.length, 1)),
      }));
    } else if (buildPeelComponents(finalProductName)) {
      components = buildPeelComponents(finalProductName);
    } else if (effectiveInputType === 'waste_packaging' && packaging_materials) {
      const matList = Array.isArray(packaging_materials) ? packaging_materials : [packaging_materials];
      components = matList.map((mat) => ({
        component_name: `${mat} packaging`,
        component_type: 'packaging',
        material: mat,
        condition: req.body.packaging_condition || 'good',
        estimated_percentage: Math.round(100 / matList.length),
      }));
    } else if (effectiveInputType === 'electronics' && device_info) {
      components = [
        { component_name: 'device body/frame', component_type: 'electronic', material: device_info.device_category, condition: device_info.condition || 'fair', estimated_percentage: 40 },
        { component_name: 'circuit board', component_type: 'electronic', material: 'PCB', condition: device_info.condition || 'fair', estimated_percentage: 15 },
        { component_name: 'battery', component_type: 'electronic', material: 'lithium-ion', condition: 'fair', estimated_percentage: 10 },
        { component_name: 'screen/display', component_type: 'electronic', material: 'LCD/LED', condition: device_info.condition || 'fair', estimated_percentage: 20 },
      ];
    } else if (effectiveInputType === 'other') {
      // Handle "Other" category items using manually entered form data
      const other_info = safeParse(req.body.other_info);
      const otherMaterials = other_info?.materials || req.body.materials || [];
      const matList = Array.isArray(otherMaterials) ? otherMaterials : [otherMaterials];

      if (matList.length > 0 && matList[0]) {
        // Build components from the user-specified materials
        components = matList.map((mat) => ({
          component_name: `${finalProductName} (${mat})`,
          component_type: 'other',
          material: mat,
          condition: other_info?.condition || req.body.condition || 'fair',
          estimated_percentage: Math.round(100 / matList.length),
        }));
      } else {
        // No materials specified — fall through to AI decomposition
        let decomposed = null;
        try {
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
              console.log('[AnalysisPipeline] AI decomposition timeout for other item, using fast-track');
              resolve(null);
            }, 6000);
          });

          decomposed = await Promise.race([
            decomposeComponents(finalProductName, finalCategory),
            timeoutPromise
          ]);

          if (!decomposed || !Array.isArray(decomposed)) {
            console.log('[AnalysisPipeline] Using fast-track decomposition for other item');
            decomposed = fastDecompose(finalProductName, finalCategory);
          }
        } catch (error) {
          console.error('Decomposition error (other):', error.message);
          decomposed = fastDecompose(finalProductName, finalCategory);
        }
        components = decomposed;
      }
    } else {
      // Race AI decomposition against timeout
      let decomposed = null;
      try {
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            console.log('[AnalysisPipeline] AI decomposition timeout, using fast-track');
            resolve(null);
          }, 6000); // 6 second timeout
        });

        decomposed = await Promise.race([
          decomposeComponents(finalProductName, finalCategory),
          timeoutPromise
        ]);

        if (!decomposed || !Array.isArray(decomposed)) {
          console.log('[AnalysisPipeline] Using fast-track decomposition');
          decomposed = fastDecompose(finalProductName, finalCategory);
        }
      } catch (error) {
        console.error('Decomposition error:', error.message);
        decomposed = fastDecompose(finalProductName, finalCategory);
      }
      components = decomposed;
    }

    const componentIds = [];
    for (const comp of components) {
      const [compResult] = await pool.query(
        `INSERT INTO item_components (item_id, component_name, component_type, material, condition_status, estimated_quantity, unit, is_safe_to_repurpose)
         VALUES (?, ?, ?, ?, ?, ?, 'percent', TRUE)`,
        [itemId, comp.component_name, comp.component_type, comp.material, comp.condition, comp.estimated_percentage]
      );
      componentIds.push(compResult.insertId);
    }

    const componentsWithIds = components.map((c, i) => ({
      ...c,
      id: componentIds[i],
      item_name: finalProductName,
    }));

    const [userRows] = await pool.query(
      `SELECT u.*, um.conditions, um.medications, um.allergies, um.is_pregnant, um.age_group,
              us.skin_type, us.known_reactions, us.sensitivity_level,
              ud.is_diabetic, ud.is_vegan, ud.is_jain, ud.is_halal, ud.is_gluten_free,
              uh.animals, uh.family_members, uh.children_count, uh.elderly_count,
              up.culture, up.region, up.state, up.city, up.is_rural, up.lat, up.lng
       FROM users u
       LEFT JOIN user_medical um ON u.id = um.user_id
       LEFT JOIN user_skin us ON u.id = us.user_id
       LEFT JOIN user_dietary ud ON u.id = ud.user_id
       LEFT JOIN user_household uh ON u.id = uh.user_id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ?`,
      [effectiveUserId]
    );
    const userProfile = userRows[0] || {};

    const userMedical = {
      conditions: userProfile.conditions,
      medications: userProfile.medications,
      allergies: userProfile.allergies,
      is_pregnant: userProfile.is_pregnant,
      age_group: userProfile.age_group,
      skin_type: userProfile.skin_type,
    };

    const safetyResults = await runSafetyGate(componentsWithIds, {
      productName: finalProductName,
      category: finalCategory,
      daysPastExpiry,
      expiry_type: finalExpiryType,
      risk_indicators: riskIndicators,
    }, userMedical, weather, pool);

    const disposition = getOverallDisposition(safetyResults);

    const elapsed = Date.now() - pipelineStartTime;
    console.log(`[AnalysisPipeline] Completed in ${elapsed}ms`);

    clearTimeout(timeoutTimer);

    return {
      scanId,
      itemId,
      productName: finalProductName,
      category: finalCategory,
      components: componentsWithIds,
      safetyResults,
      disposition,
      weather,
      userProfile,
    };
  } catch (error) {
    clearTimeout(timeoutTimer);
    const elapsed = Date.now() - pipelineStartTime;
    console.error(`[AnalysisPipeline] Error after ${elapsed}ms:`, error.message);
    throw error;
  }
};

module.exports = { runAnalysisPipeline };