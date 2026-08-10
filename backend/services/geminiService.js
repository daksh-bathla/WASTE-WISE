const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_VISION_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_WEB_SEARCH_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const getLocalVisionFallback = (mimeType) => {
  const fallback = {
    product_name: 'Scanned item',
    brand: null,
    category: 'unknown',
    primary_material: 'unknown',
    packaging_material: 'unknown',
    ingredients: [],
    expiry_date: null,
    expiry_type: 'unknown',
    quantity: '',
    risk_indicators: [],
    key_components: ['main body'],
    detected_category: 'other',
    confidence_score: 45,
    note: 'AI vision unavailable; using local fallback',
  };

  if (mimeType && mimeType.includes('image')) {
    return fallback;
  }

  return fallback;
};

const analyzeProductImage = async (imageBase64, mimeType) => {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set — returning local fallback');
    return getLocalVisionFallback(mimeType);
  }

  const prompt = `You are an expert computer vision model. Analyse this product image in high detail and extract the following information. Be as precise as possible. Read all visible text.

CRITICAL CLASSIFICATION RULES — follow these strictly:
- If the image shows an EXPIRED or CONSUMABLE product (food, dairy, cosmetics, medicine, oil, spice, beverage) inside packaging → category is about the PRODUCT, not the packaging. detected_category = "expired_product".
- If the image shows an EMPTY container/bottle/carton/wrapper with NO product inside → detected_category = "waste_packaging".
- If the image shows fruit/vegetable peels, scraps, cores, rinds, or food leftovers → detected_category = "food_peels".
- If the image shows an electronic device (phone, laptop, cable, appliance, charger, tablet, monitor) → detected_category = "electronics".
- If the image shows something that does NOT fit any of the above (stationery, pen, toy, clothing, furniture, tools, books, bags, shoes) → detected_category = "other".

IMPORTANT — Product vs Packaging separation:
- "item_name" must be the PRIMARY PRODUCT (e.g. "moisturiser", "coconut oil", "curd"), NOT the packaging.
- "primary_material" is the material of the product itself (e.g. "cream", "liquid oil", "dairy").
- "packaging_material" is the material of the container/wrapper (e.g. "plastic bottle", "glass jar", "cardboard box").
- For items in the "other" category, "primary_material" is the main material of the item (e.g. "plastic", "wood", "metal").

Return a JSON object strictly matching this schema:
{
  "product_name": "Exact name of the primary product or item (NOT the packaging)",
  "brand": "Brand name if visible, else null",
  "category": "Choose the best fit: dairy/oils/grains/fruits_veg/spices/cosmetics/beverages/packaged_food/household/electronics/packaging/peels/stationery/clothing/furniture/toys/unknown",
  "primary_material": "Material of the product itself (e.g. cream, liquid, grain, plastic, wood, metal, fabric)",
  "packaging_material": "Material of the packaging/container: glass/plastic/cardboard/metal/fabric/mixed/none",
  "ingredients": ["list", "of", "ingredients", "exactly", "as", "written", "on", "label"],
  "expiry_date": "Identify any dates. Return the expiry date in YYYY-MM-DD format, or null if not found.",
  "expiry_type": "Classify the date as: best_before, use_by, expiry_date, or unknown",
  "quantity": "Extract net weight, volume, or count (e.g. '500g', '1L', '2 pieces')",
  "risk_indicators": ["List any visible mould", "discolouration", "damage", "spoilage", "rust"],
  "key_components": ["List the distinct physical components of the item, e.g. for a pen: cap, barrel, ink cartridge, tip"],
  "detected_category": "One of: expired_product, food_peels, waste_packaging, electronics, other",
  "confidence_score": "Integer 0-100 indicating how confident you are in the detected_category classification"
}

Return ONLY the JSON object. No markdown, no explanation. Ensure it is valid JSON.`;

  try {
    const response = await axios.post(
      `${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: { response_mime_type: 'application/json' },
      },
      { timeout: 30000 }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No text returned from Gemini');

    const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    const status = error.response?.status;
    console.error(`Gemini Vision analysis error${status ? ` (Status ${status})` : ''}:`, error.message);
    
    console.log('[GeminiService] Falling back to Groq Vision API...');
    try {
      const { analyzeProductImageFallback } = require('./groqService');
      const fallbackResult = await analyzeProductImageFallback(imageBase64, mimeType, prompt);
      if (fallbackResult) {
        console.log('[GeminiService] Groq Vision fallback succeeded');
        return fallbackResult;
      }
      throw new Error('Groq fallback returned null');
    } catch (fallbackError) {
      console.error('[GeminiService] Groq Vision fallback failed:', fallbackError.message);
      return getLocalVisionFallback(mimeType);
    }
  }
};

const webSearch = async (query, maxResults = 5) => {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set — returning empty results');
    return [];
  }

  try {
    const response = await axios.post(
      `${GEMINI_WEB_SEARCH_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: `Search and summarize: ${query}. Return results with source URLs.` }] }],
        tools: [{ google_search: {} }],
      },
      { timeout: 30000 }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    const groundingMetadata = response.data.candidates?.[0]?.groundingMetadata;

    return { text, groundingMetadata };
  } catch (error) {
    const status = error.response?.status;
    const providerMessage = error.response?.data?.error?.message || error.message;
    console.error(`Gemini web search error${status ? ` ${status}` : ''}: ${providerMessage}`);

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

module.exports = { analyzeProductImage, webSearch, extractYouTubeUrl };
