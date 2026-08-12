const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { addLog, getLogs, getWeeklyStats } = require('../controllers/scraplog.controller');

router.post('/add', authMiddleware, addLog);
router.get('/', authMiddleware, getLogs);
router.get('/weekly', authMiddleware, getWeeklyStats);

module.exports = router;
