const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct';

const groqFallback = async (messages, maxTokens, temperature) => {
  try {
    const { chat: groqChat } = require('./groqService');
    return await groqChat(messages, maxTokens, temperature);
  } catch (error) {
    console.error('Groq fallback error:', error.message);
    return null; // Return null instead of recursing infinitely
  }
};

const chat = async (messages, maxTokens = 4096, temperature = 0.4, model = null) => {
  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not set — returning null');
    return null;
  }

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: model || OPENROUTER_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://wastewise.app',
          'X-Title': 'WasteWise',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    return response.data.choices?.[0]?.message?.content;
  } catch (error) {
    const status = error.response?.status;
    const providerMessage = error.response?.data?.error?.message || error.message;
    console.error(`OpenRouter API error${status ? ` ${status}` : ''}: ${providerMessage}`);
    return groqFallback(messages, maxTokens, temperature);
  }
};

const decomposeComponents = async (productName, description) => {
  const prompt = `You are analysing ${productName} which is ${description}.
This item has expired/is waste. Decompose it into ALL its physical components.

CRITICAL — TWO-LAYER DECOMPOSITION:
Layer 1 (PRODUCT): The actual product itself. This MUST come first in the array.
  Examples: the cream inside the tube, the oil in the bottle, the food in the packet, the pen ink, the wood of a chair.
Layer 2 (PACKAGING): The container, wrapper, or structural housing. This MUST come after all product components.
  Examples: the plastic bottle, the cardboard box, the glass jar, the foil wrapper.

For non-packaged items (e.g. a pen, a wooden chair, a toy), decompose into the item's own physical parts.
  Examples for a pen: ink cartridge, plastic barrel, metal clip, plastic cap.
  Examples for a wooden chair: seat (wood), legs (wood), screws (metal), varnish coating.

Think carefully — a rotten apple has: flesh, peel, seeds, core.
An expired milk carton has: milk (product), cardboard body, plastic lining, foil layer, cap.
A broken phone has: screen, battery, camera module, speakers, frame, cables.

CRITICAL INSTRUCTION: Do not suggest uses that require chemically separating ingredients. Only suggest what a normal household person can physically do with this product as-is. Think in terms of the minimum physical unit — for example an expired bottle of coconut oil is one physical unit that can be used as wood polish, leather conditioner, or hair oil. An expired lemon can be split into juice, peel, and seed — these are natural physical separations. A bottle of shampoo cannot be separated into its chemical components. Always suggest at least one primary whole-product use and at least two secondary uses based on natural physical parts if applicable.

Return a JSON array of components. PRODUCT components MUST appear before PACKAGING components:
[{
  "component_name": "name",
  "component_type": "food/packaging/electronic/organic/chemical/other",
  "material": "specific material",
  "condition": "good/fair/degraded/contaminated",
  "estimated_percentage": "percentage of whole item this component represents",
  "layer": "product or packaging"
}]
Be thorough. Nothing should be left unaccounted for. Think at least 3 layers deep.
A rotten apple seed is not waste — it can grow a plant. Find every highest use.
Return ONLY the JSON array.`;

  const result = await chat([{ role: 'user', content: prompt }], 2048);
  if (!result) return null;

  try {
    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Component decomposition parsing error:', e.message);
    return null;
  }
};

const safetyAssessment = async (component, productInfo, daysPastExpiry, expiryType, riskIndicators, userMedical, weather) => {
  const prompt = `Component: ${component.component_name} from ${productInfo.productName}
Days past expiry: ${daysPastExpiry}
Expiry type: ${expiryType}
Risk indicators found: ${(riskIndicators || []).join(', ')}
User medical profile: ${userMedical?.conditions || 'none'}, medications: ${userMedical?.medications || 'none'}, allergies: ${userMedical?.allergies || 'none'}, pregnant: ${userMedical?.is_pregnant || false}, age group: ${userMedical?.age_group || 'unknown'}
User skin type: ${userMedical?.skin_type || 'unknown'}
Current weather: ${weather.temp}°C, ${weather.humidity}% humidity
Season: ${weather.season}

Assess safety for repurposing. Return JSON:
{
  "is_safe": true or false,
  "safety_level": "safe/caution/unsafe",
  "reason": "specific reason",
  "safe_for_body": true or false,
  "safe_for_animals": true or false,
  "safe_for_plants": true or false,
  "safe_for_crafts": true or false,
  "warnings": ["specific warning 1", "specific warning 2"],
  "must_not": ["absolute prohibition 1 for this user specifically"]
}

Hard rules you must always enforce:
- If mould is visible on food: safe_for_body = false, safe_for_animals = check species
- If days past expiry > 180 for dairy: safe_for_body = false
- If user is pregnant: be extra conservative on all topical applications
- If user is allergic to any ingredient present: safe_for_body = false
- Potato peel / tomato peel: safe_for_animals = false for dogs, cats
- Onion / garlic: safe_for_animals = false for dogs, cats always
- Avocado any part: safe_for_animals = false for all species — HARD BLOCK
- Precious metal extraction from electronics: never suggest — HARD BLOCK

Return ONLY the JSON object.`;

  const result = await chat([{ role: 'user', content: prompt }], 1024);
  if (!result) return null;

  try {
    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Safety assessment parsing error:', e.message);
    return null;
  }
};

const generateDisclaimer = async (title, moduleType, userProfile) => {
  const prompt = `Suggestion: ${title}
Module type: ${moduleType}
User profile: ${JSON.stringify(userProfile)}

Generate a specific, personalised disclaimer. Include:
- Who specifically should not use this (based on this user's profile)
- What to watch for and when to stop
- Whether a patch test is required
- The medical/veterinary boundary statement
- Safe quantity ceiling if relevant

Be specific to this user — not generic warnings.
If this user is pregnant, say so specifically.
If this user has a nut allergy and the step involves coconut, flag it.

Return JSON:
{
  "who_should_not_use": "text",
  "when_to_stop": "text",
  "patch_test_required": true or false,
  "medical_boundary": "text",
  "animal_safety_note": "text or null",
  "quantity_ceiling": "text or null"
}

Return ONLY the JSON object.`;

  const result = await chat([{ role: 'user', content: prompt }], 512);
  if (!result) return null;

  try {
    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Disclaimer generation parsing error:', e.message);
    return null;
  }
};

// Vision analysis using OpenRouter free vision models (fallback for Gemini/Groq vision failures)
const analyzeProductImageVision = async (imageBase64, mimeType, prompt) => {
  if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not set for vision fallback');
    return null;
  }

  const visionModels = [
    'google/gemini-2.0-flash-lite-001',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'qwen/qwen2.5-vl-72b-instruct:free',
    'google/gemma-3-27b-it:free',
    'openrouter/auto',
  ];

  for (const model of visionModels) {
    try {
      console.log(`[OpenRouterService] Trying vision model: ${model}`);
      const response = await axios.post(
        OPENROUTER_URL,
        {
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
              ],
            },
          ],
          max_tokens: 1024,
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://wastewise.app',
            'X-Title': 'WasteWise',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const text = response.data.choices?.[0]?.message?.content;
      if (!text) continue;

      let parsed = null;
      try {
        const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();
        parsed = JSON.parse(cleanedText);
      } catch (jsonErr) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (matchErr) {
            console.warn(`[OpenRouterService] Failed parsing extracted JSON: ${matchErr.message}`);
          }
        }
      }

      if (parsed) {
        console.log(`[OpenRouterService] Vision model ${model} succeeded`);
        return parsed;
      }
      throw new Error('Failed to parse response as JSON');
    } catch (error) {
      const errMsg = error.response?.data ? JSON.stringify(error.response.data).slice(0, 200) : error.message;
      console.error(`[OpenRouterService] Vision model ${model} failed:`, errMsg);
      // Continue to next model
    }
  }

  console.error('[OpenRouterService] All vision models failed');
  return null;
};

module.exports = { chat, decomposeComponents, safetyAssessment, generateDisclaimer, analyzeProductImageVision };
