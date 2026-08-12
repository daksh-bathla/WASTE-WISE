const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const STATIC_GEMINI_MODELS = [
  process.env.GEMINI_VISION_MODEL,
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
].filter(Boolean);

const OPENROUTER_VISION_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.0-flash-001',
];

const GROQ_VISION_MODELS = [
  process.env.GROQ_VISION_MODEL,
  'llama-3.2-11b-vision-preview',
].filter(Boolean);

let cachedGeminiModels = null;

const VISION_PROMPT = `You are an expert product-image analyst. Analyse this image and return ONLY valid JSON (no markdown).

Rules:
- Use only visible evidence. Do not invent labels or dates.
- product_name = the main item (NOT packaging alone unless empty container).
- detected_category = one of: expired_product, food_peels, waste_packaging, electronics, other
- confidence_score = integer 0-100
- requires_manual_review = true only if unclear

JSON schema:
{
  "product_name": "string",
  "brand": "string or null",
  "category": "dairy/oils/grains/fruits_veg/spices/cosmetics/beverages/packaged_food/household/electronics/packaging/peels/unknown",
  "primary_material": "string",
  "packaging_material": "string",
  "ingredients": [],
  "expiry_date": "YYYY-MM-DD or null",
  "expiry_type": "best_before/use_by/expiry_date/unknown",
  "quantity": "string",
  "risk_indicators": [],
  "key_components": [],
  "detected_category": "expired_product|food_peels|waste_packaging|electronics|other",
  "confidence_score": 0,
  "requires_manual_review": false
}`;

const parseVisionJson = (text) => {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const isBadName = (name) => {
  const value = String(name || '').trim().toLowerCase();
  return !value || ['unknown', 'scanned item', 'n/a', 'none', 'item'].includes(value);
};

const salvageProductName = (parsed = {}) => {
  const direct = String(parsed.product_name || parsed.item_name || '').trim();
  if (!isBadName(direct)) return direct;

  const brand = String(parsed.brand || '').trim();
  const category = String(parsed.category || '').replace(/_/g, ' ').trim();
  const component = Array.isArray(parsed.key_components) ? String(parsed.key_components[0] || '').trim() : '';

  if (brand && category && category.toLowerCase() !== 'unknown') return `${brand} ${category}`.trim();
  if (component && !isBadName(component)) return component;
  if (category && category.toLowerCase() !== 'unknown') return category;
  return null;
};

const hasVisionSignal = (parsed = {}) => {
  if (salvageProductName(parsed)) return true;
  if (parsed.brand) return true;
  if (parsed.packaging_material && String(parsed.packaging_material).toLowerCase() !== 'unknown') return true;
  if (Array.isArray(parsed.ingredients) && parsed.ingredients.length) return true;

  const category = String(parsed.detected_category || parsed.category || '').toLowerCase();
  if (/\b(phone|smartphone|mobile|laptop|tablet|electronic|charger|cable)\b/.test(category)) {
    parsed.detected_category = 'electronics';
  }
  if (Array.isArray(parsed.key_components)) {
    const componentText = parsed.key_components.join(' ').toLowerCase();
    if (/\b(phone|smartphone|mobile|laptop|tablet|charger|headphone|earphone|speaker|monitor|tv)\b/.test(componentText)) {
      parsed.detected_category = 'electronics';
      if (isBadName(parsed.product_name)) {
        parsed.product_name = parsed.key_components.find((part) => !isBadName(part)) || parsed.product_name;
      }
      return true;
    }
  }

  const finalCategory = String(parsed.detected_category || parsed.category || '').toLowerCase();
  return Boolean(finalCategory) && !['unknown', 'other'].includes(finalCategory);
};

const acceptVisionResult = (parsed) => {
  if (!parsed || typeof parsed !== 'object' || !hasVisionSignal(parsed)) return null;
  const product_name = salvageProductName(parsed);
  return {
    ...parsed,
    product_name: product_name || parsed.product_name || null,
    requires_manual_review: parsed.requires_manual_review === true || isBadName(product_name),
  };
};

const listGeminiVisionModels = async () => {
  if (cachedGeminiModels) return cachedGeminiModels;
  if (!GEMINI_API_KEY) return [...new Set(STATIC_GEMINI_MODELS)];

  try {
    const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': GEMINI_API_KEY },
      params: { key: GEMINI_API_KEY },
      timeout: 15000,
    });
    const models = (response.data?.models || [])
      .filter((model) => (model.supportedGenerationMethods || []).includes('generateContent'))
      .map((model) => String(model.name || '').replace(/^models\//, ''))
      .filter((name) => /gemini.*flash/i.test(name) && !/tts|audio|image-generation|embedding|exp/i.test(name));

    cachedGeminiModels = models.length ? models : [...new Set(STATIC_GEMINI_MODELS)];
    return cachedGeminiModels;
  } catch (error) {
    console.warn('[VisionService] Could not list Gemini models:', error.response?.data?.error?.message || error.message);
    cachedGeminiModels = [...new Set(STATIC_GEMINI_MODELS)];
    return cachedGeminiModels;
  }
};

const callGeminiVision = async (model, imageBase64, mimeType, prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await axios.post(url, {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 1200,
    },
  }, {
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    params: { key: GEMINI_API_KEY },
    timeout: 45000,
  });

  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
};

const tryGeminiVision = async (imageBase64, mimeType, prompt) => {
  if (!GEMINI_API_KEY) return null;

  const models = await listGeminiVisionModels();
  for (const model of models) {
    try {
      const text = await callGeminiVision(model, imageBase64, mimeType, prompt);
      const accepted = acceptVisionResult(parseVisionJson(text));
      if (accepted) {
        console.log(`[VisionService] Gemini ${model} succeeded`);
        return accepted;
      }
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.warn(`[VisionService] Gemini ${model} failed: ${msg}`);
    }
  }
  return null;
};

const tryOpenRouterVision = async (imageBase64, mimeType, prompt) => {
  if (!OPENROUTER_API_KEY) return null;

  for (const model of OPENROUTER_VISION_MODELS) {
    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        }],
        max_tokens: 1200,
        temperature: 0.1,
      }, {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://wastewise.app',
          'X-Title': 'WasteWise',
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      });

      const accepted = acceptVisionResult(parseVisionJson(response.data?.choices?.[0]?.message?.content));
      if (accepted) {
        console.log(`[VisionService] OpenRouter ${model} succeeded`);
        return accepted;
      }
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.warn(`[VisionService] OpenRouter ${model} failed: ${msg}`);
    }
  }
  return null;
};

const tryGroqVision = async (imageBase64, mimeType, prompt) => {
  if (!GROQ_API_KEY) return null;

  for (const model of GROQ_VISION_MODELS) {
    try {
      const response = await axios.post(GROQ_URL, {
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        }],
        max_tokens: 1200,
        temperature: 0.1,
      }, {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      });

      const accepted = acceptVisionResult(parseVisionJson(response.data?.choices?.[0]?.message?.content));
      if (accepted) {
        console.log(`[VisionService] Groq ${model} succeeded`);
        return accepted;
      }
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.warn(`[VisionService] Groq ${model} failed: ${msg}`);
    }
  }
  return null;
};

const analyzeProductImageMulti = async (imageBase64, mimeType) => {
  const prompt = VISION_PROMPT;

  // Direct Gemini first — most reliable when key is configured.
  const geminiResult = await tryGeminiVision(imageBase64, mimeType, prompt);
  if (geminiResult) return geminiResult;

  const openRouterResult = await tryOpenRouterVision(imageBase64, mimeType, prompt);
  if (openRouterResult) return openRouterResult;

  const groqResult = await tryGroqVision(imageBase64, mimeType, prompt);
  if (groqResult) return groqResult;

  return null;
};

module.exports = {
  analyzeProductImageMulti,
  parseVisionJson,
  acceptVisionResult,
  listGeminiVisionModels,
};
