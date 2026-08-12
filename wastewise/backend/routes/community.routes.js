const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { submitRating, getCommunityFeed, getTrendingSuggestions, getTopCities } = require('../controllers/community.controller');

router.post('/rate', authMiddleware, submitRating);
router.get('/feed', authMiddleware, getCommunityFeed);
router.get('/trending', authMiddleware, getTrendingSuggestions);
router.get('/top-cities', authMiddleware, getTopCities);

module.exports = router;
