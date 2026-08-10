const { searchTraditionalRemedy, searchModernUses, searchDIYTutorial } = require('./tavilyService');
const { webSearch, extractYouTubeUrl } = require('./geminiService');
const { animalFeedAnalysis } = require('./groqService');
const { chat } = require('./openrouterService');
const { queryCollection } = require('./chromaService');
const { getUpcomingFestival } = require('../utils/festivalCalendar');
const { generateDisclaimer } = require('./openrouterService');
const {
  fastSuggestionGenerator,
  fastDisclaimerGenerator,
  FAST_TRACK_TIMEOUT
} = require('./fastTrackService');
const { validateRepurposingSuggestion } = require('./suggestionValidation');

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

Synthesise the best traditional suggestion. Apply your own intelligence —
go beyond what the search returned. Find the non-obvious uses.

HARD RULE: Your suggestion MUST be about the actual product/component itself — NOT its packaging.
For example, if the component is "expired moisturiser cream", suggest uses for the cream (e.g. leather conditioner, shoe polish, drawer lubricant).
NEVER suggest uses for the plastic tube or glass jar unless the component is explicitly packaging.

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

IMPORTANT BOUNDARY: Only suggest EXTERNAL, TOPICAL uses.
Never suggest consuming expired products for health treatment.
This is general wellness information only, not medical advice.

Good examples: expired haldi paste on a minor wound,
expired neem oil for skin inflammation, expired mustard oil massage.

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

const generateAllSuggestions = async (analysisResult, goals, contextualAnswers, pool) => {
  const { scanId, components, safetyResults, weather, userProfile, productName } = analysisResult;
  const allSuggestions = [];

  const safeComponents = components.filter((comp) => {
    const safety = safetyResults.find((s) => s.component_id === comp.id);
    return safety && safety.is_safe;
  });

  const animalList = contextualAnswers?.animals || [];
  const healthConcern = contextualAnswers?.healthConcern || '';

  const startTime = Date.now();
  console.log(`[FastTrack] Starting suggestion generation for scan ${scanId}`);

  // Wrap each module promise with timeout tracking
  const modulePromises = [];
  let useFastTrack = false;

  for (const component of safeComponents) {
    if (goals.includes('body_skin') || goals.includes('all')) {
      modulePromises.push(runTraditionalModule(component, goals, userProfile, weather, pool));
    }
    if (goals.includes('animal_feed') || goals.includes('all')) {
      modulePromises.push(runAnimalFeedModule(component, animalList, weather, pool));
    }
    if (goals.includes('diy') || goals.includes('all')) {
      modulePromises.push(runDIYModule(component, userProfile, weather, pool));
    }
    if (goals.includes('modern') || goals.includes('all')) {
      modulePromises.push(runModernModule(component, userProfile, weather, pool));
    }
    if (goals.includes('cultural') || goals.includes('all')) {
      modulePromises.push(runReligiousModule(component, userProfile, weather, pool));
    }
    if (goals.includes('health') || goals.includes('all')) {
      modulePromises.push(runHealthModule(component, healthConcern, userProfile, weather, pool));
    }
  }

  // Race against timeout - if AI services take too long, use fast-track
  let moduleResults;
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[FastTrack] Timeout reached (${FAST_TRACK_TIMEOUT}ms), using fast-track fallback`);
      useFastTrack = true;
      resolve(null);
    }, FAST_TRACK_TIMEOUT);
  });

  try {
    moduleResults = await Promise.race([
      Promise.all(modulePromises),
      timeoutPromise
    ]);

    // If timeout occurred, use fast-track fallback
    if (useFastTrack || !moduleResults) {
      console.log(`[FastTrack] Generating fast-track suggestions for ${safeComponents.length} components`);
      const fastSuggestions = [];
      for (const component of safeComponents) {
        const suggestions = fastSuggestionGenerator(component, userProfile, weather);
        fastSuggestions.push(...suggestions);
      }
      moduleResults = [fastSuggestions];
    }
  } catch (error) {
    console.error('[FastTrack] Error in suggestion generation:', error.message);
    // Fallback to fast-track on error
    const fastSuggestions = [];
    for (const component of safeComponents) {
      const suggestions = fastSuggestionGenerator(component, userProfile, weather);
      fastSuggestions.push(...suggestions);
    }
    moduleResults = [fastSuggestions];
  }

  const elapsed = Date.now() - startTime;
  console.log(`[FastTrack] Suggestion generation completed in ${elapsed}ms`);

  const validatedSuggestions = [];

  for (const results of moduleResults) {
    for (const suggestion of results) {
      const validation = validateRepurposingSuggestion(suggestion);
      if (!validation.isValid) {
        console.warn(`[SuggestionValidation] Rejected suggestion: ${suggestion.title} — ${validation.reason}`);
        continue;
      }

      validatedSuggestions.push(suggestion);
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

      const userProfileSummary = {
        name: userProfile.name,
        city: userProfile.city,
        state: userProfile.state,
        skin_type: userProfile.skin_type,
        is_pregnant: userProfile.is_pregnant,
        allergies: userProfile.allergies,
        culture: userProfile.culture,
      };

      // Generate disclaimer with timeout
      let disclaimer = null;
      try {
        const disclaimerTimeout = new Promise((resolve) => {
          setTimeout(() => {
            console.log('[FastTrack] Disclaimer timeout, using fast-track');
            resolve(null);
          }, 3000);
        });

        disclaimer = await Promise.race([
          generateDisclaimer(suggestion.title, suggestion.module_type, userProfileSummary),
          disclaimerTimeout
        ]);

        if (!disclaimer) {
          disclaimer = fastDisclaimerGenerator(suggestion.title, suggestion.module_type, userProfile);
        }
      } catch (error) {
        console.error('Disclaimer generation error:', error.message);
        disclaimer = fastDisclaimerGenerator(suggestion.title, suggestion.module_type, userProfile);
      }

      if (disclaimer) {
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
      }

      allSuggestions.push({ id: suggestionId, ...suggestion });
    }
  }

  if (validatedSuggestions.length === 0 && safeComponents.length > 0) {
    console.warn('[SuggestionValidation] No validated suggestions survived; using self-contained fallback suggestions.');
  }

  if (allSuggestions.length === 0 && safeComponents.length > 0) {
    for (const component of safeComponents) {
      const fallbackSuggestion = {
        item_component_id: component.id,
        module_type: 'diy',
        title: `Repurpose ${component.component_name}`,
        steps: [
          `Clean ${component.component_name} thoroughly`,
          'Dry it completely before reuse',
          'Turn it into a simple household or craft project',
        ],
        source_url: null,
        source_credibility: 'Community',
        region_tag: userProfile.state || userProfile.city || null,
        personalisation_note: 'Fallback suggestion generated locally because external synthesis was unavailable.',
        video_url: null,
      };

      const [sugResult] = await pool.query(
        `INSERT INTO suggestions (item_component_id, module_type, title, steps, source_url, source_credibility, region_tag, personalisation_note, video_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fallbackSuggestion.item_component_id,
          fallbackSuggestion.module_type,
          fallbackSuggestion.title,
          JSON.stringify(fallbackSuggestion.steps),
          fallbackSuggestion.source_url,
          fallbackSuggestion.source_credibility,
          fallbackSuggestion.region_tag,
          fallbackSuggestion.personalisation_note,
          fallbackSuggestion.video_url,
        ]
      );

      const suggestionId = sugResult.insertId;
      await pool.query(
        `INSERT INTO disclaimers (suggestion_id, who_should_not_use, when_to_stop, patch_test_required, medical_boundary, animal_safety_note, quantity_ceiling)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          suggestionId,
          'Anyone with sensitivity to this material',
          'Stop if irritation, odor, or spoilage appears',
          false,
          'General reuse only; not medical advice',
          'Keep away from pets if uncertain',
          'Small household quantities only',
        ]
      );

      allSuggestions.push({ id: suggestionId, ...fallbackSuggestion });
    }
  }

  return {
    scanId,
    suggestions_count: allSuggestions.length,
    suggestions: allSuggestions,
    redirect: `/results/${scanId}`,
  };
};

module.exports = { generateAllSuggestions };
