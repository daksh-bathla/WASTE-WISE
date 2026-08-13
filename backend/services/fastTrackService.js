// Fast-track service for immediate analysis when AI APIs are slow/unavailable
const { findSimilarDatasetEntries, getDatasetSuggestions, normalizeWasteCategory } = require('./datasetPatternService');

const FAST_TRACK_TIMEOUT = 8000; // 8 seconds max for entire pipeline

const getDatasetSuggestionsForComponent = (component, category, userProfile = {}) =>
  getDatasetSuggestions(component, category, userProfile);

const isPeelOrScrapItem = (name = '') => /peel|rind|shell|scrap|leftover|citrus|orange|lemon|lime|banana|mango|apple|potato|watermelon|coconut/i.test(String(name).toLowerCase());

const hasDatasetMatch = (component, wasteCategory) => {
  const { findSimilarDatasetEntries } = require('./datasetPatternService');
  return findSimilarDatasetEntries(component, wasteCategory, 1).length > 0;
};

const fastDecompose = (productName, category) => {
  const lower = (productName || '').toLowerCase();
  
  if (category === 'food_peels' || lower.includes('peel') || lower.includes('banana') || lower.includes('apple') || lower.includes('potato')) {
    return [{
      component_name: productName || 'Organic matter',
      component_type: 'organic',
      material: productName || 'organic',
      condition: 'good',
      estimated_percentage: 100
    }];
  }
  
  if (category === 'waste_packaging' || lower.includes('plastic') || lower.includes('bottle') || lower.includes('container')) {
    return [{
      component_name: productName || 'Packaging material',
      component_type: 'packaging',
      material: 'plastic',
      condition: 'good',
      estimated_percentage: 100
    }];
  }
  
  if (category === 'electronics' || lower.includes('phone') || lower.includes('laptop') || lower.includes('device')) {
    return [
      { component_name: 'Device body', component_type: 'electronic', material: 'plastic/metal', condition: 'fair', estimated_percentage: 50 },
      { component_name: 'Circuit board', component_type: 'electronic', material: 'PCB', condition: 'fair', estimated_percentage: 20 },
      { component_name: 'Battery', component_type: 'electronic', material: 'lithium', condition: 'fair', estimated_percentage: 15 },
      { component_name: 'Screen', component_type: 'electronic', material: 'glass/LCD', condition: 'fair', estimated_percentage: 15 }
    ];
  }
  
  return [{
    component_name: productName || 'Item',
    component_type: category || 'expired_product',
    material: productName || 'mixed',
    condition: 'degraded',
    estimated_percentage: 100
  }];
};

const fastSafetyCheck = (component, productInfo) => {
  const lower = (component.component_name || '').toLowerCase();
  
  if (lower.includes('avocado') || lower.includes('onion') || lower.includes('garlic')) {
    return {
      is_safe: true,
      safety_level: 'caution',
      safe_for_body: true,
      safe_for_animals: false,
      safe_for_plants: true,
      safe_for_crafts: true,
      warnings: ['Not safe for pets (dogs/cats)'],
      must_not: ['Do not feed to dogs or cats']
    };
  }
  
  if (lower.includes('mould') || lower.includes('rotten')) {
    return {
      is_safe: false,
      safety_level: 'unsafe',
      safe_for_body: false,
      safe_for_animals: false,
      safe_for_plants: true,
      safe_for_crafts: false,
      warnings: ['Visible mould/rot detected'],
      must_not: ['Do not use on skin or consume']
    };
  }
  
  return {
    is_safe: true,
    safety_level: 'safe',
    safe_for_body: true,
    safe_for_animals: true,
    safe_for_plants: true,
    safe_for_crafts: true,
    warnings: [],
    must_not: []
  };
};

// Questionnaire answers are authoritative. Never infer that an unknown expired
// product is suitable for food, skin, cleaning, or plants from its form alone.
const normalizeQuestionnaireContext = (context = {}) => {
  const goalAliases = {
    body_skin: 'skin_hair',
    health: 'kitchen_non_edible',
    diy: 'craft_diy',
    all: 'disposal',
  };
  const productForm = String(context.productForm || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  const rawGoals = Array.isArray(context.reuseGoals)
    ? context.reuseGoals
    : Array.isArray(context.reuseGoal)
      ? context.reuseGoal
      : [context.reuseGoal].filter(Boolean);
  const reuseGoals = rawGoals
    .map((goal) => String(goal).toLowerCase().trim())
    .filter(Boolean)
    .map((goal) => goalAliases[goal] || goal);
  const availableItems = Array.isArray(context.availableItems)
    ? context.availableItems.map((item) => String(item).toLowerCase())
    : [];

  return {
    productForm,
    reuseGoal: reuseGoals[0] || '',
    reuseGoals,
    availableItems,
  };
};

const buildSafeDisposalSuggestion = (productName, productForm, isFoodLike) => {
  const name = productName.trim() || 'this item';
  const formDescription = productForm ? `${productForm} product` : 'product';

  if (isFoodLike) {
    return {
      title: `Safe disposal plan for ${name}`,
      steps: [
        `Do not eat, drink, feed to animals, or apply this expired ${formDescription} to skin.`,
        'Seal it in a small bag or container so it does not spill, attract pests, or contaminate other waste.',
        'For a dry, mould-free plant-based product, add no more than 1 tablespoon to an active compost bin with two handfuls of dry leaves or paper. Do not put it directly on plant roots or down a drain.',
        'Otherwise, use the local organic-waste collection route and recycle the empty packaging only after it is clean and accepted locally.',
      ],
      module_type: 'diy',
      personalisation_note: 'A reuse use-case could not be confirmed safely from the item details provided.',
      source_credibility: 'Safety-first disposal guidance',
    };
  }

  return {
    title: `Sort ${name} before disposal`,
    steps: [
      `Keep this ${formDescription} separate until its material and local disposal rules are confirmed.`,
      'Do not mix unknown liquids, powders, or creams with household cleaners, compost, or other products.',
      'Check the product label for hazardous-waste instructions. Empty recyclable packaging should be cleaned only if the label permits it.',
      'If there is no confirmed reuse route, use the appropriate municipal waste or take-back collection service rather than guessing.',
    ],
    module_type: 'diy',
    personalisation_note: 'WasteWise avoids inventing a reuse method when the material cannot be identified confidently.',
    source_credibility: 'Safety-first disposal guidance',
  };
};

const buildContextualSuggestion = (productName, context = {}) => {
  const name = String(productName || '').trim();
  const lower = name.toLowerCase();
  const allowDisposal = context.allowDisposal !== false && !context.pipelineMode;
  const disposalOrNull = (productForm, isFoodLike) => (
    allowDisposal ? buildSafeDisposalSuggestion(name, productForm, isFoodLike) : null
  );
  const { productForm, reuseGoal, availableItems } = normalizeQuestionnaireContext(context);
  const has = (item) => availableItems.some((availableItem) => availableItem.includes(item));
  const isTurmeric = /turmeric|haldi/.test(lower);
  const isCitrusPeel = /(orange|lemon|lime|mosambi|citrus).*(peel|rind)|(?:peel|rind).*(orange|lemon|lime|mosambi|citrus)/.test(lower);
  const isPlantScrap = /peel|rind|fruit scrap|vegetable scrap|food scrap/.test(lower);
  const isDairy = /curd|milk|yogurt|dahi|paneer|dairy/.test(lower);
  const isSpice = /turmeric|haldi|cumin|jeera|cinnamon|dalchini|chili|mirch|pepper|masala|cardamom|elaichi|clove|laung|coriander|dhaniya|ajwain|fennel|saunf|fenugreek|methi/.test(lower);
  const isContainer = /glass|jar|bottle|plastic container|plastic tub|tin|carton/.test(lower);
  const isPaper = /cardboard|paper|carton/.test(lower);
  const isFoodLike = isTurmeric || isPlantScrap || isDairy || isSpice || /food|beverage|oil|ghee|butter|coffee|tea/.test(lower);
  const isDryTurmeric = isTurmeric && ['powder', 'granules', 'whole'].includes(productForm);

  if (!name) return null;

  if (reuseGoal === 'skin_hair') {
    if (isDryTurmeric && has('honey')) {
      return {
        title: 'Patch-test turmeric and honey hand mask',
        steps: [
          'Use only dry turmeric that has no mould, moisture, off smell, or clumping. If it has any of these signs, choose responsible disposal instead.',
          'Mix 1/4 teaspoon turmeric with 1 tablespoon of fresh honey. Do not add expired curd, yogurt, milk, or other expired food.',
          'Patch test a pea-sized amount on the inner forearm and wait 24 hours. Do not use on broken skin, near the eyes, or if irritation occurs.',
          'If the patch test is clear, apply to hands or feet for 5 minutes, rinse fully, and stop if there is any discomfort or staining concern.',
        ],
        module_type: 'health',
        personalisation_note: 'This is an external-only, patch-tested use; it is not a medical treatment or food recommendation.',
        source_credibility: 'Safety-first topical guidance',
      };
    }

    return {
      title: `No topical reuse recommended for expired ${name}`,
      steps: [
        'Do not apply an expired food, dairy product, cosmetic, or unknown material to skin or hair just because it has a powder, liquid, or paste form.',
        'Avoid mixing it with honey, oils, curd, or other household items to make a face pack or hair mask.',
        'Choose a confirmed craft, packaging-reuse, or disposal option instead.',
      ],
      module_type: 'diy',
      personalisation_note: 'The item is not on a confirmed safe list for topical reuse with the available context.',
      source_credibility: 'Safety-first disposal guidance',
    };
  }

  if (reuseGoal === 'cleaning') {
    if (isCitrusPeel && has('vinegar')) {
      return {
        title: 'Citrus-peel vinegar surface cleaner',
        steps: [
          'Place 1 cup of clean, mould-free citrus peels in a glass jar and cover them with 250 ml white vinegar.',
          'Seal the jar, steep for 10 to 14 days away from sunlight, then strain out the peels.',
          'Dilute the infused vinegar 1:1 with water in a labelled spray bottle.',
          'Use on sealed countertops, tiles, and glass. Do not use on natural stone, and never mix with bleach.',
        ],
        module_type: 'diy',
        personalisation_note: 'The selected vinegar is required for this specific use; the peels alone are not treated as a cleaner.',
        source_credibility: 'Household cleaning guidance',
      };
    }

    if (isContainer) {
      return {
        title: `Clean and reuse the ${name} container`,
        steps: [
          'Empty all residue according to the product label before cleaning the container.',
          'Wash the container with warm water and dish soap, then let it dry completely with the lid off.',
          'Reuse only for non-food storage unless the container is food-safe and has no odour, damage, or residue.',
          'If it is cracked, cannot be cleaned, or held a hazardous product, use the local recycling or disposal route instead.',
        ],
        module_type: 'diy',
        personalisation_note: 'This recommendation applies to the verified container, not to the expired contents.',
        source_credibility: 'Packaging reuse guidance',
      };
    }

    if (isTurmeric) {
      return {
        title: 'Do not use turmeric powder as a cleaner',
        steps: [
          'Turmeric can stain porous surfaces, grout, fabric, and light-coloured plastics.',
          'Do not mix it with baking soda, vinegar, soap, or water as a cleaning paste.',
          'Choose the craft or responsible-disposal route instead of applying it to kitchen surfaces.',
        ],
        module_type: 'diy',
        personalisation_note: 'The selected cleaning goal is unsuitable for turmeric, so WasteWise blocks the inaccurate fallback.',
        source_credibility: 'Material-specific safety guidance',
      };
    }

    return disposalOrNull(productForm, isFoodLike);
  }

  if (reuseGoal === 'garden_plants') {
    if (isDairy) {
      return {
        title: `Do not add ${name} directly to plants`,
        steps: [
          'Do not pour expired dairy onto soil, leaves, or roots because it can smell, attract pests, and upset a small compost system.',
          'Keep the container sealed and use the local organic-waste route where available.',
          'Rinse and recycle the empty packaging only after the food residue has been handled safely.',
        ],
        module_type: 'diy',
        personalisation_note: 'The gardening goal is unsuitable for dairy, so the app provides a safe route instead of a plant-feed recipe.',
        source_credibility: 'Composting safety guidance',
      };
    }

    if (isPlantScrap || isSpice) {
      return {
        title: `Small-batch compost route for ${name}`,
        steps: [
          'Use only material with no visible mould, pests, chemical residue, or packaging mixed in.',
          'Mix 1 part of the item with 2 parts dry leaves, shredded paper, or cardboard in an active compost bin.',
          'For a dry spice such as turmeric, add no more than 1 tablespoon at a time and mix it through the browns rather than sprinkling it on a plant.',
          'Turn the compost weekly and use it only after it becomes dark, crumbly, and earthy smelling.',
        ],
        module_type: 'diy',
        personalisation_note: 'This is composting guidance, not a claim that the item is a fertilizer, pesticide, or plant treatment.',
        source_credibility: 'Composting guidance',
      };
    }

    return disposalOrNull(productForm, isFoodLike);
  }

  if (reuseGoal === 'craft_diy' || reuseGoal === 'kitchen_non_edible') {
    if (isDryTurmeric) {
      return {
        title: 'Turmeric natural-dye swatch for fabric or paper',
        steps: [
          'Use only dry, mould-free turmeric powder and keep the project non-edible.',
          'Simmer 1 tablespoon turmeric in 500 ml water for 10 minutes, then let the liquid cool and strain it.',
          'Test a small piece of white cotton or absorbent paper in the dye for 20 minutes before colouring a larger item.',
          'Rinse the test piece separately and air dry. Keep the dye away from food-preparation surfaces because it stains easily.',
        ],
        module_type: 'diy',
        personalisation_note: 'The kitchen selection is treated as non-edible reuse; expired turmeric is never recommended for cooking or drinks.',
        source_credibility: 'Traditional craft guidance',
      };
    }

    if (isPaper) {
      return {
        title: `Cardboard and paper sorting labels from ${name}`,
        steps: [
          'Remove food residue, tape, staples, and plastic film before reusing the material.',
          'Cut clean cardboard into 5 cm by 8 cm labels or dividers for a drawer, seed tray, or craft box.',
          'Write the contents on each label and keep damp or contaminated paper in the recycling or compost route instead.',
        ],
        module_type: 'diy',
        personalisation_note: 'This route uses only clean paper or cardboard material and does not reuse unknown product contents.',
        source_credibility: 'Paper reuse guidance',
      };
    }

    if (isContainer) {
      return {
        title: `Non-food organiser from ${name}`,
        steps: [
          'Empty and clean the container completely according to the original product label.',
          'Let it dry for 24 hours with the lid off so no moisture or residue remains.',
          'Label it for non-food items such as clips, screws, seeds, or craft supplies.',
          'Recycle it instead if it is damaged, has a strong odour, or cannot be cleaned safely.',
        ],
        module_type: 'diy',
        personalisation_note: 'The suggestion uses the confirmed packaging rather than guessing a use for the expired contents.',
        source_credibility: 'Packaging reuse guidance',
      };
    }

    return disposalOrNull(productForm, isFoodLike);
  }

  return disposalOrNull(productForm, isFoodLike);
};

const fastSuggestionGenerator = (component, userProfile, weather, context = {}) => {
  const productName = component.item_name || component.component_name || '';
  const lower = productName.toLowerCase();
  const type = (component.component_type || '').toLowerCase();
  const suggestions = [];
  const normalizedContext = normalizeQuestionnaireContext(context);
  const wasteCategory = normalizeWasteCategory(
    context.wasteCategory || normalizedContext.wasteCategory || context.scanType || normalizedContext.scanType || 'expired_products'
  );
  const scanCategory = String(context.scanType || normalizedContext.scanType || '').toLowerCase();

  // Dataset is merged separately in generateAllSuggestions — skip here when requested.
  if (!context.skipDataset) {
    const datasetMatches = getDatasetSuggestionsForComponent(component, wasteCategory, userProfile);
    if (datasetMatches.length > 0) {
      return datasetMatches.map((suggestion) => ({ ...suggestion, suggestion_source: 'dataset' }));
    }
  }

  const hasQuestionnaireContext = Boolean(
    normalizedContext.productForm ||
    normalizedContext.reuseGoals.length ||
    normalizedContext.availableItems.length
  );
  const isExpiredProductScan = scanCategory === 'expired_product' || scanCategory === 'expired_products';
  const likelyExpiredProduct = !context.pipelineMode && isExpiredProductScan && !isPeelOrScrapItem(productName) && (
    type.includes('expired') || type.includes('dairy') || type.includes('spice') ||
    /turmeric|haldi|curd|milk|yogurt|dahi|paneer|dairy|oil|ghee|butter|cosmetic|lotion|cream|shampoo|soap|conditioner/.test(lower)
  );

  if ((hasQuestionnaireContext && isExpiredProductScan) || likelyExpiredProduct) {
    const goalsToGenerate = normalizedContext.reuseGoals.length ? normalizedContext.reuseGoals : [''];
    const seenTitles = new Set();
    const contextualSuggestions = goalsToGenerate
      .map((reuseGoal) => buildContextualSuggestion(productName, { ...context, ...normalizedContext, reuseGoal }))
      .filter((suggestion) => suggestion && !seenTitles.has(suggestion.title) && seenTitles.add(suggestion.title));

    if (contextualSuggestions.length) {
      return contextualSuggestions.map((contextualSuggestion) => ({
        item_component_id: component.id,
        module_type: contextualSuggestion.module_type || 'diy',
        title: contextualSuggestion.title,
        steps: contextualSuggestion.steps,
        source_url: null,
        source_credibility: contextualSuggestion.source_credibility || 'Safety-first guidance',
        region_tag: userProfile.state || 'India',
        personalisation_note: contextualSuggestion.personalisation_note,
        video_url: null,
      }));
    }
  }

  // COFFEE GROUNDS / TEA LEAVES
  if (lower.includes('coffee') || lower.includes('tea')) {
    suggestions.push({
      item_component_id: component.id,
      module_type: 'diy',
      title: 'Exfoliating Coffee & Coconut Oil Body Scrub',
      steps: [
        'Combine 3 tbsp dry used coffee grounds with 2 tbsp coconut oil and 1 tbsp sugar in a small bowl.',
        'Use in shower to scrub rough heels, knees, and elbows in gentle circular motions.',
        'Caffeine in coffee grounds tightens skin appearance while oil deeply hydrates.',
        'Rinse thoroughly with warm water.'
      ],
      source_url: 'https://instagram.com',
      source_credibility: 'Viral DIY Spa Hack',
      region_tag: userProfile.state || 'India',
      personalisation_note: 'Coffee grounds provide coarse physical exfoliation while coconut oil leaves skin silky.',
      video_url: null
    });

    suggestions.push({
      item_component_id: component.id,
      module_type: 'diy',
      title: 'Fridge & Closet Odor Absorber Pouch',
      steps: [
        'Spread used coffee grounds or tea leaves on a plate and dry completely in the sun.',
        'Fill a small breathable pouch or mesh bag with the dry grounds.',
        'Place inside your refrigerator, shoe rack, or wardrobe.',
        'Coffee nitrogen compounds absorb and neutralize strong food or damp odors for up to 3 weeks.'
      ],
      source_url: 'https://pinterest.com',
      source_credibility: 'Zero-Waste Hack',
      region_tag: null,
      personalisation_note: 'Natural carbon and nitrogen in coffee bind to airborne odor molecules effectively.',
      video_url: null
    });
  }

  // EXPIRED COSMETICS / LOTIONS / SHAMPOO / SOAP
  if (lower.includes('cosmetic') || lower.includes('lotion') || lower.includes('cream') || lower.includes('shampoo') || lower.includes('soap') || lower.includes('conditioner')) {
    suggestions.push({
      item_component_id: component.id,
      module_type: 'diy',
      title: 'Leather Shoe, Belt & Bag Softening Conditioner',
      steps: [
        'Apply a small pea-sized amount of expired body lotion or hand cream to a soft cloth.',
        'Gently rub onto clean leather shoes, leather bags, or wallet surfaces.',
        'Emollients in lotion condition dry leather and prevent surface cracking.',
        'Buff dry with a microfiber cloth.'
      ],
      source_url: 'https://instagram.com',
      source_credibility: 'Fashion Maintenance Hack',
      region_tag: userProfile.state || 'India',
      personalisation_note: 'Emollients in moisturizers keep leather supple just like skin.',
      video_url: null
    });

    suggestions.push({
      item_component_id: component.id,
      module_type: 'diy',
      title: 'Shaving Gel & Hand Wash Delicates Soap',
      steps: [
        'Use expired shampoo or shower gel as a smooth shaving glide for legs or arms.',
        'Alternatively, use 1 tsp in lukewarm water to hand-wash delicate silk, woolens, or makeup brushes.',
        'Hair shampoo is formulated to clean fibers gently without stripping texture.'
      ],
      source_url: 'https://youtube.com',
      source_credibility: 'Household Hack',
      region_tag: null,
      personalisation_note: 'Shampoo surfactants are ideal for washing wool, silk, and synthetic fibers.',
      video_url: null
    });
  }

  // GLASS BOTTLES / JARS
  if (lower.includes('glass') || lower.includes('jar') || lower.includes('bottle')) {
    suggestions.push({
      item_component_id: component.id,
      module_type: 'diy',
      title: 'Money Plant & Hydroponic Herb Glass Vase',
      steps: [
        'Soak glass jar in warm soapy water for 15 minutes to peel off labels cleanly.',
        'Fill 3/4 with clean tap water and place near a bright window.',
        'Insert a cutting of money plant (Pothos), mint, or lucky bamboo.',
        'Change water every 10 days for a zero-cost green desk centerpiece.'
      ],
      source_url: 'https://pinterest.com',
      source_credibility: 'Home Decor Hack',
      region_tag: userProfile.state || 'India',
      personalisation_note: 'Upcycles durable glass containers into stylish indoor greenery planters.',
      video_url: null
    });
  }

  // PLASTIC CONTAINERS / BOTTLES / PACKAGING
  if (lower.includes('plastic') || lower.includes('container') || lower.includes('tub') || lower.includes('box') || lower.includes('packaging')) {
    suggestions.push({
      item_component_id: component.id,
      module_type: 'diy',
      title: 'Self-Watering Sub-Irrigation Planter Container',
      steps: [
        'Cut plastic bottle or container horizontally into two halves.',
        'Invert the top half into the bottom half like a funnel.',
        'Thread a cotton string through the bottle neck into the bottom reservoir filled with water.',
        'Fill top with pot soil and plant seeds — the cotton wick will auto-water soil as needed for 7 days.'
      ],
      source_url: 'https://youtube.com',
      source_credibility: 'Urban Gardening Hack',
      region_tag: userProfile.state || 'India',
      personalisation_note: 'Perfect self-watering setup when travelling or busy during summer.',
      video_url: null
    });
  }

  // CARDBOARD / PAPER
  if (lower.includes('cardboard') || lower.includes('paper') || lower.includes('carton')) {
    suggestions.push({
      item_component_id: component.id,
      module_type: 'diy',
      title: 'Garden Weed-Suppressing Sheet Mulch Layer',
      steps: [
        'Remove any plastic tape or staples from cardboard boxes.',
        'Flatten cardboard sheets and place directly over garden soil bed around plants.',
        'Cover cardboard layer with 2 inches of dry leaves, soil, or compost.',
        'Cardboard blocks sunlight to stop weeds from growing and breaks down into soil organic matter in 3 months.'
      ],
      source_url: 'https://youtube.com',
      source_credibility: 'Permaculture Hack',
      region_tag: userProfile.state || 'India',
      personalisation_note: 'Environmentally friendly weed barrier that feeds earthworms as it decomposes.',
      video_url: null
    });
  }

  // ELECTRONICS
  if (lower.includes('electronic') || lower.includes('phone') || lower.includes('laptop') || lower.includes('cable') || lower.includes('device') || lower.includes('tablet')) {
    suggestions.push({
      item_component_id: component.id,
      module_type: 'modern',
      title: 'Certified E-Waste Recycling & Scrap Buyback',
      steps: [
        'Backup and factory reset device to wipe all personal data.',
        'Remove battery if detachable (recycle separately at battery collection bin).',
        'Check services like Cashify, Karo Sambhav, or authorized local kabadiwala for cash buyback or certified recycling.',
        'Ensures gold, copper, and rare metals are recovered safely without heavy metal landfill pollution.'
      ],
      source_url: 'https://cpcb.nic.in',
      source_credibility: 'CPCB Certified Channel',
      region_tag: userProfile.state || 'India',
      personalisation_note: 'Prevents toxic lead, mercury, and cadmium from contaminating soil and water.',
      video_url: null
    });
  }

  // Context-aware safe fallback
  if (suggestions.length === 0) {
    const contextSuggestion = buildContextualSuggestion(productName, { ...context, ...normalizedContext });
    if (contextSuggestion) {
      suggestions.push({
        item_component_id: component.id,
        module_type: contextSuggestion.module_type || 'diy',
        title: contextSuggestion.title,
        steps: contextSuggestion.steps,
        source_url: null,
        source_credibility: contextSuggestion.source_credibility || 'DIY Hack',
        region_tag: userProfile.state || 'India',
        personalisation_note: contextSuggestion.personalisation_note,
        video_url: null
      });
    }
  }

  return suggestions;
};

const fastDisclaimerGenerator = (suggestionTitle, moduleType, userProfile) => {
  const disclaimers = [];
  
  if (moduleType === 'animal_feed') {
    disclaimers.push({
      who_should_not_use: 'Pet owners (dogs, cats) for certain materials',
      when_to_stop: 'If animals show signs of digestive discomfort',
      patch_test_required: false,
      medical_boundary: 'Not a substitute for veterinary advice',
      animal_safety_note: 'Always research specific safety for your animal species',
      quantity_ceiling: 'Start with small amounts and observe'
    });
  } else if (moduleType === 'traditional' || moduleType === 'health') {
    disclaimers.push({
      who_should_not_use: userProfile.is_pregnant ? 'Pregnant women should consult doctor first' : 'People with known allergies',
      when_to_stop: 'If any irritation, redness, or discomfort occurs',
      patch_test_required: true,
      medical_boundary: 'This is traditional knowledge, not medical advice',
      animal_safety_note: null,
      quantity_ceiling: 'Use sparingly for topical applications'
    });
  } else {
    disclaimers.push({
      who_should_not_use: 'Anyone with sensitivity to the material',
      when_to_stop: 'If any adverse reaction occurs',
      patch_test_required: false,
      medical_boundary: 'General reuse suggestions, not professional advice',
      animal_safety_note: 'Keep away from pets if uncertain',
      quantity_ceiling: 'Household quantities only'
    });
  }
  
  return disclaimers[0];
};

module.exports = {
  fastDecompose,
  fastSafetyCheck,
  buildContextualSuggestion,
  fastSuggestionGenerator,
  fastDisclaimerGenerator,
  getDatasetSuggestions: getDatasetSuggestionsForComponent,
  hasDatasetMatch,
  FAST_TRACK_TIMEOUT
};