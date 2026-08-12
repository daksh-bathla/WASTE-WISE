const { runAnalysisPipeline } = require('../services/analysisPipeline');
const { getNearbyGaushalas } = require('../utils/haversine');
const { getSeasonalSuggestion: getSeasonalTip } = require('../utils/seasonHelper');
const pool = require('../config/db');

const isDisposalSuggestion = (suggestion = {}) => {
  const text = `${suggestion.title || ''} ${suggestion.personalisation_note || ''}`.toLowerCase();
  return suggestion.module_type === 'disposal'
    || /safe disposal plan|sort .* before disposal|could not be confirmed safely|before disposal/i.test(text);
};

const startScan = async (req, res) => {
  const startTime = Date.now();
  console.log(`[ScanController] Starting scan for user ${req.user?.id || 'unknown'}`);
  
  try {
    const analysis = await runAnalysisPipeline(req, pool);
    const elapsed = Date.now() - startTime;
    console.log(`[ScanController] Scan completed in ${elapsed}ms, scanId: ${analysis.scanId}`);

    res.json({
      scanId: analysis.scanId,
      itemId: analysis.itemId,
      productName: analysis.productName,
      category: analysis.category,
      components: analysis.components,
      safetyResults: analysis.safetyResults,
      disposition: analysis.disposition,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[ScanController] Error after ${elapsed}ms:`, error.message);
    console.error('[ScanController] Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to analyse your item', details: error.message });
  }
};

const getRecentScans = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.json({ scans: [] });
    }
    const limit = parseInt(req.query.limit) || 4;

    const [rows] = await pool.query(
      `SELECT s.id, s.input_type, s.created_at,
              i.product_name, i.risk_level,
              (SELECT COUNT(*) FROM suggestions sg 
               JOIN item_components ic ON sg.item_component_id = ic.id 
               WHERE ic.item_id = i.id) as suggestion_count
       FROM scans s
       LEFT JOIN items i ON s.id = i.scan_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json({ scans: rows });
  } catch (error) {
    console.error('Get recent scans error:', error.message);
    res.status(500).json({ error: 'Failed to fetch recent scans' });
  }
};

const getScanResults = async (req, res) => {
  try {
    const { scanId } = req.params;

    const [scanRows] = await pool.query('SELECT * FROM scans WHERE id = ?', [scanId]);
    if (scanRows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const [items] = await pool.query('SELECT * FROM items WHERE scan_id = ?', [scanId]);

    const results = [];
    for (const item of items) {
      const [components] = await pool.query(
        'SELECT * FROM item_components WHERE item_id = ?',
        [item.id]
      );

      for (const comp of components) {
        const [suggestions] = await pool.query(
          'SELECT * FROM suggestions WHERE item_component_id = ?',
          [comp.id]
        );

        for (const sug of suggestions) {
          if (isDisposalSuggestion(sug)) continue;

          const [disclaimers] = await pool.query(
            'SELECT * FROM disclaimers WHERE suggestion_id = ?',
            [sug.id]
          );

          const [ratings] = await pool.query(
            'SELECT AVG(rating) as avg_rating, COUNT(*) as total_tried FROM community_ratings WHERE suggestion_id = ? AND tried_it = TRUE',
            [sug.id]
          );

          results.push({
            suggestion: {
              ...sug,
              steps: typeof sug.steps === 'string' ? JSON.parse(sug.steps) : sug.steps,
            },
            component: comp,
            item,
            disclaimer: disclaimers[0] || null,
            communityRating: ratings[0] || { avg_rating: 0, total_tried: 0 },
          });
        }
      }
    }

    res.json({ scan: scanRows[0], items, results });
  } catch (error) {
    console.error('Get scan results error:', error.message);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

const getSeasonalSuggestion = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = new Date().getMonth() + 1;

    const [profileRows] = await pool.query(
      'SELECT state FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    const state = profileRows[0]?.state;
    const suggestion = getSeasonalTip(month, state);

    res.json({ suggestion });
  } catch (error) {
    console.error('Get seasonal suggestion error:', error.message);
    res.status(500).json({ error: 'Failed to fetch seasonal suggestion' });
  }
};

const getVisionData = async (req, res) => {
  try {
    const normalizePhotoData = (value) => {
      if (!value || typeof value !== 'string') return null;
      if (value.startsWith('data:')) {
        const commaIndex = value.indexOf(',');
        return commaIndex >= 0 ? value.slice(commaIndex + 1) : null;
      }
      return value;
    };

    const photo_data = normalizePhotoData(req.file?.buffer?.toString('base64') || req.body?.photo_data);
    const photo_mime = req.file?.mimetype || req.body?.photo_mime || 'image/jpeg';

    console.log('[ScanController] vision payload', { hasBody: Boolean(req.body), bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : null, contentType: req.headers['content-type'], hasFile: Boolean(req.file), photoLength: photo_data?.length || 0, photoMime: photo_mime, rawBodyType: typeof req.body });

    if (!photo_data) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    console.log('[ScanController] vision endpoint called, analyzing image...');

    const { analyzeProductImage } = require('../services/geminiService');
    const visionData = await analyzeProductImage(photo_data, photo_mime);

    if (!visionData) {
      return res.json({
        product_name: null,
        brand: null,
        category: 'unknown',
        detected_category: 'other',
        confidence_score: 0,
        requires_manual_review: true,
        vision_failed: true,
        note: 'AI vision unavailable — enter details manually or retry with a clearer photo',
      });
    }

    res.json(visionData);
  } catch (error) {
    console.error('[ScanController] vision analysis error:', error.message);
    res.status(500).json({ error: 'Failed to analyze image', details: error.message });
  }
};

module.exports = { startScan, getRecentScans, getScanResults, getSeasonalSuggestion, getVisionData };
