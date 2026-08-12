const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { generateSuggestions, getEwasteAssessment, getDisposalOptions } = require('../controllers/suggestions.controller');

router.post('/generate', authMiddleware, generateSuggestions);
router.get('/ewaste/:scanId', authMiddleware, getEwasteAssessment);
router.get('/disposal/:scanId', authMiddleware, getDisposalOptions);

module.exports = router;
