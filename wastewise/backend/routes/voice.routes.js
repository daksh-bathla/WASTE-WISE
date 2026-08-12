const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { generateVoice } = require('../controllers/voice.controller');

router.post('/generate', authMiddleware, generateVoice);

module.exports = router;
