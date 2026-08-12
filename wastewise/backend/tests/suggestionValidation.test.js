const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRepurposingSuggestion } = require('../services/suggestionValidation');

test('accepts a specific, quantified repurposing suggestion', () => {
  const result = validateRepurposingSuggestion({
    title: 'Turn 2 tbsp of expired turmeric into a mild plant-feeding paste',
    steps: [
      'Mix 2 tbsp turmeric with 1 cup water to form a thin paste.',
      'Apply a thin coat to the soil around the base of the plant.',
      'Reapply once every 7 days and stop if the leaves brown.',
    ],
    module_type: 'diy',
  });

  assert.equal(result.isValid, true);
  assert.equal(result.reason, null);
});

test('rejects generic suggestions that lack specificity and quantity', () => {
  const result = validateRepurposingSuggestion({
    title: 'Reuse this item',
    steps: ['Use it around the home.', 'Do whatever feels useful.'],
    module_type: 'modern',
  });

  assert.equal(result.isValid, false);
  assert.match(result.reason, /specific|quantity/i);
});

test('rejects animal-feed suggestions that are too broad or unsafe', () => {
  const result = validateRepurposingSuggestion({
    title: 'Feed it to any animal',
    steps: ['Feed it to animals whenever you want.'],
    module_type: 'animal_feed',
  });

  assert.equal(result.isValid, false);
  assert.match(result.reason, /animal|safe|specific/i);
});
