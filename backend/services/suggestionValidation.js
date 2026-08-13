const INVALID_PHRASES = [
  'use it around the home',
  'use it for anything',
  'do whatever feels useful',
  'useful for your home',
  'feed it to animals',
  'for your pets',
  'safe for everyone',
  'good for all',
  'just mix with water',
  'do this as needed',
  'it depends',
  'whatever',
];

const normalizeText = (value) => String(value || '').toLowerCase().trim();

const hasQuantity = (text) => /\b(\d+|one|two|three|four|five|small|moderate|few|pinch|spoon|tbsp|cup|ml|l|g|kg|piece|pieces|grams|milliliters|liters|tablespoons|teaspoons|weekly|daily|monthly|half|quarter|handful|batch)\b/i.test(text);

const hasMechanism = (text) => /because|so that|helps|prevents|binds|absorbs|reduces|increases|breaks down|creates|forms|keeps|protects|neutralizes|blocks|coats|conditions|mix|apply|coat|cover|reapply|feed|store|clean|thin|compost|decompose|repurpose|recycle|dispose|sort|rinse|separate|collect|turn|cut|add|drop|donate|check|remove|flatten|ensure|observe|assess|let|use/i.test(text);

const containsBannedPhrase = (text) => INVALID_PHRASES.some((phrase) => text.includes(phrase));

const validateRepurposingSuggestion = (suggestion) => {
  if (!suggestion || typeof suggestion !== 'object') {
    return { isValid: false, reason: 'Suggestion payload is missing.' };
  }

  const title = normalizeText(suggestion.title);
  const steps = Array.isArray(suggestion.steps) ? suggestion.steps : [];
  const stepText = steps.map(normalizeText).join(' ');

  const moduleType = normalizeText(suggestion.module_type || suggestion.moduleType || '');

  if (!title || title.length < 5) {
    return { isValid: false, reason: 'Suggestion title is too short or missing.' };
  }

  if (containsBannedPhrase(`${title} ${stepText}`)) {
    return { isValid: false, reason: 'Suggestion is too generic; add a specific action.' };
  }

  if (!steps.length || steps.every((step) => normalizeText(step).length < 5)) {
    return { isValid: false, reason: 'Suggestion needs at least one step.' };
  }

  if (suggestion.synthesis_contract && steps.some((step) => !hasQuantity(step) || !hasMechanism(step))) {
    return { isValid: false, reason: 'Each synthesis step needs a specific amount and a clear action or mechanism.' };
  }

  if (moduleType.includes('animal') || moduleType.includes('feed')) {
    return { isValid: false, reason: 'Animal-feed suggestions are disabled for this experience.' };
  }

  if (/\b(?:feed|feeding)\b[\s\S]*\b(?:cow|cattle|goat|buffalo|poultry|sheep)\b|\b(?:cow|cattle|goat|buffalo|poultry|sheep)\b[\s\S]*\b(?:feed|feeding)\b/i.test(`${title} ${stepText}`)) {
    return { isValid: false, reason: 'Animal-feeding guidance is disabled for this experience.' };
  }

  return { isValid: true, reason: null };
};

const isSpecificEnough = (suggestion) => {
  const title = normalizeText(suggestion.title);
  const steps = (suggestion.steps || []).map(normalizeText).join(' ');
  const combined = `${title} ${steps}`;

  if (!title || title.length < 20) return false;
  if (containsBannedPhrase(combined)) return false;
  if (!hasQuantity(combined)) return false;
  if (!hasMechanism(combined)) return false;
  return true;
};

module.exports = { validateRepurposingSuggestion, isSpecificEnough };
