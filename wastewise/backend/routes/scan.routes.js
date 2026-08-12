const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { startScan, getRecentScans, getScanResults, getSeasonalSuggestion, getVisionData } = require('../controllers/scan.controller');

const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const maybeUploadPhoto = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return upload.single('photo')(req, res, next);
  }
  return next();
};

router.post('/analyse', authMiddleware, maybeUploadPhoto, startScan);
router.post('/vision', authMiddleware, maybeUploadPhoto, getVisionData);
router.get('/recent', authMiddleware, getRecentScans);
router.get('/results/:scanId', authMiddleware, getScanResults);
router.get('/seasonal', authMiddleware, getSeasonalSuggestion);

module.exports = router;
