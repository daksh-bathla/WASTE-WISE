const axios = require('axios');
const { analyzeProductImageMulti } = require('./visionService');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_VISION_MODEL,
  process.env.GEMINI_WEB_SEARCH_MODEL,
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
].filter(Boolean);

const uniqueModels = () => [...new Set(GEMINI_MODEL_CANDIDATES)];

const geminiHeaders = () => ({
  'Content-Type': 'application/json',
  'x-goog-api-key': GEMINI_API_KEY,
});

const generateGeminiContent = async (body, { timeout = 30000, preferredModel = null } = {}) => {
  const models = preferredModel ? [preferredModel, ...uniqueModels().filter((m) => m !== preferredModel)] : uniqueModels();
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const response = await axios.post(url, body, {
        headers: geminiHeaders(),
        timeout,
        params: { key: GEMINI_API_KEY },
      });
      console.log(`[GeminiService] Model ${model} succeeded`);
      return { response: response.data, model };
    } catch (error) {
      const status = error.response?.status;
      const providerMessage = error.response?.data?.error?.message || error.message;
      lastError = error;
      console.warn(`[GeminiService] Model ${model} failed${status ? ` (${status})` : ''}: ${providerMessage}`);
    }
  }

  throw lastError || new Error('All Gemini models failed');
};

const inferDetectedCategory = (data = {}) => {
  const category = String(data.category || '').toLowerCase();
  const packaging = String(data.packaging_material || '').toLowerCase();
  const productName = String(data.product_name || '').toLowerCase();

  if (category.includes('electronic') || /phone|laptop|charger|cable|tablet|monitor/.test(productName)) {
    return 'electronics';
  }
  if (category.includes('peel') || category.includes('scrap') || /peel|rind|shell|scrap/.test(productName)) {
    return 'food_peels';
  }
  if (category.includes('packaging') || ['glass', 'plastic', 'cardboard', 'metal', 'paper', 'fabric'].includes(packaging)) {
    return 'waste_packaging';
  }
  if (['dairy', 'oils', 'grains', 'spices', 'cosmetics', 'beverages', 'packaged_food', 'household'].some((key) => category.includes(key))) {
    return 'expired_product';
  }
  return 'other';
};

const normalizeVisionResult = (raw, mimeType) => {
  if (!raw || typeof raw !== 'object') return getLocalVisionFallback(mimeType);

  const confidence = Number(raw.confidence_score);
  const productName = String(raw.product_name || raw.item_name || '').trim();
  const normalized = {
    ...raw,
    product_name: productName || null,
    brand: raw.brand || null,
    category: raw.category || 'unknown',
    primary_material: raw.primary_material || 'unknown',
    packaging_material: raw.packaging_material || 'unknown',
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    expiry_date: raw.expiry_date || null,
    expiry_type: raw.expiry_type || 'unknown',
    quantity: raw.quantity || '',
    risk_indicators: Array.isArray(raw.risk_indicators) ? raw.risk_indicators : [],
    key_components: Array.isArray(raw.key_components) ? raw.key_components : [],
    detected_category: raw.detected_category || inferDetectedCategory(raw),
    confidence_score: Number.isFinite(confidence) ? Math.min(100, Math.max(0, confidence)) : 70,
    requires_manual_review: raw.requires_manual_review === true || raw.requires_manual_review === 'true',
    vision_failed: false,
  };

  const unusableName = !normalized.product_name
    || ['scanned item', 'unknown', 'item'].includes(String(normalized.product_name).toLowerCase());

  if (unusableName) {
    normalized.requires_manual_review = true;
    normalized.confidence_score = Math.min(normalized.confidence_score, 55);
  } else if (normalized.confidence_score >= 55) {
    normalized.requires_manual_review = false;
  }

  return normalized;
};

const getLocalVisionFallback = (mimeType) => ({
  product_name: null,
  brand: null,
  category: 'unknown',
  primary_material: 'unknown',
  packaging_material: 'unknown',
  ingredients: [],
  expiry_date: null,
  expiry_type: 'unknown',
  quantity: '',
  risk_indicators: [],
  key_components: [],
  detected_category: 'other',
  confidence_score: 0,
  requires_manual_review: true,
  vision_failed: true,
  note: 'AI vision unavailable — enter details manually or retry with a clearer photo',
});

const parseGeminiJson = (text, mimeType, normalizer) => {
  if (!text) throw new Error('No text returned from Gemini');

  try {
    const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();
    return normalizer(JSON.parse(cleanedText));
  } catch (jsonErr) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return normalizer(JSON.parse(jsonMatch[0]));
      } catch (matchErr) {
        console.warn(`[GeminiService] Failed parsing extracted JSON: ${matchErr.message}`);
      }
    }
    throw jsonErr;
  }
};

const analyzeProductImage = async (imageBase64, mimeType) => {
  if (!GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY) {
    console.warn('No vision API keys set — returning local fallback');
    return getLocalVisionFallback(mimeType);
  }

  try {
    const raw = await analyzeProductImageMulti(imageBase64, mimeType);
    if (raw) {
      return normalizeVisionResult(raw, mimeType);
    }
  } catch (error) {
    console.error('[GeminiService] Multi-provider vision error:', error.message);
  }

  return getLocalVisionFallback(mimeType);
};

const webSearch = async (query, maxResults = 5) => {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set — returning empty results');
    return [];
  }

  try {
    const { response } = await generateGeminiContent({
      contents: [{ parts: [{ text: `Search and summarize: ${query}. Return results with source URLs.` }] }],
      tools: [{ google_search: {} }],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return { text, groundingMetadata };
  } catch (error) {
    const providerMessage = error.response?.data?.error?.message || error.message;
    console.error(`Gemini web search error: ${providerMessage}`);

    try {
      const { search } = require('./tavilyService');
      const results = await search(query, { search_depth: 'basic', max_results: maxResults });
      return {
        text: results.map((result) => `${result.title}: ${result.content || result.url}`).join('\n'),
        groundingMetadata: { source: 'tavily', results },
      };
    } catch (fallbackError) {
      console.error('Tavily fallback search error:', fallbackError.message);
      return { text: '', groundingMetadata: null };
    }
  }
};

const extractYouTubeUrl = async (query) => {
  try {
    const result = await webSearch(`${query} tutorial site:youtube.com`);
    const text = result.text || '';
    const ytMatch = text.match(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/);
    if (ytMatch) return ytMatch[0];

    const shortMatch = text.match(/https?:\/\/youtu\.be\/[\w-]+/);
    return shortMatch ? shortMatch[0] : null;
  } catch (error) {
    console.error('YouTube URL extraction error:', error.message);
    return null;
  }
};

module.exports = { analyzeProductImage, webSearch, extractYouTubeUrl, generateGeminiContent };
