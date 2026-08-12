const pool = require('../config/db');

const submitRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const { suggestion_id, rating, review, photo_url, post_to_community } = req.body;

    if (!suggestion_id || !rating) {
      return res.status(400).json({ error: 'Suggestion ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM community_ratings WHERE suggestion_id = ? AND user_id = ?',
      [suggestion_id, userId]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE community_ratings SET rating = ?, review = ?, photo_url = ?, tried_it = TRUE WHERE suggestion_id = ? AND user_id = ?',
        [rating, review, photo_url, suggestion_id, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO community_ratings (suggestion_id, user_id, rating, review, photo_url, tried_it) VALUES (?, ?, ?, ?, ?, ?)',
        [suggestion_id, userId, rating, review, photo_url, true]
      );
    }

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error('Submit rating error:', error.message);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

const getCommunityFeed = async (req, res) => {
  try {
    const { filter } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let orderBy = 'cr.created_at DESC';
    if (filter === 'most_rated') {
      orderBy = 'cr.rating DESC';
    } else if (filter === 'this_week') {
      orderBy = 'cr.created_at DESC';
    }

    let whereClause = 'WHERE cr.tried_it = TRUE';
    if (filter === 'this_week') {
      whereClause += ' AND cr.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    }

    const [posts] = await pool.query(
      `SELECT cr.id, cr.rating, cr.review, cr.photo_url, cr.created_at,
              u.name as user_name, up.city as user_city,
              s.title as suggestion_title, s.module_type,
              ic.component_name, i.product_name as item_used
       FROM community_ratings cr
       JOIN users u ON cr.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       JOIN suggestions s ON cr.suggestion_id = s.id
       JOIN item_components ic ON s.item_component_id = ic.id
       JOIN items i ON ic.item_id = i.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      rating: post.rating,
      review: post.review,
      photoUrl: post.photo_url,
      createdAt: post.created_at,
      userName: post.user_name ? post.user_name.split(' ')[0] : 'Anonymous',
      userCity: post.user_city || 'India',
      suggestionTitle: post.suggestion_title,
      moduleType: post.module_type,
      componentName: post.component_name,
      itemUsed: post.item_used,
    }));

    res.json({ posts: formattedPosts, total: posts.length, page });
  } catch (error) {
    console.error('Get community feed error:', error.message);
    res.status(500).json({ error: 'Failed to fetch community feed' });
  }
};

const getTrendingSuggestions = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.title, s.module_type, s.personalisation_note,
              AVG(cr.rating) as avg_rating, COUNT(cr.id) as total_ratings
       FROM suggestions s
       JOIN community_ratings cr ON s.id = cr.suggestion_id
       WHERE cr.tried_it = TRUE
       AND cr.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY s.id
       ORDER BY avg_rating DESC, total_ratings DESC
       LIMIT 5`
    );

    res.json({ trending: rows });
  } catch (error) {
    console.error('Get trending suggestions error:', error.message);
    res.status(500).json({ error: 'Failed to fetch trending suggestions' });
  }
};

const getTopCities = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT up.city, COUNT(DISTINCT sl.id) as items_repurposed
       FROM scrap_log sl
       JOIN user_profiles up ON sl.user_id = up.user_id
       WHERE sl.action_taken = 'repurposed'
       AND sl.logged_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       AND up.city IS NOT NULL
       GROUP BY up.city
       ORDER BY items_repurposed DESC
       LIMIT 10`
    );

    res.json({ topCities: rows });
  } catch (error) {
    console.error('Get top cities error:', error.message);
    res.status(500).json({ error: 'Failed to fetch top cities' });
  }
};

module.exports = { submitRating, getCommunityFeed, getTrendingSuggestions, getTopCities };
