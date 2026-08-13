const { generateAllSuggestions } = require('../services/suggestionModules');
const { assessEwaste, getRecyclingPlatforms, getResalePlatforms, getDonationPlatforms } = require('../services/ewasteService');
const { getSeason } = require('../utils/seasonHelper');
const { getWeather } = require('../utils/weather');
const pool = require('../config/db');

const generateSuggestions = async (req, res) => {
  try {
    const { scan_id, selected_goals, contextual_answers } = req.body;
    const userId = req.user?.id;

    const goals = selected_goals || ['all'];

    // Look up scan - support both authenticated users and guests
    const [scanRows] = await pool.query('SELECT * FROM scans WHERE id = ?', [scan_id]);
    const scan = scanRows[0];

    if (!scan || (userId && userId !== 'guest' && scan.user_id !== null && String(scan.user_id) !== String(userId))) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const weather = {
      temp: scan.weather_temp,
      humidity: scan.weather_humidity,
      uv: scan.weather_uv,
      season: scan.season || getSeason(new Date().getMonth() + 1),
    };

    const [items] = await pool.query('SELECT * FROM items WHERE scan_id = ?', [scan_id]);
    const components = [];

    for (const item of items) {
      const [compRows] = await pool.query(
        'SELECT * FROM item_components WHERE item_id = ?',
        [item.id]
      );
      components.push(...compRows.map((c) => ({ ...c, item_name: item.product_name })));
    }

    const safetyResults = components.map((c) => ({
      component_id: c.id,
      is_safe: Boolean(c.is_safe_to_repurpose),
    }));

    let userProfile = {};
    if (userId && userId !== 'guest') {
      const [userRows] = await pool.query(
        `SELECT u.*, up.culture, up.state, up.city, up.is_rural, up.lat, up.lng, up.language,
                um.conditions, um.medications, um.allergies, um.is_pregnant, um.age_group,
                us.skin_type
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         LEFT JOIN user_medical um ON u.id = um.user_id
         LEFT JOIN user_skin us ON u.id = us.user_id
         WHERE u.id = ?`,
        [userId]
      );
      userProfile = userRows[0] || {};
    }

    const analysisResult = {
      scanId: scan_id,
      components,
      safetyResults,
      weather,
      userProfile,
      productName: items[0]?.product_name || 'Item',
      category: scan.input_type,
      rawInput: items[0]?.raw_input,
    };

    // Wrap the entire suggestion generation with a 45s timeout
    const generationTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Suggestion generation timeout')), 45000)
    );

    const result = await Promise.race([
      generateAllSuggestions(analysisResult, goals, contextual_answers || {}, pool),
      generationTimeout,
    ]);

    res.json(result);
  } catch (error) {
    console.error('Generate suggestions error:', error.message);
    // Return success anyway — fast-track suggestions may have been written to DB already
    res.json({ suggestions_count: 0, suggestions: [], message: error.message });
  }
};

const getEwasteAssessment = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user?.id ?? null;

    const [scanRows] = await pool.query('SELECT * FROM scans WHERE id = ?', [scanId]);
    const scan = scanRows[0];
    if (!scan || (userId && scan.user_id !== null && String(scan.user_id) !== String(userId))) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const [items] = await pool.query('SELECT * FROM items WHERE scan_id = ?', [scanId]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'No items found for this scan' });
    }

    const item = items[0];
    let rawParsed = {};
    try {
      rawParsed = typeof item.raw_input === 'string' ? JSON.parse(item.raw_input) : (item.raw_input || {});
    } catch {
      rawParsed = {};
    }

    const form = rawParsed.form || rawParsed;
    const deviceInfo = rawParsed.device_info || {
      brand: form.brand || '',
      device_category: form.category || item.product_name || 'electronic device',
      age: form.age || '',
      condition: form.condition || 'fair',
      issue: form.issue || '',
    };

    const [profileRows] = await pool.query(
      'SELECT city, state, lat, lng FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    const location = profileRows[0] || {};

    const { chat: openrouterChat } = require('../services/openrouterService');
    const assessment = await assessEwaste(deviceInfo, location, openrouterChat);

    const [recyclingPlatforms, resalePlatforms, donationPlatforms] = await Promise.all([
      getRecyclingPlatforms(pool),
      getResalePlatforms(pool),
      getDonationPlatforms(pool),
    ]);

    res.json({
      assessment,
      ewasteAssessment: assessment,
      recyclingPlatforms,
      resalePlatforms,
      donationPlatforms,
    });
  } catch (error) {
    console.error('E-waste assessment error:', error.message);
    res.status(500).json({ error: 'Failed to assess e-waste' });
  }
};

const getDisposalOptions = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.user.id;

    const [profileRows] = await pool.query(
      'SELECT lat, lng, city FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    const profile = profileRows[0] || {};

    const disposalOptions = [
      {
        type: 'compost',
        title: 'Compost',
        description: 'If organic, compost in your garden or community compost bin.',
        has_garden: profile.is_rural === 1,
      },
      {
        type: 'kabadiwala',
        title: 'Nearest kabadiwala',
        description: 'Sell recyclables to your local scrap dealer.',
      },
      {
        type: 'hazardous',
        title: 'Hazardous waste collection',
        description: 'For degraded cosmetics and chemicals — follow CPCB guidelines.',
      },
      {
        type: 'waste_bin',
        title: 'Regular waste bin',
        description: 'Last resort — wrap properly before disposing.',
      },
    ];

    res.json({ disposalOptions, location: profile });
  } catch (error) {
    console.error('Get disposal options error:', error.message);
    res.status(500).json({ error: 'Failed to fetch disposal options' });
  }
};

module.exports = { generateSuggestions, getEwasteAssessment, getDisposalOptions };
