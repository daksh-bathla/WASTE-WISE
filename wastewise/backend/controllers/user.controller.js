const pool = require('../config/db');

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT u.*, 
              up.culture, up.region, up.state, up.city, up.is_rural, up.lat, up.lng,
              um.conditions, um.medications, um.allergies, um.is_pregnant, um.age_group,
              us.skin_type, us.known_reactions, us.sensitivity_level,
              ud.is_diabetic, ud.is_vegan, ud.is_jain, ud.is_halal, ud.is_gluten_free,
              uh.animals, uh.family_members, uh.children_count, uh.elderly_count
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN user_medical um ON u.id = um.user_id
       LEFT JOIN user_skin us ON u.id = us.user_id
       LEFT JOIN user_dietary ud ON u.id = ud.user_id
       LEFT JOIN user_household uh ON u.id = uh.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = rows[0];
    delete profile.password_hash;

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      language,
      culture,
      region,
      state,
      city,
      is_rural,
      lat,
      lng,
      conditions,
      medications,
      allergies,
      is_pregnant,
      age_group,
      skin_type,
      known_reactions,
      sensitivity_level,
      is_diabetic,
      is_vegan,
      is_jain,
      is_halal,
      is_gluten_free,
      animals,
      family_members,
      children_count,
      elderly_count,
    } = req.body;

    if (name || language) {
      await pool.query(
        'UPDATE users SET name = COALESCE(?, name), language = COALESCE(?, language) WHERE id = ?',
        [name, language, userId]
      );
    }

    if (culture || region || state || city || is_rural !== undefined || lat || lng) {
      await pool.query(
        `INSERT INTO user_profiles (user_id, culture, region, state, city, is_rural, lat, lng)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           culture = COALESCE(VALUES(culture), culture),
           region = COALESCE(VALUES(region), region),
           state = COALESCE(VALUES(state), state),
           city = COALESCE(VALUES(city), city),
           is_rural = COALESCE(VALUES(is_rural), is_rural),
           lat = COALESCE(VALUES(lat), lat),
           lng = COALESCE(VALUES(lng), lng)`,
        [userId, culture, region, state, city, is_rural, lat, lng]
      );
    }

    if (conditions || medications || allergies || is_pregnant !== undefined || age_group) {
      await pool.query(
        `INSERT INTO user_medical (user_id, conditions, medications, allergies, is_pregnant, age_group)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           conditions = COALESCE(VALUES(conditions), conditions),
           medications = COALESCE(VALUES(medications), medications),
           allergies = COALESCE(VALUES(allergies), allergies),
           is_pregnant = COALESCE(VALUES(is_pregnant), is_pregnant),
           age_group = COALESCE(VALUES(age_group), age_group)`,
        [userId, conditions, medications, allergies, is_pregnant, age_group]
      );
    }

    if (skin_type || known_reactions || sensitivity_level) {
      await pool.query(
        `INSERT INTO user_skin (user_id, skin_type, known_reactions, sensitivity_level)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           skin_type = COALESCE(VALUES(skin_type), skin_type),
           known_reactions = COALESCE(VALUES(known_reactions), known_reactions),
           sensitivity_level = COALESCE(VALUES(sensitivity_level), sensitivity_level)`,
        [userId, skin_type, known_reactions, sensitivity_level]
      );
    }

    if (is_diabetic !== undefined || is_vegan !== undefined || is_jain !== undefined || is_halal !== undefined || is_gluten_free !== undefined) {
      await pool.query(
        `INSERT INTO user_dietary (user_id, is_diabetic, is_vegan, is_jain, is_halal, is_gluten_free)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           is_diabetic = COALESCE(VALUES(is_diabetic), is_diabetic),
           is_vegan = COALESCE(VALUES(is_vegan), is_vegan),
           is_jain = COALESCE(VALUES(is_jain), is_jain),
           is_halal = COALESCE(VALUES(is_halal), is_halal),
           is_gluten_free = COALESCE(VALUES(is_gluten_free), is_gluten_free)`,
        [userId, is_diabetic, is_vegan, is_jain, is_halal, is_gluten_free]
      );
    }

    if (animals || family_members !== undefined || children_count !== undefined || elderly_count !== undefined) {
      await pool.query(
        `INSERT INTO user_household (user_id, animals, family_members, children_count, elderly_count)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           animals = COALESCE(VALUES(animals), animals),
           family_members = COALESCE(VALUES(family_members), family_members),
           children_count = COALESCE(VALUES(children_count), children_count),
           elderly_count = COALESCE(VALUES(elderly_count), elderly_count)`,
        [userId, animals ? JSON.stringify(animals) : null, family_members, children_count, elderly_count]
      );
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'Account and all data deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

const getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [scanCount] = await pool.query(
      'SELECT COUNT(*) as count FROM scans WHERE user_id = ?',
      [userId]
    );

    const [repurposed] = await pool.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as total_weight FROM scrap_log WHERE user_id = ? AND action_taken = "repurposed"',
      [userId]
    );

    const [communityPosts] = await pool.query(
      'SELECT COUNT(*) as count FROM community_ratings WHERE user_id = ?',
      [userId]
    );

    const [streakData] = await pool.query(
      'SELECT streak_count FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      scansDone: scanCount[0].count,
      itemsRepurposed: repurposed[0].count,
      totalWeightKg: parseFloat(repurposed[0].total_weight) || 0,
      communityPosts: communityPosts[0].count,
      streakCount: streakData[0]?.streak_count || 0,
    });
  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = { getProfile, updateProfile, deleteAccount, getStats };
