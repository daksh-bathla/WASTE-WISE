const { searchTraditionalRemedy, searchModernUses, searchDIYTutorial, search } = require('./tavilyService');
const { webSearch, extractYouTubeUrl } = require('./geminiService');
const { animalFeedAnalysis } = require('./groqService');
const { chat } = require('./openrouterService');
const { queryCollection } = require('./chromaService');
const { getUpcomingFestival } = require('../utils/festivalCalendar');
const {
  fastSuggestionGenerator,
  fastDisclaimerGenerator,
} = require('./fastTrackService');
const { validateRepurposingSuggestion, isSpecificEnough } = require('./suggestionValidation');
const { getDIYIdeaThemes } = require('./diyIdeaLibrary');
const { findSimilarDatasetEntries, formatDatasetExamples, normalizeWasteCategory, getDatasetSuggestions } = require('./datasetPatternService');

// Pulls verified reuse examples from waste_reuse_dataset.json for any component
const getDatasetContext = (component) => {
  try {
    const matches = findSimilarDatasetEntries(component, component.component_type || 'expired_product', 3);
    return matches.length ? formatDatasetExamples(matches) : 'No close dataset patterns found.';
  } catch (e) {
    return 'No close dataset patterns found.';
  }
};

const runTraditionalModule = async (component, goals, userProfile, weather, pool) => {
  const suggestions = [];

  for (const goal of goals) {
    if (!['body_skin', 'health', 'diy'].includes(goal)) continue;

    try {
      const tavilyResults = await searchTraditionalRemedy(
        component.component_name,
        goal,
        userProfile.state,
        userProfile.language || 'en'
      );

      const geminiResults = await webSearch(
        `traditional Indian ${userProfile.state || ''} remedy ${component.component_name} ${goal} nuske`
      );

      const synthesisPrompt = `You found these sources about traditional use of ${component.component_name} for ${goal}:
Tavily results: ${JSON.stringify(tavilyResults.slice(0, 3))}
Gemini results: ${geminiResults?.text || 'No results'}

The user is in ${userProfile.city || 'India'}, ${userProfile.state || ''}, follows ${userProfile.culture || 'Indian'} traditions, and speaks ${userProfile.language || 'English'}.
Their skin is ${userProfile.skin_type || 'unknown'}. Weather is ${weather.temp}°C, ${weather.season}.

Synthesise the best traditional or DIY hack. Apply your own intelligence —
go beyond basic recycling. Suggest realistic, actionable recipes that combine this item with common household staples (e.g. baking soda, vinegar, honey, turmeric, coconut oil, sugar, or jaggery).
Look for viral Instagram/YouTube hacks and traditional Indian remedies (Dadi Maa ke Nuske).

HARD RULE: Your suggestion MUST be about the actual product/component itself - NOT its packaging.
NEVER recommend ingesting, applying to skin or hair, feeding to animals, or using as a cleaner merely because an expired product is food-shaped, powdered, liquid, or paste-like.
If the item has no verified, material-specific reuse route, return a responsible disposal or sorting plan instead of inventing a recipe.
NEVER suggest uses for the plastic tub or glass jar unless the component is explicitly packaging.

Return JSON:
{
  "title": "suggestion title",
  "tradition": "Ayurvedic/Siddha/Folk/Regional",
  "region_origin": "region this practice comes from",
  "steps": ["step 1", "step 2", "step 3"],
  "source_url": "most credible source URL from the search results",
  "source_name": "name of the source",
  "credibility_tier": "AYUSH/Research/Traditional/Community",
  "why_now": "why this suggestion specifically suits this weather/season",
  "personalisation": "why this is specifically good for this user's profile"
}

Return ONLY the JSON object.`;

      const result = await chat([{ role: 'user', content: synthesisPrompt }], 1536);
      if (!result) continue;

      const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      suggestions.push({
        item_component_id: component.id,
        module_type: 'traditional',
        title: parsed.title,
        steps: parsed.steps,
        source_url: parsed.source_url,
        source_credibility: parsed.credibility_tier,
        region_tag: parsed.region_origin,
        personalisation_note: parsed.personalisation,
        video_url: null,
        tradition: parsed.tradition,
        why_now: parsed.why_now,
      });
    } catch (error) {
      console.error('Traditional module error:', error.message);
    }
  }

  return suggestions;
};

const runAnimalFeedModule = async (component, animals, weather, pool) => {
  const suggestions = [];

  if (!animals || animals.length === 0) return suggestions;

  for (const animal of animals) {
    try {
      const chromaResults = await queryCollection(
        'animal_feed_safety',
        [`${component.component_name} safety for ${animal.species} feed`],
        5
      );

      const chromaDocs = chromaResults.documents?.[0]?.join('\n') || 'No specific documents found.';

      const result = await animalFeedAnalysis(
        component,
        animal.species,
        animal.weight || 50,
        weather.season,
        weather.temp,
        chromaDocs
      );

      if (!result) continue;

      suggestions.push({
        item_component_id: component.id,
        module_type: 'animal_feed',
        title: `Feed ${component.component_name} to ${animal.species}`,
        steps: [
          `Preparation: ${result.preparation || 'Wash thoroughly and cut into small pieces'}`,
          `Safe amount: ${result.total_safe_amount || 'Start with small quantities'}`,
          `Frequency: ${result.frequency || 'Once daily'}`,
          result.seasonal_note ? `Seasonal note: ${result.seasonal_note}` : '',
        ].filter(Boolean),
        source_url: result.source || null,
        source_credibility: 'Research',
        region_tag: null,
        personalisation_note: `Calculated for ${animal.species} weighing approximately ${animal.weight || 50}kg in ${weather.season} conditions.`,
        video_url: null,
        safe_species: result.safe_species,
        unsafe_species: result.unsafe_species,
        is_safe_to_feed: result.is_safe_to_feed,
      });
    } catch (error) {
      console.error('Animal feed module error:', error.message);
    }
  }

  return suggestions;
};

const runModernModule = async (component, userProfile, weather, pool) => {
  const suggestions = [];

  try {
    const tavilyResults = await searchModernUses(
      component.component_name,
      component.component_type,
      `${userProfile.city || ''}, ${userProfile.state || ''}`,
      weather
    );

    const synthesisPrompt = `Item component: ${component.component_name} (${component.material})
Component layer: ${component.layer || 'product'}
Condition: ${component.condition_status || 'unknown'}
Current weather: ${weather.temp}°C, ${weather.humidity}% humidity, ${weather.season}
User location: ${userProfile.city || 'India'}, ${userProfile.state || ''} — ${userProfile.is_rural ? 'Rural' : 'Urban'}

Think like a materials scientist and zero-waste expert combined.
What stable compounds remain in this expired/waste component?
What are the most creative yet practical modern uses?

HARD RULE: Your suggestions MUST focus on THIS specific component.
- If this is a "product" layer component (e.g. the cream, the oil, the food), suggest uses for THAT substance.
- If this is a "packaging" layer component (e.g. the bottle, the jar), suggest uses for the container.
- NEVER suggest packaging reuses when the component is a product, and vice versa.

Go beyond the obvious. Think several layers deep.
Consider the user's exact context:
- Urban users need city-appropriate suggestions (apartment friendly)
- Rural users have more space and access to farms/animals
- Hot weather changes what is appropriate vs cold weather

Return array of up to 3 suggestions, each:
{
  "title": "specific suggestion title",
  "category": "household/garden/personal_care/craft/other",
  "materials_needed": ["list besides the item itself"],
  "steps": ["step 1", "step 2"],
  "why_it_works": "brief chemistry or material science explanation",
  "best_for": "urban or rural or both",
  "season_note": "any seasonal consideration"
}

Return ONLY the JSON array.`;

    const result = await chat([{ role: 'user', content: synthesisPrompt }], 2048);
    if (!result) return suggestions;

    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    for (const item of Array.isArray(parsed) ? parsed : []) {
      suggestions.push({
        item_component_id: component.id,
        module_type: 'modern',
        title: item.title,
        steps: item.steps,
        source_url: null,
        source_credibility: 'Community',
        region_tag: null,
        personalisation_note: `${item.best_for === 'urban' ? 'Apartment-friendly' : item.best_for === 'rural' ? 'Space-friendly' : 'Versatile'} solution for ${weather.season}.`,
        video_url: null,
        category: item.category,
        why_it_works: item.why_it_works,
      });
    }
  } catch (error) {
    console.error('Modern module error:', error.message);
  }

  return suggestions;
};

const runDIYModule = async (component, userProfile, weather, pool) => {
  const suggestions = [];

  try {
    const tavilyResults = await searchDIYTutorial(component.component_name, component.material);
    const youtubeUrl = await extractYouTubeUrl(
      `DIY ${component.component_name} ${component.material} repurpose`
    );

    const synthesisPrompt = `Create complete professional DIY instructions for making a useful product
from ${component.component_name} (${component.material}).
Component layer: ${component.layer || 'product'}

The user is in ${userProfile.city || 'India'}, ${userProfile.state || ''}, weather is ${weather.temp}°C ${weather.season}.
Their available tools assumption: basic home kitchen tools only.

HARD RULE: Your DIY project MUST use THIS specific component as its primary material.
- If this is a "product" layer component (e.g. expired cream, old oil), the DIY must repurpose that substance.
- If this is a "packaging" layer component (e.g. plastic bottle, glass jar), the DIY must repurpose the container.
- NEVER create a DIY for the container when the component is the product inside it.

Return detailed JSON:
{
  "title": "Final product name",
  "estimated_time": "15 minutes",
  "difficulty": "Easy/Medium/Hard",
  "shelf_life": "how long the result lasts",
  "ingredients": [
    {"item": "name", "quantity": "amount", "note": "optional note"}
  ],
  "equipment": ["list of tools needed"],
  "steps": [
    {
      "step_number": 1,
      "title": "step title",
      "instruction": "detailed instruction",
      "time": "2 minutes",
      "tip": "optional pro tip"
    }
  ],
  "storage_instructions": "how to store the result",
  "variations": ["any regional variations"]
}

Return ONLY the JSON object.`;

    const result = await chat([{ role: 'user', content: synthesisPrompt }], 3072);
    if (!result) return suggestions;

    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    suggestions.push({
      item_component_id: component.id,
      module_type: 'diy',
      title: parsed.title,
      steps: parsed.steps.map((s) => typeof s === 'string' ? s : `${s.title}: ${s.instruction}`),
      source_url: tavilyResults[0]?.url || null,
      source_credibility: 'Community',
      region_tag: null,
      personalisation_note: `${parsed.difficulty} difficulty — estimated ${parsed.estimated_time}. Shelf life: ${parsed.shelf_life || 'varies'}.`,
      video_url: youtubeUrl,
      diy_details: parsed,
    });
  } catch (error) {
    console.error('DIY module error:', error.message);
  }

  return suggestions;
};

const runReligiousModule = async (component, userProfile, weather, pool) => {
  const suggestions = [];

  if (!userProfile.culture) return suggestions;

  try {
    const upcomingFestival = getUpcomingFestival(userProfile.culture.toLowerCase(), new Date().getMonth() + 1);

    const synthesisPrompt = `User follows ${userProfile.culture} traditions and is in ${userProfile.city || 'India'}, ${userProfile.state || ''}.
Component: ${component.component_name} (${component.material}).
Upcoming festival: ${upcomingFestival ? `${upcomingFestival.name} in ${upcomingFestival.daysUntil} days` : 'None within 30 days'}.

What are the meaningful religious or cultural uses for this component
in ${userProfile.culture} tradition?

Examples of what to look for:
- Hindu: offerings to cattle (go-seva), puja ingredients, Ayurvedic ritual use,
  Diwali lamp preparations, havan ingredients
- Muslim: halal composting practices, sadqa (charity feeding), preparation for Eid
- Sikh: langar (community kitchen) donation, composting for gurudwara garden
- Jain: ahimsa-based disposal (non-harmful), specific dietary considerations
- Christian: community sharing, harvest festival preparations
- Buddhist: mindful composting, offerings

Return JSON:
{
  "title": "cultural/religious suggestion",
  "tradition": "specific tradition name",
  "significance": "why this is meaningful in this tradition",
  "steps": ["how to do it"],
  "occasion": "festival or regular practice",
  "source": "religious text or trusted organisation URL"
}

Only suggest if genuinely applicable. Return null if no meaningful cultural use exists.
Do not fabricate religious significance.
Return ONLY the JSON object or null.`;

    const result = await chat([{ role: 'user', content: synthesisPrompt }], 1536);
    if (!result || result === 'null') return suggestions;

    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed || !parsed.title) return suggestions;

    suggestions.push({
      item_component_id: component.id,
      module_type: 'religious',
      title: parsed.title,
      steps: parsed.steps,
      source_url: parsed.source,
      source_credibility: 'Traditional',
      region_tag: userProfile.state,
      personalisation_note: `${parsed.significance} ${upcomingFestival ? `— upcoming ${upcomingFestival.name} in ${upcomingFestival.daysUntil} days.` : ''}`,
      video_url: null,
      tradition: parsed.tradition,
      occasion: parsed.occasion,
    });
  } catch (error) {
    console.error('Religious module error:', error.message);
  }

  return suggestions;
};

const runHealthModule = async (component, healthConcern, userProfile, weather, pool) => {
  const suggestions = [];

  try {
    const chromaResults = await queryCollection(
      'ayush_knowledge',
      [`${component.component_name} topical health use AYUSH traditional medicine`],
      5
    );

    const chromaDocs = chromaResults.documents?.[0]?.join('\n') || 'No specific documents found.';

    const synthesisPrompt = `AYUSH knowledge base results: ${chromaDocs}
Component: ${component.component_name}
User's stated health concern: ${healthConcern || 'general wellness'}
User's medical profile: conditions: ${userProfile.conditions || 'none'}, medications: ${userProfile.medications || 'none'}
User skin type: ${userProfile.skin_type || 'unknown'}
Weather: ${weather.temp}°C

IMPORTANT BOUNDARY: Do not suggest consuming or applying expired products to the body for health treatment.
For expired or unknown materials, prefer a no-use recommendation with safe disposal guidance over a topical remedy.
This is general wellness information only, not medical advice.

Return JSON:
{
  "title": "topical application name",
  "applicable_for": "what concern this helps with",
  "how_to_apply": "exact application method",
  "duration": "how long to leave on",
  "frequency": "how often to apply",
  "evidence_level": "Traditional/Anecdotal/Research-backed",
  "source_url": "AYUSH or research source URL",
  "medical_disclaimer": "this is traditional wellness information only, not a replacement for medical treatment. Consult a doctor for persistent or serious conditions."
}

Return ONLY the JSON object.`;

    const result = await chat([{ role: 'user', content: synthesisPrompt }], 1536);
    if (!result) return suggestions;

    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    suggestions.push({
      item_component_id: component.id,
      module_type: 'health',
      title: parsed.title,
      steps: [
        `Application: ${parsed.how_to_apply}`,
        `Duration: ${parsed.duration || 'As needed'}`,
        `Frequency: ${parsed.frequency || 'Once daily'}`,
        `Evidence: ${parsed.evidence_level}`,
      ],
      source_url: parsed.source_url,
      source_credibility: parsed.evidence_level === 'Research-backed' ? 'Research' : parsed.evidence_level,
      region_tag: null,
      personalisation_note: `For: ${parsed.applicable_for}. Your skin type: ${userProfile.skin_type}.`,
      video_url: null,
      medical_disclaimer: parsed.medical_disclaimer,
    });
  } catch (error) {
    console.error('Health module error:', error.message);
  }

  return suggestions;
};

const extractJsonArray = (value) => {
  if (!value || typeof value !== 'string') return [];
  const cleaned = value.replace(/```json\s*|\s*```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
};

const timeoutAfter = (promise, timeoutMs, fallback) => Promise.race([
  promise,
  new Promise((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
]);

const getWasteCategory = (component = {}, suppliedCategory = '') => {
  const supplied = normalizeWasteCategory(suppliedCategory);
  const text = `${component.component_name || ''} ${component.item_name || ''} ${component.component_type || ''} ${component.material || ''}`.toLowerCase();

  const inferFromText = () => {
    if (/electronic|battery|circuit|phone|laptop|charger|cable|screen|ewaste|e-waste|cpu|monitor|keyboard|mouse|tablet|headphone|speaker/.test(text)) return 'electronics';
    if (/packaging|bottle|container|carton|wrapper|cardboard|paper|plastic|glass|tin|jar|tube|pouch|sachet|box|bag|can\b|cap\b|label/.test(text)) return 'waste_packaging';
    if (/peel|rind|shell|scrap|leftover|citrus|orange|lemon|lime|banana|mango|apple|potato|watermelon|coconut|mosambi/.test(text)) return 'food_peels';
    if (/expired|spice|cosmetic|lotion|cream|shampoo|soap|dairy|curd|milk|oil|ghee|butter|masala|powder|paste/.test(text)) return 'expired_products';
    return null;
  };

  // Scan type "other" is often a vision fallback — prefer component text when it is more specific.
  if (supplied === 'other') {
    return inferFromText() || 'other';
  }

  if (['food_peels', 'expired_products', 'waste_packaging', 'electronics'].includes(supplied)) {
    return supplied;
  }

  return inferFromText() || supplied || 'other';
};

const extractJsonObject = (value) => {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.replace(/```json\s*|\s*```/g, '').trim();

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

const getGroundedWebSources = (result) => {
  const chunks = result?.groundingMetadata?.groundingChunks || result?.groundingMetadata?.grounding_chunks || [];
  return chunks.map((chunk) => ({
    title: chunk?.web?.title || chunk?.title || '',
    url: chunk?.web?.uri || chunk?.url || '',
    content: chunk?.web?.snippet || chunk?.snippet || '',
  })).filter((source) => source.url);
};

const formatWebSearchResults = (tavilyResults = [], geminiResult = {}) => {
  const sources = [
    ...tavilyResults.map((result) => ({
      title: result.title || 'Search result',
      url: result.url || '',
      content: result.content || result.snippet || '',
    })),
    ...getGroundedWebSources(geminiResult),
  ].filter((source, index, all) => source.url && all.findIndex((item) => item.url === source.url) === index).slice(0, 5);

  const formatted = sources.map((source, index) => (
    `[${index + 1}] ${source.title} — ${String(source.content || '').replace(/\s+/g, ' ').slice(0, 500)} (${source.url})`
  ));

  if (!formatted.length && geminiResult?.text) {
    formatted.push(`Gemini web-search summary — ${String(geminiResult.text).replace(/\s+/g, ' ').slice(0, 1200)}`);
  }

  return {
    text: formatted.length ? formatted.join('\n') : 'No usable web search results returned.',
    sources,
  };
};

const searchLiveReuseEvidence = async (component, category, userProfile) => {
  const query = `${component.component_name} ${component.material || ''} safe non-edible reuse ${category} ${userProfile.state || 'India'}`.trim();
  const [tavilyResults, geminiResult] = await Promise.all([
    timeoutAfter(search(query, { search_depth: 'basic', max_results: 3 }), 4000, []),
    timeoutAfter(webSearch(query, 3), 4000, { text: '', groundingMetadata: null }),
  ]);

  return formatWebSearchResults(
    Array.isArray(tavilyResults) ? tavilyResults : [],
    geminiResult && !Array.isArray(geminiResult) ? geminiResult : {}
  );
};

const buildReuseSynthesisPrompt = ({ component, category, goal, userProfile, weather, examples, webSearchResults }) => {
  const condition = component.condition_status || component.condition || 'unknown';
  const profile = {
    city: userProfile.city || 'India',
    state: userProfile.state || '',
    culture: userProfile.culture || 'Indian',
    language: userProfile.language || 'English',
    skinType: userProfile.skin_type || 'unknown',
  };
  const diyIdeaThemes = getDIYIdeaThemes(component).map((idea) => idea.title);

  return `You are the reuse-suggestion engine for WasteWise, an Indian household zero-waste app.

## THE ITEM
Component: "${component.component_name}"
Material/condition: ${component.material || 'unknown'}, ${condition}
Waste category: ${category}
User goal: ${goal}
User context: ${profile.city}, ${profile.state}, follows ${profile.culture} traditions, speaks ${profile.language}. Skin type: ${profile.skinType}.
Weather: ${weather.temp ?? 'unknown'}°C, ${weather.season || 'current season'}.

## SOURCE 1 — DATASET PATTERNS (for inspiration only — shown separately to the user)
These verified dataset ideas will be returned to the user as-is. Your job is to ADD 2 to 4 NEW complementary reuse ideas that are NOT duplicates of these titles. Learn the material reasoning from these examples, then propose fresh routes tailored to this exact component.

${examples}

## SOURCE 2 — LIVE WEB SEARCH RESULTS
Fresh, possibly more specific or current information:

${webSearchResults}

## SOURCE 3 — YOUR OWN REASONING
Where the dataset examples and web results are thin, use careful knowledge of chemistry, traditional Indian household practice, gardening, and material science. Do not invent a use whose mechanism this exact component cannot support.

## CURATED DIY ROUTE THEMES
Use these as additional inspiration only when they physically fit this exact component: ${diyIdeaThemes.length ? diyIdeaThemes.join('; ') : 'No close catalogue theme; use verified material-specific reasoning only.'}

## HOW TO COMBINE THE THREE SOURCES
1. Use the dataset pattern to identify a plausible reuse category.
2. Use live sources only to confirm, correct, or make that route more specific.
3. Adapt the route to this component and this user's weather, location, culture, language, and skin profile.
4. If sources disagree, choose the safest interpretation.

## HARD RULES
- The suggestion must use the actual component, not its packaging, unless this component is packaging.
- module_type must be exactly one of: traditional, modern, diy, health, religious, ewaste, disposal.
- Return 2 to 4 suggestions that are meaningfully different from the dataset titles in SOURCE 1.
- Every individual step must include a specific quantity, duration, ratio, count, size, or interval and a clear action or mechanism.
- Never use vague recommendations or these phrases: "use it around the home", "use it for anything", "do whatever feels useful", "useful for your home", "any animal", "feed it to animals", "for your pets", "safe for everyone", "good for all", "just mix with water", "do this as needed", "it depends", or "whatever".
- Never recommend animal feed. Animal routes are disabled in WasteWise.
- State any toxicity, allergy, pregnancy, pet, fire, electrical, or contamination risk explicitly in disclaimers.
- Never recommend ingesting, medical treatment, animal feed, or skin/hair application for expired, mouldy, contaminated, chemical, unknown, or electronic components.
- Never suggest opening batteries, burning electronics, acid extraction, or home dismantling of hazardous components.
- Do not fabricate source_url or source_name. Include them only when they came directly from the live web results above.

Return only this JSON object, with no Markdown fence or commentary:
{
  "component_name": "${component.component_name}",
  "suggestions": [
    {
      "title": "specific, descriptive title",
      "module_type": "one of: traditional/modern/diy/health/religious/ewaste/disposal",
      "steps": ["step with quantity and clear action", "step with quantity and clear action", "..."],
      "source_url": "only if genuinely from Source 2, else omit this key",
      "source_name": "only if genuinely from Source 2, else omit this key",
      "why_now": "why this fits the current weather or season",
      "personalisation": "why this suits this user's profile",
      "confidence": "high, medium, or low"
    }
  ],
  "disclaimers": ["specific safety warning for this component and user"]
}`;
};

const normaliseSynthesisSuggestions = (payload, component, userProfile, webSources) => {
  const allowedModules = new Set(['traditional', 'modern', 'diy', 'health', 'religious', 'ewaste', 'disposal']);
  const trustedUrls = new Map((webSources || []).map((source) => [source.url, source]));
  const seenTitles = new Set();
  const disclaimers = Array.isArray(payload?.disclaimers) ? payload.disclaimers.filter(Boolean).slice(0, 6) : [];
  const componentText = `${component.component_name || ''} ${component.item_name || ''} ${component.component_type || ''} ${component.material || ''} ${component.condition_status || component.condition || ''}`.toLowerCase();
  const needsSensitiveUseBlock = /expired|degraded|mould|mold|contaminated|chemical|unknown|electronic|battery|circuit/.test(componentText);

  return (Array.isArray(payload?.suggestions) ? payload.suggestions : [])
    .slice(0, 4)
    .map((candidate) => {
      const moduleType = String(candidate?.module_type || '').toLowerCase();
      const source = trustedUrls.get(candidate?.source_url);
      const title = String(candidate?.title || '').trim();
      const context = [candidate?.why_now, candidate?.personalisation].filter(Boolean).join(' ');
      const candidateText = `${title} ${(candidate?.steps || []).join(' ')}`.toLowerCase();

      if (!allowedModules.has(moduleType) || !title || seenTitles.has(title.toLowerCase())) return null;
      if (moduleType === 'disposal') return null;
      seenTitles.add(title.toLowerCase());
      if (needsSensitiveUseBlock && (moduleType === 'health' || /skin|hair|scalp|face|body|ingest|eat|drink|consume|animal feed|feed to/.test(candidateText))) return null;
      if (/electronic|battery|circuit/.test(componentText) && /open|dismantle|disassemble|burn|acid extraction|puncture/.test(candidateText)) return null;

      return {
        item_component_id: component.id,
        module_type: moduleType,
        title,
        steps: Array.isArray(candidate?.steps) ? candidate.steps.map((step) => String(step || '').trim()).filter(Boolean) : [],
        source_url: source ? source.url : null,
        source_name: source ? (candidate.source_name || source.title) : null,
        source_credibility: source ? 'Live web evidence' : 'AI synthesis',
        suggestion_source: 'ai',
        region_tag: userProfile.city || userProfile.state || 'India',
        personalisation_note: context || 'Tailored to the component, local season, and user profile.',
        video_url: null,
        disclaimers,
        synthesis_contract: true,
      };
    })
    .filter(Boolean)
    // The current WasteWise UI deliberately suppresses animal-feed advice; do not
    // persist it until the product enables species-specific veterinary review.
    .filter((suggestion) => suggestion.module_type !== 'animal_feed')
    .filter((suggestion) => isSpecificEnough(suggestion) && validateRepurposingSuggestion(suggestion).isValid);
};

const runDeepReusePlanner = async (component, questionnaireContext, userProfile, weather, suppliedCategory = '') => {
  if (process.env.DISABLE_AI_SUGGESTIONS === 'true') {
    return [];
  }

  const selectedGoals = Array.isArray(questionnaireContext.reuseGoals) && questionnaireContext.reuseGoals.length
    ? questionnaireContext.reuseGoals
    : [questionnaireContext.reuseGoal || 'safe household reuse'];
  const category = getWasteCategory(component, suppliedCategory);
  const datasetExamples = formatDatasetExamples(findSimilarDatasetEntries(component, category, 4));

  try {
    const liveEvidence = await searchLiveReuseEvidence(component, category, userProfile);
    const prompt = buildReuseSynthesisPrompt({
      component,
      category,
      goal: selectedGoals.join(', '),
      userProfile,
      weather,
      examples: datasetExamples,
      webSearchResults: liveEvidence.text,
    });
    const result = await timeoutAfter(chat([{ role: 'user', content: prompt }], 2600, 0.15), 15000, null);
    const payload = extractJsonObject(result);
    const synthesized = normaliseSynthesisSuggestions(payload, component, userProfile, liveEvidence.sources);

    if (synthesized.length > 0) {
      return synthesized;
    }

    console.warn(`[DeepReusePlanner] AI synthesis empty for ${component.component_name}`);
    return [];
  } catch (error) {
    console.error('Dataset-guided reuse planner error:', error.message);
    return [];
  }
};

const extractQuestionnaireContext = (rawInput, contextualAnswers = {}) => {
  let parsedContext = {};

  if (rawInput) {
    try {
      const parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
      const source = parsed?.form || parsed?.questionnaire || parsed || {};
      parsedContext = {
        scanType: parsed?.scanType || parsed?.input_type || '',
        productForm: source.productForm || '',
        reuseGoal: source.reuseGoal || '',
        reuseGoals: Array.isArray(source.reuseGoals) ? source.reuseGoals : [],
        availableItems: Array.isArray(source.availableItems) ? source.availableItems : [],
      };
    } catch (error) {
      console.warn('Failed to parse questionnaire context:', error.message);
    }
  }

  const questionnaire = contextualAnswers?.questionnaire || {};
  return {
    scanType: parsedContext.scanType || contextualAnswers?.scanType || '',
    wasteCategory: contextualAnswers?.wasteCategory || parsedContext.scanType || contextualAnswers?.scanType || '',
    productForm: questionnaire.productForm || parsedContext.productForm || '',
    reuseGoal: questionnaire.reuseGoal || parsedContext.reuseGoal || '',
    reuseGoals: questionnaire.reuseGoals?.length ? questionnaire.reuseGoals : parsedContext.reuseGoals,
    availableItems: questionnaire.availableItems?.length ? questionnaire.availableItems : parsedContext.availableItems,
  };
};

const hasQuestionnaireContext = (context = {}) => Boolean(
  context.productForm || context.reuseGoal || context.reuseGoals?.length || context.availableItems?.length
);

const runSupplementalAiModules = async () => [];

const buildNotFoundSuggestion = (component, userProfile = {}) => {
  // Instead of a dead-end "not found" card, generate useful heuristic suggestions
  // based on the component type using fastSuggestionGenerator.
  const heuristicSuggestions = fastSuggestionGenerator(component, userProfile, {}, {
    wasteCategory: component.component_type || 'other',
    skipDataset: true,
    pipelineMode: true,
  });

  if (heuristicSuggestions && heuristicSuggestions.length > 0) {
    // Return the first heuristic suggestion as the "not found" replacement
    return heuristicSuggestions.map((s) => ({
      ...s,
      item_component_id: component.id,
      suggestion_source: 'heuristic',
      region_tag: s.region_tag || userProfile.state || userProfile.city || 'India',
    }));
  }

  // Ultimate fallback — generic but useful tips based on material type
  const materialLower = (component.material || component.component_type || '').toLowerCase();
  let fallbackTitle, fallbackSteps;

  if (/organic|food|peel|fruit|vegetable/.test(materialLower)) {
    fallbackTitle = `Compost ${component.component_name} for Garden Use`;
    fallbackSteps = [
      'Chop into small pieces (2–3 cm) and add to a compost bin or pit.',
      'Mix with dry leaves or shredded newspaper in a 1:1 ratio to balance carbon and nitrogen.',
      'Turn the pile every 5–7 days. In 4–6 weeks you will have rich compost for potted plants.',
      'Alternatively, bury 15 cm deep directly in a flower bed as slow-release fertiliser.',
    ];
  } else if (/plastic|bottle|container|packaging/.test(materialLower)) {
    fallbackTitle = `Repurpose ${component.component_name} for Storage`;
    fallbackSteps = [
      'Clean thoroughly with warm soapy water and let it dry completely.',
      'Use as a small storage container for nails, screws, seeds, or craft supplies.',
      'Cut the top section to create a mini planter — poke 3–4 drainage holes in the bottom.',
      'If not reusable, clean and place in the dry waste / recyclable bin for your area.',
    ];
  } else if (/electronic|battery|circuit|pcb|metal/.test(materialLower)) {
    fallbackTitle = `Safe E-waste Disposal for ${component.component_name}`;
    fallbackSteps = [
      'Do NOT open, burn, or attempt to disassemble any electronic component at home.',
      'Locate the nearest authorised e-waste collection centre (search "e-waste collection" + your city).',
      'Many electronics retailers like Croma and Reliance Digital accept old devices for recycling.',
      'For working devices, consider donating to NGOs or listing on OLX/Cashify for resale.',
    ];
  } else if (/glass|ceramic/.test(materialLower)) {
    fallbackTitle = `Reuse ${component.component_name} at Home`;
    fallbackSteps = [
      'Clean and sterilise with boiling water for 5 minutes.',
      'Use as a storage jar for spices, pulses, or dried herbs in the kitchen.',
      'Fill with fairy lights or pebbles for decorative use.',
      'If broken, wrap carefully in newspaper before placing in dry waste bin.',
    ];
  } else {
    fallbackTitle = `Smart Reuse Ideas for ${component.component_name}`;
    fallbackSteps = [
      'Assess the item condition — clean, intact items have the most reuse potential.',
      'Search YouTube for DIY projects using this specific material type.',
      'Check local community groups or Freecycle to see if someone can use this item.',
      'If no reuse route exists, sort into the correct waste stream (dry/wet/hazardous) for your municipality.',
    ];
  }

  return [{
    item_component_id: component.id,
    module_type: 'diy',
    title: fallbackTitle,
    steps: fallbackSteps,
    source_url: null,
    source_credibility: 'WasteWise Heuristic',
    suggestion_source: 'heuristic',
    region_tag: userProfile.state || userProfile.city || 'India',
    personalisation_note: `Smart suggestions for ${component.component_name} based on material type.`,
    video_url: null,
  }];
};

const saveSuggestionToDb = async (suggestion, userProfile, pool) => {
  const [sugResult] = await pool.query(
    `INSERT INTO suggestions (item_component_id, module_type, title, steps, source_url, source_credibility, region_tag, personalisation_note, video_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      suggestion.item_component_id,
      suggestion.module_type,
      suggestion.title,
      JSON.stringify(suggestion.steps),
      suggestion.source_url,
      suggestion.source_credibility,
      suggestion.region_tag,
      suggestion.personalisation_note,
      suggestion.video_url,
    ]
  );

  const suggestionId = sugResult.insertId;

  let disclaimer;
  if (Array.isArray(suggestion.disclaimers) && suggestion.disclaimers.length) {
    disclaimer = {
      who_should_not_use: suggestion.disclaimers.join(' '),
      when_to_stop: 'Stop immediately if irritation, odour, leakage, heating, mould, or other unexpected change appears.',
      patch_test_required: /skin|hair|scalp|face|body/i.test(`${suggestion.title} ${(suggestion.steps || []).join(' ')}`),
      medical_boundary: 'This is a reuse suggestion, not medical or veterinary advice.',
      animal_safety_note: null,
      quantity_ceiling: null,
    };
  } else {
    disclaimer = fastDisclaimerGenerator(suggestion.title, suggestion.module_type, userProfile);
  }

  await pool.query(
    `INSERT INTO disclaimers (suggestion_id, who_should_not_use, when_to_stop, patch_test_required, medical_boundary, animal_safety_note, quantity_ceiling)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      suggestionId,
      disclaimer.who_should_not_use,
      disclaimer.when_to_stop,
      disclaimer.patch_test_required || false,
      disclaimer.medical_boundary,
      disclaimer.animal_safety_note,
      disclaimer.quantity_ceiling,
    ]
  );

  return { id: suggestionId, ...suggestion };
};

const tagSuggestionSource = (suggestions, source) => (
  Array.isArray(suggestions) ? suggestions.map((suggestion) => ({
    ...suggestion,
    suggestion_source: suggestion.suggestion_source || source,
  })) : []
);

const isDisposalSuggestion = (suggestion = {}) => {
  const text = `${suggestion.title || ''} ${suggestion.personalisation_note || ''} ${suggestion.personalisation || ''}`.toLowerCase();
  return suggestion.module_type === 'disposal'
    || /safe disposal plan|sort .* before disposal|could not be confirmed safely|before disposal/i.test(text);
};

const clearComponentSuggestions = async (componentIds, pool) => {
  if (!componentIds.length) return;

  const placeholders = componentIds.map(() => '?').join(', ');
  const [existing] = await pool.query(
    `SELECT id FROM suggestions WHERE item_component_id IN (${placeholders})`,
    componentIds
  );
  const suggestionIds = existing.map((row) => row.id);
  if (!suggestionIds.length) return;

  const idPlaceholders = suggestionIds.map(() => '?').join(', ');
  await pool.query(`DELETE FROM disclaimers WHERE suggestion_id IN (${idPlaceholders})`, suggestionIds);
  await pool.query(`DELETE FROM suggestions WHERE id IN (${idPlaceholders})`, suggestionIds);
};

const generateAllSuggestions = async (analysisResult, goals, contextualAnswers, pool) => {
  const { scanId, components, safetyResults, weather, userProfile, productName } = analysisResult;
  const allSuggestions = [];

  const safeComponents = components.filter((comp) => {
    const safety = safetyResults.find((s) => s.component_id === comp.id);
    return safety && safety.is_safe;
  });

  await clearComponentSuggestions(safeComponents.map((comp) => comp.id), pool);

  const animalList = contextualAnswers?.animals || [];
  const healthConcern = contextualAnswers?.healthConcern || '';

  const startTime = Date.now();
  console.log(`[FastTrack] Starting suggestion generation for scan ${scanId}`);

  const questionnaireContext = extractQuestionnaireContext(analysisResult.rawInput, contextualAnswers);
  const wasteCategory = normalizeWasteCategory(analysisResult.category || questionnaireContext.scanType);
  let moduleResults;

  // Always seed with verified dataset patterns first — peels, packaging, electronics, etc.
  const enrichedComponents = safeComponents.map((comp) => ({
    ...comp,
    item_name: comp.item_name || productName,
  }));

  const datasetFirstResults = enrichedComponents.map((component) =>
    tagSuggestionSource(
      getDatasetSuggestions(component, getWasteCategory(component, wasteCategory), userProfile),
      'dataset'
    )
  );

  if (wasteCategory === 'electronics' && enrichedComponents.length > 1) {
    const productLevel = {
      ...enrichedComponents[0],
      component_name: productName || enrichedComponents[0].component_name,
      item_name: productName || enrichedComponents[0].item_name,
    };
    const sharedDataset = tagSuggestionSource(
      getDatasetSuggestions(productLevel, 'electronics', userProfile),
      'dataset'
    ).map((suggestion) => ({
      ...suggestion,
      item_component_id: enrichedComponents[0].id,
    }));
    for (let index = 0; index < datasetFirstResults.length; index += 1) {
      datasetFirstResults[index] = index === 0 ? sharedDataset : [];
    }
  }

  const needsAiReuse = wasteCategory === 'electronics'
    ? !(datasetFirstResults[0] || []).length
    : enrichedComponents.some((_component, index) => !(datasetFirstResults[index] || []).length);
  let deepReuseResults = enrichedComponents.map(() => []);

  if (needsAiReuse) {
    console.log(`[Suggestions] Running AI deep reuse for components missing dataset matches (${wasteCategory})`);
    deepReuseResults = await Promise.all(
      enrichedComponents.map((component, index) => {
        if ((datasetFirstResults[index] || []).length > 0) return Promise.resolve([]);
        return runDeepReusePlanner(
          component,
          { ...questionnaireContext, wasteCategory, scanType: analysisResult.category || questionnaireContext.scanType },
          userProfile,
          weather,
          wasteCategory
        );
      })
    );
  } else {
    console.log(`[Suggestions] Dataset covers all components — skipping AI deep reuse (${wasteCategory})`);
  }

  const fastSuggestions = [];
  const requiresQuestionnaireFallback = hasQuestionnaireContext(questionnaireContext);

  if (requiresQuestionnaireFallback && process.env.DISABLE_AI_SUGGESTIONS !== 'true') {
    console.log(`[Suggestions] Adding questionnaire-aware contextual suggestions (${wasteCategory})`);
    for (const component of safeComponents) {
      fastSuggestions.push(...tagSuggestionSource(
        fastSuggestionGenerator(component, userProfile, weather, {
          ...questionnaireContext,
          scanType: analysisResult.category || questionnaireContext.scanType,
          wasteCategory,
          skipDataset: true,
          pipelineMode: true,
        }),
        'contextual'
      ));
    }
  }

  moduleResults = [
    ...datasetFirstResults,
    ...deepReuseResults.map((results) => tagSuggestionSource(results, 'ai')),
    fastSuggestions,
  ];

  const elapsed = Date.now() - startTime;
  console.log(`[FastTrack] Suggestion generation completed in ${elapsed}ms`);

  const validatedSuggestions = [];
  const savedSuggestionKeys = new Set();

  for (const results of moduleResults) {
    for (const suggestion of results) {
      const validation = validateRepurposingSuggestion(suggestion);
      if (!validation.isValid) {
        console.warn(`[SuggestionValidation] Rejected suggestion: ${suggestion.title} — ${validation.reason}`);
        continue;
      }

      // Never show generic disposal cards — use dataset or "Not found" instead.
      if (isDisposalSuggestion(suggestion)) {
        console.warn(`[SuggestionValidation] Blocked disposal suggestion: ${suggestion.title}`);
        continue;
      }

      const suggestionKey = `${suggestion.item_component_id}:${String(suggestion.title || '').trim().toLowerCase()}`;
      if (savedSuggestionKeys.has(suggestionKey)) continue;
      savedSuggestionKeys.add(suggestionKey);

      validatedSuggestions.push(suggestion);
      const saved = await saveSuggestionToDb(suggestion, userProfile, pool);
      allSuggestions.push(saved);
    }
  }

  // Simple rule: no dataset + no AI → generate heuristic suggestions instead of dead-end card
  for (let index = 0; index < safeComponents.length; index += 1) {
    const component = safeComponents[index];
    const alreadySaved = allSuggestions.some((s) => s.item_component_id === component.id);
    const scanHasReuse = allSuggestions.some((s) => s.suggestion_source !== 'not_found' && s.suggestion_source !== 'heuristic');
    if (alreadySaved || (wasteCategory === 'electronics' && scanHasReuse)) continue;

    console.log(`[Suggestions] Generating heuristic suggestions for ${component.component_name}`);
    const heuristicResults = buildNotFoundSuggestion(component, userProfile);
    for (const suggestion of (Array.isArray(heuristicResults) ? heuristicResults : [heuristicResults])) {
      const saved = await saveSuggestionToDb(suggestion, userProfile, pool);
      allSuggestions.push(saved);
    }
  }

  const datasetCount = allSuggestions.filter((s) => s.suggestion_source === 'dataset').length;
  const aiCount = allSuggestions.filter((s) => s.suggestion_source === 'ai' || s.suggestion_source === 'contextual').length;
  const heuristicCount = allSuggestions.filter((s) => s.suggestion_source === 'heuristic' || s.suggestion_source === 'not_found').length;

  return {
    scanId,
    suggestions_count: allSuggestions.length,
    dataset_count: datasetCount,
    ai_count: aiCount,
    heuristic_count: heuristicCount,
    suggestions: allSuggestions,
    redirect: `/results/${scanId}`,
  };
};

module.exports = {
  generateAllSuggestions,
  buildReuseSynthesisPrompt,
  formatWebSearchResults,
  normaliseSynthesisSuggestions,
};
