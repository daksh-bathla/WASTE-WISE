const INVALID_PHRASES = [
  'use it around the home',
  'use it for anything',
  'do whatever feels useful',
  'reuse this item',
  'useful for your home',
  'any animal',
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

const hasQuantity = (text) => /\b(\d+|one|two|three|four|five|small|moderate|few|pinch|spoon|tbsp|cup|ml|l|g|kg|piece|pieces|grams|milliliters|liters|tablespoons|teaspoons)\b/i.test(text);

const hasMechanism = (text) => /because|so that|helps|prevents|binds|absorbs|reduces|increases|breaks down|creates|forms|keeps|protects|neutralizes|blocks|coats|conditions|mix|apply|coat|cover|reapply|feed|store|clean|thin/i.test(text);

const isSpecificEnough = (suggestion) => {
  const title = normalizeText(suggestion.title);
  const steps = (suggestion.steps || []).map(normalizeText).join(' ');
  const combined = `${title} ${steps}`;

  if (!title || title.length < 20) return false;
  if (containsBannedPhrase(combined)) return false;
  if (!hasQuantity(combined)) return false;
  if (!hasMechanism(combined)) return false;
  if (/(use|reuse|repurpose|turn|make|apply|mix|feed|add|store|clean)/i.test(combined) === false) return false;
  return true;
};

const containsBannedPhrase = (text) => INVALID_PHRASES.some((phrase) => text.includes(phrase));

const validateRepurposingSuggestion = (suggestion) => {
  if (!suggestion || typeof suggestion !== 'object') {
    return { isValid: false, reason: 'Suggestion payload is missing.' };
  }

  const title = normalizeText(suggestion.title);
  const steps = Array.isArray(suggestion.steps) ? suggestion.steps : [];
  const stepText = steps.map(normalizeText).join(' ');

  const moduleType = normalizeText(suggestion.module_type || suggestion.moduleType || '');

  if (!title || title.length < 10) {
    return { isValid: false, reason: 'Suggestion title is too short or missing.' };
  }

  if (containsBannedPhrase(`${title} ${stepText}`)) {
    return { isValid: false, reason: 'Suggestion is too generic or uses banned phrasing; add a specific action and quantity.' };
  }

  if (moduleType.includes('animal') || moduleType.includes('feed')) {
    if (!/safe|small|moderate|limited|carefully|veterinary|specific|species|cattle|goat|cow|poultry|sheep|only|species-specific/i.test(`${title} ${stepText}`)) {
      return { isValid: false, reason: 'Animal-feed suggestions need a specific, safe use case and quantity.' };
    }
  }

  if (!steps.length || steps.some((step) => normalizeText(step).length < 8)) {
    return { isValid: false, reason: 'Suggestion needs at least one detailed step.' };
  }

  if (!hasQuantity(`${title} ${stepText}`)) {
    return { isValid: false, reason: 'Suggestion needs a specific quantity or amount.' };
  }

  if (!hasMechanism(`${title} ${stepText}`)) {
    return { isValid: false, reason: 'Suggestion should explain why the action works.' };
  }

  return { isValid: true, reason: null };
};

module.exports = { validateRepurposingSuggestion, isSpecificEnough };
