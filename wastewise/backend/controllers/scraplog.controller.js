const pool = require('../config/db');
const { getNearbyGaushalas } = require('../utils/haversine');

const addLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_name, item_type, quantity, unit, action_taken, logged_date } = req.body;

    if (!item_name || !action_taken) {
      return res.status(400).json({ error: 'Item name and action taken are required' });
    }

    const logDate = logged_date || new Date().toISOString().split('T')[0];

    await pool.query(
      'INSERT INTO scrap_log (user_id, item_name, item_type, quantity, unit, action_taken, logged_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, item_name, item_type, quantity || 0, unit || 'pieces', action_taken, logDate]
    );

    const today = new Date().toISOString().split('T')[0];
    const [lastActive] = await pool.query(
      'SELECT last_active, streak_count FROM users WHERE id = ?',
      [userId]
    );

    if (lastActive[0]?.last_active) {
      const lastDate = new Date(lastActive[0].last_active);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        await pool.query(
          'UPDATE users SET streak_count = streak_count + 1, last_active = ? WHERE id = ?',
          [today, userId]
        );
      } else if (diffDays > 1) {
        await pool.query(
          'UPDATE users SET streak_count = 1, last_active = ? WHERE id = ?',
          [today, userId]
        );
      }
    } else {
      await pool.query(
        'UPDATE users SET streak_count = 1, last_active = ? WHERE id = ?',
        [today, userId]
      );
    }

    res.json({ message: 'Log entry added successfully' });
  } catch (error) {
    console.error('Add scrap log error:', error.message);
    res.status(500).json({ error: 'Failed to add log entry' });
  }
};

const getLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, date_from, date_to, action } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM scrap_log WHERE user_id = ?';
    const params = [userId];

    if (type) {
      query += ' AND item_type = ?';
      params.push(type);
    }
    if (date_from) {
      query += ' AND logged_date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND logged_date <= ?';
      params.push(date_to);
    }
    if (action) {
      query += ' AND action_taken = ?';
      params.push(action);
    }

    query += ' ORDER BY logged_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);

    const [countRows] = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*) as total').replace(' LIMIT ? OFFSET ?', ''),
      params.slice(0, -2)
    );

    const total = countRows[0]?.total || 0;

    res.json({ logs: rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get scrap logs error:', error.message);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

const getWeeklyStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [weekStats] = await pool.query(
      `SELECT 
        COUNT(*) as items_logged,
        COALESCE(SUM(CASE WHEN item_type = "Food peel" OR item_type = "peels" THEN quantity ELSE 0 END), 0) as peel_weight,
        COALESCE(SUM(quantity), 0) as total_weight,
        COUNT(CASE WHEN action_taken = "fed_to_animals" THEN 1 END) as cattle_fed_count
       FROM scrap_log 
       WHERE user_id = ? AND logged_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );

    const [peelBreakdown] = await pool.query(
      `SELECT item_name, COUNT(*) as count, SUM(quantity) as total_qty, unit
       FROM scrap_log
       WHERE user_id = ? AND logged_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       AND (item_type = "Food peel" OR item_type = "peels")
       GROUP BY item_name`,
      [userId]
    );

    const [profileRows] = await pool.query(
      'SELECT lat, lng FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    const profile = profileRows[0] || {};

    let gaushalas = [];
    const totalPeelWeight = parseFloat(weekStats[0]?.peel_weight) || 0;
    if (totalPeelWeight >= 500) {
      gaushalas = await getNearbyGaushalas(pool, profile.lat, profile.lng, 3);
    }

    res.json({
      weekStats: weekStats[0],
      peelBreakdown,
      gaushalas: totalPeelWeight >= 500 ? gaushalas : [],
      peelThresholdReached: totalPeelWeight >= 500,
    });
  } catch (error) {
    console.error('Get weekly stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
};

module.exports = { addLog, getLogs, getWeeklyStats };
