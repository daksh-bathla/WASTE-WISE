const axios = require('axios');

const buildStaticEwasteAssessment = (deviceInfo = {}, location = {}) => {
  const category = String(deviceInfo.device_category || deviceInfo.category || 'electronic device').toLowerCase();
  const brand = String(deviceInfo.brand || '').trim();
  const deviceLabel = [brand, deviceInfo.device_category || 'Electronic device'].filter(Boolean).join(' ').trim();
  const isPhone = /\b(phone|smartphone|mobile)\b/.test(category);
  const isLaptop = /\b(laptop|notebook)\b/.test(category);

  return {
    device: deviceLabel,
    city: location.city || 'your area',
    can_repair: deviceInfo.condition !== 'broken',
    repair_difficulty: deviceInfo.condition === 'broken' ? 'Professional only' : 'Medium',
    common_fix: deviceInfo.issue
      ? `For "${deviceInfo.issue}", check manufacturer support or a certified repair shop before repurposing.`
      : (isPhone
        ? 'Battery replacement or a factory reset often restores usable performance on older phones.'
        : 'A basic clean-up, driver update, or battery check may restore function before recycling.'),
    ifixit_search_term: isPhone ? 'smartphone battery replacement' : `${category} repair`,
    can_sell: deviceInfo.condition !== 'broken',
    estimated_resale_value: deviceInfo.condition === 'good' ? '₹500–₹3,000 depending on model' : '₹100–₹800 as parts/recycle value',
    recommended_platforms: ['Cashify', 'OLX'],
    can_donate: deviceInfo.condition === 'good' || deviceInfo.condition === 'fair',
    donation_suitable_for: 'schools or community labs when the device still powers on',
    components_to_salvage: isPhone
      ? [
          { component: 'working screen', condition: deviceInfo.condition || 'fair', reuse: 'spare display test bench or kid learning device' },
          { component: 'camera module', condition: 'likely good', reuse: 'repurposed home security camera with a camera app' },
        ]
      : isLaptop
        ? [
            { component: 'storage drive', condition: 'likely good', reuse: 'external backup drive with a USB enclosure' },
            { component: 'RAM', condition: 'fair', reuse: 'upgrade another compatible laptop if specs match' },
          ]
        : [],
    recycling_required_for: ['battery', 'screen', 'circuit board'],
    contains_hazardous: true,
    hazardous_materials: ['lithium battery'],
  };
};

const assessEwaste = async (deviceInfo, location, openrouterChat) => {
  const prompt = `Device: ${deviceInfo.device_category}, brand: ${deviceInfo.brand || 'unknown'}, age: ${deviceInfo.age || 'unknown'}, condition: ${deviceInfo.condition || 'unknown'}
Specific issue: ${deviceInfo.issue || 'none'}
User location: ${location.city || 'unknown'}, ${location.state || 'unknown'}

Assess this electronic device and determine all possible pathways.
Return JSON:
{
  "can_repair": true or false,
  "repair_difficulty": "Easy/Medium/Hard/Professional only",
  "common_fix": "most likely fix for the stated issue",
  "ifixit_search_term": "search term to find iFixit guide",
  "can_sell": true or false,
  "estimated_resale_value": "range in rupees",
  "recommended_platforms": ["Cashify", "OLX"],
  "can_donate": true or false,
  "donation_suitable_for": "schools/offices/individuals",
  "components_to_salvage": [
    {"component": "speakers", "condition": "likely good", "reuse": "use with amplifier board"}
  ],
  "recycling_required_for": ["battery", "screen", "circuit board"],
  "contains_hazardous": true or false,
  "hazardous_materials": ["lithium battery", "mercury in screen"]
}

Return ONLY the JSON object.`;

  try {
    const result = await openrouterChat([{ role: 'user', content: prompt }], 2048);
    if (!result) return buildStaticEwasteAssessment(deviceInfo, location);

    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      ...buildStaticEwasteAssessment(deviceInfo, location),
      ...parsed,
      device: parsed.device || buildStaticEwasteAssessment(deviceInfo, location).device,
    };
  } catch (error) {
    console.error('E-waste assessment error:', error.message);
    return buildStaticEwasteAssessment(deviceInfo, location);
  }
};

const getRecyclingPlatforms = async (pool, type = 'recycling') => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM electronics_platforms WHERE type = ? ORDER BY is_doorstep_pickup DESC',
      [type]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching recycling platforms:', error.message);
    return [];
  }
};

const getResalePlatforms = async (pool) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM electronics_platforms WHERE type = "resale" ORDER BY pays_user DESC'
    );
    return rows;
  } catch (error) {
    console.error('Error fetching resale platforms:', error.message);
    return [];
  }
};

const getDonationPlatforms = async (pool) => {
  try {
    const [rows] = await pool.query('SELECT * FROM electronics_platforms WHERE type = "donation"');
    return rows;
  } catch (error) {
    console.error('Error fetching donation platforms:', error.message);
    return [];
  }
};

module.exports = { assessEwaste, buildStaticEwasteAssessment, getRecyclingPlatforms, getResalePlatforms, getDonationPlatforms };
