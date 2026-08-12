const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const pool = require('../config/db');
const { getWeather } = require('../utils/weather');
const {
  analyseCarbonFootprint,
  analyseRouting,
  analyseResources,
  analyseEnvironmentalAlerts,
  fetchAirQuality,
} = require('../services/sustainabilityService');

const router = express.Router();

const numberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveLocation = async (req, incomingLocation = {}) => {
  const location = {
    city: incomingLocation.city || null,
    state: incomingLocation.state || incomingLocation.region || null,
    lat: numberOrNull(incomingLocation.lat ?? incomingLocation.latitude),
    lng: numberOrNull(incomingLocation.lng ?? incomingLocation.longitude),
  };

  if (req.user?.id && (!location.city || !location.state || location.lat === null || location.lng === null)) {
    try {
      const [rows] = await pool.query('SELECT city, state, lat, lng FROM user_profiles WHERE user_id = ?', [req.user.id]);
      const profile = rows[0] || {};
      location.city = location.city || profile.city || null;
      location.state = location.state || profile.state || null;
      location.lat = location.lat ?? numberOrNull(profile.lat);
      location.lng = location.lng ?? numberOrNull(profile.lng);
    } catch (error) {
      console.error('Sustainability profile lookup error:', error.message);
    }
  }

  return {
    city: location.city || 'Delhi',
    state: location.state || 'Delhi',
    lat: location.lat ?? 28.6139,
    lng: location.lng ?? 77.209,
  };
};

router.post('/analyse', authMiddleware, async (req, res) => {
  try {
    const { productData, weather, airQuality } = req.body;
    const productName = productData?.product_name || productData?.productName || productData?.name || productData?.itemName;
    if (!productName || !String(productName).trim()) {
      return res.json({
        has_any_findings: false,
        findings: {},
      });
    }

    const location = await resolveLocation(req, req.body.location || {});
    const resolvedWeather = weather || (await getWeather(location.lat, location.lng));
    const aqData = airQuality || (await fetchAirQuality(location.lat, location.lng));

    const [carbon, routing, resources, alerts] = await Promise.all([
      analyseCarbonFootprint(productData || {}, location),
      analyseRouting(productData || {}, location),
      analyseResources(productData || {}, location, resolvedWeather),
      analyseEnvironmentalAlerts(productData || {}, location, resolvedWeather, aqData),
    ]);

    const results = {};
    if (carbon.has_issue) results.carbon = carbon;
    if (routing.applicable && routing.has_issue) results.routing = routing;
    if (resources.has_issue) results.resources = resources;
    if (alerts.has_alert) results.alerts = alerts;

    res.json({
      has_any_findings: Object.keys(results).length > 0,
      findings: results,
    });
  } catch (error) {
    console.error('Sustainability analysis route error:', error.message);
    res.status(500).json({ error: 'Failed to analyse sustainability context' });
  }
});

module.exports = router;
