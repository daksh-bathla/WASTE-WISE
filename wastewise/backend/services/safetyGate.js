const { safetyAssessment } = require('./openrouterService');
const { checkHardBlocks, checkUserSafety } = require('../utils/safetyRules');
const { fastSafetyCheck, FAST_TRACK_TIMEOUT } = require('./fastTrackService');

const runSafetyGate = async (components, productInfo, userMedical, weather, pool) => {
  const results = [];

  for (const component of components) {
    const hardBlock = checkHardBlocks(component.component_name, productInfo.category);

    if (hardBlock.blocked) {
      results.push({
        component_id: component.id,
        is_safe: false,
        safety_level: 'unsafe',
        reason: hardBlock.reason,
        safe_for_body: false,
        safe_for_animals: false,
        safe_for_plants: false,
        safe_for_crafts: false,
        warnings: [hardBlock.reason],
        must_not: [hardBlock.reason],
        hard_block: true,
      });
      continue;
    }

    const expiryInfo = {
      daysPastExpiry: productInfo.daysPastExpiry || 0,
      category: productInfo.category || '',
      hasMould: (productInfo.risk_indicators || []).some((r) => r.toLowerCase().includes('mould')),
    };

    const userSafety = checkUserSafety(component, userMedical, expiryInfo);

    const isElectronicComponent = /electronic|electronics|phone|laptop|tablet|battery|circuit|screen|charger|cable|ewaste|e-waste/i.test(
      `${component.component_type || ''} ${component.component_name || ''} ${productInfo.category || ''}`
    );

    let aiAssessment = null;
    try {
      if (isElectronicComponent) {
        console.log(`[SafetyGate] Fast-track electronics safety for ${component.component_name}`);
        aiAssessment = fastSafetyCheck(component, productInfo);
      } else {
      // Race AI assessment against timeout
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.log(`[SafetyGate] AI timeout for ${component.component_name}, using fast-track`);
          resolve(null);
        }, 5000); // 5 second timeout for safety assessment
      });

      aiAssessment = await Promise.race([
        safetyAssessment(
          component,
          { productName: productInfo.productName, category: productInfo.category },
          expiryInfo.daysPastExpiry,
          productInfo.expiry_type || 'none',
          productInfo.risk_indicators || [],
          userMedical,
          weather
        ),
        timeoutPromise
      ]);

      if (!aiAssessment) {
        console.log(`[SafetyGate] Using fast-track safety check for ${component.component_name}`);
        aiAssessment = fastSafetyCheck(component, productInfo);
      }
      }
    } catch (error) {
      console.error('Safety gate AI assessment error:', error.message);
      aiAssessment = fastSafetyCheck(component, productInfo);
    }

    const assessment = aiAssessment || {
      is_safe: true,
      safety_level: 'caution',
      reason: 'Could not complete safety analysis — use with caution.',
      safe_for_body: true,
      safe_for_animals: true,
      safe_for_plants: true,
      safe_for_crafts: true,
      warnings: ['Use with caution — automated analysis incomplete.'],
      must_not: [],
    };

    if (hardBlock.blockedForAnimals) {
      assessment.safe_for_animals = false;
      assessment.warnings.push(hardBlock.reason);
    }

    if (hardBlock.blockPreciousMetalExtraction) {
      assessment.must_not.push(hardBlock.reason);
    }

    assessment.warnings.push(...userSafety.warnings);
    assessment.must_not.push(...userSafety.must_not);

    const is_safe = assessment.is_safe && userSafety.must_not.length === 0;
    const safety_level = !is_safe
      ? 'unsafe'
      : assessment.safety_level === 'unsafe'
        ? 'caution'
        : assessment.safety_level;

    const componentResult = {
      component_id: component.id,
      is_safe,
      safety_level,
      reason: assessment.reason,
      safe_for_body: assessment.safe_for_body,
      safe_for_animals: assessment.safe_for_animals,
      safe_for_plants: assessment.safe_for_plants,
      safe_for_crafts: assessment.safe_for_crafts,
      warnings: [...new Set(assessment.warnings)],
      must_not: [...new Set(assessment.must_not)],
    };

    results.push(componentResult);

    try {
      await pool.query(
        `UPDATE item_components SET is_safe_to_repurpose = ? WHERE id = ?`,
        [is_safe, component.id]
      );
    } catch (dbError) {
      console.error('Failed to update component safety:', dbError.message);
    }
  }

  return results;
};

const getOverallDisposition = (safetyResults) => {
  const safeCount = safetyResults.filter((r) => r.is_safe).length;
  const total = safetyResults.length;

  if (safeCount === 0) return 'disposal';
  if (safeCount < total) return 'partial';
  return 'all_safe';
};

module.exports = { runSafetyGate, getOverallDisposition };
