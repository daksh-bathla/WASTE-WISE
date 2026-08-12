const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getProfile, updateProfile, deleteAccount, getStats } = require('../controllers/user.controller');

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.delete('/account', authMiddleware, deleteAccount);
router.get('/stats', authMiddleware, getStats);

module.exports = router;
