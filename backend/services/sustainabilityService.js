const axios = require('axios');
const { chat: openRouterChat } = require('./openrouterService');
const { chat: groqChat } = require('./groqService');
const { getSeason } = require('../utils/seasonHelper');

const noCarbonFinding = () => ({
  has_issue: false,
  alternative_product: null,
});

const noRoutingFinding = (applicable = true) => ({
  applicable,
  has_issue: false,
  local_alternative: null,
});

const noResourceFinding = () => ({
  has_issue: false,
  resource_concerns: [],
  sustainable_alternative: null,
});

const noAlertFinding = () => ({
  has_alert: false,
  alert_level: null,
  alert_type: null,
  alert_title: null,
  alert_description: null,
  recommended_action: null,
  expires_when: null,
});

const formatValue = (value, fallback = 'unknown') => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const numberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeProductData = (productData = {}) => ({
  productName: formatValue(
    productData.product_name || productData.productName || productData.name || productData.itemName,
    'Unknown product'
  ),
  category: formatValue(productData.category || productData.input_type || productData.type, 'unknown category'),
  ingredients: formatValue(productData.ingredients, 'not listed'),
  packaging: formatValue(
    productData.packaging_material ||
      productData.packagingMaterial ||
      productData.packaging_materials ||
      productData.packaging,
    'not listed'
  ),
  quantity: formatValue(productData.quantity || productData.size || productData.amount, 'not listed'),
  brand: formatValue(productData.brand, ''),
});

const normalizeLocation = (location = {}) => ({
  city: formatValue(location.city, 'Delhi'),
  state: formatValue(location.state || location.region, 'Delhi'),
  lat: numberOrNull(location.lat ?? location.latitude),
  lng: numberOrNull(location.lng ?? location.longitude),
});

const currentSeason = (weather = {}) => weather.season || getSeason(new Date().getMonth() + 1);

const extractJsonObject = (text) => {
  if (!text || typeof text !== 'string') return null;

  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (error) {
      console.error('Sustainability JSON parse error:', error.message);
      return null;
    }
  }
};

const strictJsonMessages = (prompt) => [
  {
    role: 'system',
    content:
      'Return only valid JSON matching the requested schema. Be conservative: if the product is not clearly worse or current conditions do not create a specific measurable risk, return the no-issue state exactly.',
  },
  { role: 'user', content: prompt },
];

const estimateOrigin = (product) => {
  const brand = product.brand.toLowerCase();
  const productText = `${product.productName} ${product.category}`.toLowerCase();

  if (!brand) return 'Unknown; infer from product category, ingredients, and likely Indian market availability';

  const indianBrands = [
    'amul',
    'mother dairy',
    'parle',
    'britannia',
    'dabur',
    'patanjali',
    'tata',
    'itc',
    'haldiram',
    'godrej',
    'marico',
    'emami',
    'mtr',
    'bikaji',
  ];

  const internationalBrands = [
    'apple',
    'samsung',
    'sony',
    'lg',
    'xiaomi',
    'nestle',
    'unilever',
    'pepsico',
    'coca-cola',
    'loreal',
  ];

  if (indianBrands.some((name) => brand.includes(name))) return `${product.brand}; likely manufactured in India`;
  if (internationalBrands.some((name) => brand.includes(name)) || productText.includes('imported')) {
    return `${product.brand}; possibly imported or made through a multinational supply chain`;
  }

  return `${product.brand}; infer likely manufacturing region from the brand and product category`;
};

const likelyNeedsRoutingAnalysis = (productData = {}) => {
  const product = normalizeProductData(productData);
  const text = `${product.productName} ${product.category} ${product.packaging}`.toLowerCase();

  const clearlyLocalOrFresh = [
    'homegrown',
    'homemade',
    'locally sourced',
    'local vegetable',
    'local fruit',
    'fresh produce',
    'food peel',
    'food peels',
    'scrap',
    'scraps',
    'banana peel',
    'potato peel',
    'apple peel',
    'mango peel',
    'watermelon rind',
    'coconut shell',
  ];

  const supplyChainSignals = [
    'packaged',
    'packaging',
    'packet',
    'carton',
    'bottle',
    'electronics',
    'electronic',
    'device',
    'appliance',
    'cosmetic',
    'beverage',
    'imported',
    'e-commerce',
    'snack',
    'processed',
  ];

  const hasSupplyChainSignal = supplyChainSignals.some((term) => text.includes(term));
  const isClearlyLocalOrFresh = clearlyLocalOrFresh.some((term) => text.includes(term));

  return hasSupplyChainSignal || !isClearlyLocalOrFresh;
};

const weatherDescriptionForCode = (code) => {
  const weatherCode = Number(code);
  if (!Number.isFinite(weatherCode)) return 'unknown';
  if (weatherCode <= 1) return 'clear';
  if (weatherCode <= 3) return 'partly cloudy';
  if (weatherCode <= 48) return 'foggy';
  if (weatherCode <= 67) return 'rain';
  if (weatherCode <= 82) return 'showers';
  if (weatherCode <= 99) return 'stormy';
  return 'unknown';
};

const fetchAirQuality = async (lat, lng) => {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return null;
  }

  try {
    const response = await axios.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
      params: {
        latitude: lat,
        longitude: lng,
        current: 'pm2_5,pm10,european_aqi',
      },
      timeout: 10000,
    });

    const current = response.data?.current || {};
    return {
      aqi: numberOrNull(current.european_aqi),
      pm25: numberOrNull(current.pm2_5),
      pm10: numberOrNull(current.pm10),
      source: 'open-meteo',
    };
  } catch (error) {
    console.error('Open-Meteo air quality fetch error:', error.message);
    return null;
  }
};

const analyseCarbonFootprint = async (productData, location) => {
  const product = normalizeProductData(productData);
  const loc = normalizeLocation(location);

  const prompt = `Product: ${product.productName}
Category: ${product.category}
Packaging: ${product.packaging}
Ingredients: ${product.ingredients}
Quantity: ${product.quantity}
Manufacturing likely origin: ${estimateOrigin(product)}
User location: ${loc.city}, ${loc.state}

Calculate the estimated lifecycle carbon footprint of this product in grams of CO2 equivalent (gCO2e). Consider: raw material extraction, manufacturing, packaging production, transport to India if imported, local distribution, and end-of-life disposal.

Then compare this against the average gCO2e for this product category in India.

Return a JSON object:
{
  "has_issue": true or false,
  "estimated_gco2e": number,
  "category_average_gco2e": number,
  "percentage_above_average": number or null,
  "footprint_rating": "low" or "medium" or "high" or "very_high",
  "primary_emission_source": "packaging" or "manufacturing" or "transport" or "ingredients",
  "specific_reason": "one sentence explaining exactly why this product has a higher footprint - be specific, name the ingredient or material",
  "alternative_product": {
    "name": "specific alternative product name",
    "estimated_gco2e": number,
    "co2_saved_percentage": number,
    "why_better": "specific reason - name what it avoids",
    "where_to_find": "general guidance on where this exists in India"
  } or null
}

CRITICAL RULE: Set has_issue to false if the product's footprint is within 20% of or below the category average. If has_issue is false, set alternative_product to null. Only recommend an alternative if this specific product is genuinely, measurably worse than typical alternatives in its category. If it is already a low-footprint product, return has_issue: false and nothing else matters.`;

  try {
    const response = await openRouterChat(strictJsonMessages(prompt), 1200, 0.15);
    const parsed = extractJsonObject(response);
    if (!parsed || parsed.has_issue !== true) return noCarbonFinding();

    const estimated = numberOrNull(parsed.estimated_gco2e);
    const average = numberOrNull(parsed.category_average_gco2e);
    if (estimated !== null && average !== null && estimated <= average * 1.2) {
      return noCarbonFinding();
    }

    return {
      ...parsed,
      has_issue: true,
      estimated_gco2e: estimated,
      category_average_gco2e: average,
      percentage_above_average: numberOrNull(parsed.percentage_above_average),
      alternative_product: parsed.alternative_product || null,
    };
  } catch (error) {
    console.error('Carbon footprint analysis error:', error.message);
    return noCarbonFinding();
  }
};

const analyseRouting = async (productData, location) => {
  if (!likelyNeedsRoutingAnalysis(productData)) {
    return noRoutingFinding(false);
  }

  const product = normalizeProductData(productData);
  const loc = normalizeLocation(location);

  const prompt = `Product: ${product.productName}
Category: ${product.category}
Estimated origin: ${estimateOrigin(product)}
User location: ${loc.city}, ${loc.state}, India

Analyse the likely delivery and distribution route for this product reaching the user.

Estimate:
1. Transport distance (manufacturing to Indian port or distribution centre, then to user city)
2. Likely transport modes used (sea freight, air freight, road, rail)
3. Estimated transport emissions in gCO2e per unit
4. Whether a more locally sourced or regionally produced equivalent exists in India

Return JSON:
{
  "applicable": true,
  "has_issue": true or false,
  "estimated_transport_km": number,
  "primary_transport_mode": "sea" or "air" or "road" or "rail" or "mixed",
  "transport_emissions_gco2e": number,
  "is_imported": true or false,
  "issue_description": "specific sentence about why this routing is inefficient - name the route or mode",
  "local_alternative": {
    "description": "specific description of what a locally produced equivalent would be",
    "estimated_emission_reduction_percentage": number,
    "indian_brand_examples": ["example1", "example2"] or []
  } or null
}

CRITICAL RULE: Set has_issue to false if the product is manufactured in India, or if its transport emissions are below 50gCO2e per unit, or if no viable locally produced alternative exists. Only flag genuine routing inefficiency. Do not flag products that are already reasonably local or where no practical alternative exists for the user.`;

  try {
    const response = await groqChat(strictJsonMessages(prompt), 1200, 0.15);
    const parsed = extractJsonObject(response);
    if (!parsed || parsed.applicable === false) return noRoutingFinding(false);
    if (parsed.has_issue !== true) return noRoutingFinding(true);

    const transportEmissions = numberOrNull(parsed.transport_emissions_gco2e);
    if (parsed.is_imported === false || (transportEmissions !== null && transportEmissions < 50) || !parsed.local_alternative) {
      return noRoutingFinding(true);
    }

    return {
      ...parsed,
      applicable: true,
      has_issue: true,
      estimated_transport_km: numberOrNull(parsed.estimated_transport_km),
      transport_emissions_gco2e: transportEmissions,
      local_alternative: parsed.local_alternative,
    };
  } catch (error) {
    console.error('Routing analysis error:', error.message);
    return noRoutingFinding(true);
  }
};

const analyseResources = async (productData, location, weather = {}) => {
  const product = normalizeProductData(productData);
  const loc = normalizeLocation(location);
  const season = currentSeason(weather);

  const prompt = `Product: ${product.productName}
Category: ${product.category}
Ingredients: ${product.ingredients}
Quantity: ${product.quantity}
User location: ${loc.city}, ${loc.state}
Current season in India: ${season}

Evaluate whether this product's production is resource-intensive beyond normal for its category. Focus on:

1. Water footprint - does it use significantly more water than alternatives in this category?
2. Land use - does it require deforestation, monoculture farming, or excessive agricultural land?
3. Energy intensity - is it an energy-intensive product where lower-energy alternatives exist?
4. Seasonal appropriateness - is this product being produced or consumed out of its natural season, requiring artificial resources?

Return JSON:
{
  "has_issue": true or false,
  "resource_concerns": [
    {
      "resource_type": "water" or "land" or "energy" or "seasonal",
      "severity": "moderate" or "high",
      "specific_problem": "one sentence with the specific issue - name the ingredient or process causing it",
      "quantified_impact": "e.g. 15,000 litres of water per kg, or 3x more energy than alternatives"
    }
  ],
  "sustainable_alternative": {
    "product_description": "what the alternative is",
    "resource_saving": "specific percentage or quantity saved",
    "why_better": "specific reason naming what resource is saved and how much"
  } or null
}

CRITICAL RULE: Only set has_issue to true if at least one resource concern is genuinely severe relative to the product category. Common everyday products used in normal quantities should not be flagged. Do not flag products that are already resource-efficient for their category. The resource_concerns array must be empty and has_issue must be false for products with no genuine resource problem.`;

  try {
    const response = await openRouterChat(strictJsonMessages(prompt), 1200, 0.15);
    const parsed = extractJsonObject(response);
    const concerns = Array.isArray(parsed?.resource_concerns) ? parsed.resource_concerns : [];
    if (!parsed || parsed.has_issue !== true || concerns.length === 0) return noResourceFinding();

    return {
      ...parsed,
      has_issue: true,
      resource_concerns: concerns,
      sustainable_alternative: parsed.sustainable_alternative || null,
    };
  } catch (error) {
    console.error('Resource analysis error:', error.message);
    return noResourceFinding();
  }
};

const analyseEnvironmentalAlerts = async (productData, location, weather = {}, airQuality = null) => {
  if (!airQuality || airQuality.aqi === null || airQuality.aqi === undefined) {
    return noAlertFinding();
  }

  const product = normalizeProductData(productData);
  const loc = normalizeLocation(location);
  const temp = numberOrNull(weather.temp ?? weather.temperature_2m);
  const humidity = numberOrNull(weather.humidity ?? weather.relative_humidity_2m);
  const season = currentSeason(weather);
  const weatherDescription = weather.weather_description || weather.description || weatherDescriptionForCode(weather.weatherCode ?? weather.weather_code);

  const prompt = `Product: ${product.productName}
Category: ${product.category}
Ingredients: ${product.ingredients}
Packaging material: ${product.packaging}
User location: ${loc.city}, ${loc.state}
Current temperature: ${temp ?? 'unknown'}°C
Current humidity: ${humidity ?? 'unknown'}%
Current AQI: ${airQuality.aqi}
PM2.5: ${airQuality.pm25 ?? 'unknown'} µg/m³
PM10: ${airQuality.pm10 ?? 'unknown'} µg/m³
Current season: ${season}
Current weather: ${weatherDescription}

Determine whether current environmental conditions create any specific risk related to using, storing, or disposing of this product right now.

Consider:
- High AQI: should the user avoid activities that generate more particulate matter (burning, spraying aerosols, outdoor use of chemicals)?
- High temperature + humidity: does this affect the safety or efficacy of this product (accelerates spoilage, makes certain chemicals more volatile)?
- Monsoon season: does this change disposal safety (chemicals washing into water bodies, mould risk on organic products)?
- Winter inversion: does indoor use of this product risk accumulating volatile compounds?

Return JSON:
{
  "has_alert": true or false,
  "alert_level": "advisory" or "caution" or "warning" or null,
  "alert_type": "air_quality" or "temperature" or "seasonal" or "disposal" or null,
  "alert_title": "short title for the alert" or null,
  "alert_description": "specific, actionable description of the risk and what to do - reference the actual AQI number or temperature, do not be vague" or null,
  "recommended_action": "specific action the user should take right now" or null,
  "expires_when": "when this alert is no longer relevant - e.g. when AQI drops below 100, or after monsoon season" or null
}

CRITICAL RULE: Set has_alert to false if current conditions present no specific risk for this product. Most products under normal conditions should return has_alert: false. Only surface a genuine, specific alert when there is a real and measurable reason to act differently because of current conditions. Never generate generic weather warnings.`;

  try {
    const response = await groqChat(strictJsonMessages(prompt), 1000, 0.15);
    const parsed = extractJsonObject(response);
    if (!parsed || parsed.has_alert !== true) return noAlertFinding();
    if (!parsed.alert_title || !parsed.alert_description || !parsed.recommended_action) return noAlertFinding();

    return {
      ...parsed,
      has_alert: true,
      alert_level: parsed.alert_level || 'advisory',
      alert_type: parsed.alert_type || 'air_quality',
    };
  } catch (error) {
    console.error('Environmental alert analysis error:', error.message);
    return noAlertFinding();
  }
};

module.exports = {
  analyseCarbonFootprint,
  analyseRouting,
  analyseResources,
  analyseEnvironmentalAlerts,
  fetchAirQuality,
};
