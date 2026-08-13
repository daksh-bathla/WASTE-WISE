const assert = require('node:assert/strict');
const {
  loadDatasetPatterns,
  findSimilarDatasetEntries,
  normalizeWasteCategory,
  getDatasetSuggestions,
} = require('./services/datasetPatternService');
const { fastSuggestionGenerator } = require('./services/fastTrackService');
const { acceptVisionResult } = require('./services/visionService');
const { normaliseSynthesisSuggestions } = require('./services/suggestionModules');

let passed = 0;
let failed = 0;

const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(`  ${error.message}`);
  }
};

test('loads 77 dataset entries', () => {
  assert.equal(loadDatasetPatterns().length, 77);
});

test('normalizes expired_product category alias', () => {
  assert.equal(normalizeWasteCategory('expired_product'), 'expired_products');
});

test('finds orange peel dataset match', () => {
  const matches = findSimilarDatasetEntries(
    { component_name: 'orange peel', material: 'organic', component_type: 'organic' },
    'food_peels',
    4
  );
  assert.ok(matches.length >= 1);
  assert.match(matches[0].input_keywords.join(' '), /orange peel/i);
});

test('dataset suggestions exclude animal feed', () => {
  const suggestions = getDatasetSuggestions(
    { id: 1, component_name: 'banana peel', material: 'organic' },
    'food_peels',
    { state: 'Delhi' }
  );
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.every((s) => s.module_type !== 'animal_feed'));
});

test('expired turmeric with cleaning goal uses dataset not unsafe cleaner', () => {
  const suggestions = fastSuggestionGenerator(
    { id: 1, component_name: 'Turmeric powder', component_type: 'expired_product' },
    { state: 'Delhi' },
    {},
    {
      productForm: 'Powder',
      reuseGoal: 'cleaning',
      reuseGoals: ['cleaning'],
      availableItems: ['Lemon / Vinegar'],
      scanType: 'expired_product',
      wasteCategory: 'expired_products',
    }
  );
  assert.ok(suggestions.length >= 1);
  assert.ok(!suggestions.some((s) => /surface cleaner|cleaning paste/i.test(s.title)));
  assert.ok(suggestions.some((s) => /wound|dye|compost|do not use turmeric/i.test(s.title)));
});

test('dataset suggestions are tagged with suggestion_source', () => {
  const suggestions = getDatasetSuggestions(
    { id: 1, component_name: 'orange peel', material: 'organic' },
    'food_peels',
    { state: 'Delhi' }
  );
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.every((s) => s.suggestion_source === 'dataset'));
});

test('finds peel dataset even when scan category differs', () => {
  const matches = findSimilarDatasetEntries(
    { component_name: 'banana peel', material: 'organic' },
    'expired_products',
    3
  );
  assert.ok(matches.length >= 1);
  assert.ok(matches.some((entry) => (entry.input_keywords || []).some((keyword) => /banana peel/i.test(keyword))));
});

test('finds packaging dataset for plastic bottle', () => {
  const suggestions = getDatasetSuggestions(
    { id: 2, component_name: 'plastic water bottle', material: 'plastic' },
    'waste_packaging',
    { state: 'Delhi' }
  );
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.every((s) => s.suggestion_source === 'dataset'));
});

test('pipeline mode blocks disposal-only fallback', () => {
  const suggestions = fastSuggestionGenerator(
    { id: 3, component_name: 'unknown powder', component_type: 'expired_product' },
    { state: 'Delhi' },
    {},
    {
      scanType: 'expired_product',
      pipelineMode: true,
      skipDataset: true,
      reuseGoals: ['cleaning'],
      productForm: 'Powder',
    }
  );
  assert.ok(!suggestions.some((s) => /safe disposal plan|sort unknown powder before disposal/i.test(s.title)));
});

test('orange peel returns dataset reuse ideas not disposal', () => {
  const suggestions = getDatasetSuggestions(
    { id: 1, component_name: 'orange peel', material: 'organic', component_type: 'organic' },
    'food_peels',
    { state: 'Delhi' }
  );
  assert.ok(suggestions.length >= 2);
  assert.ok(suggestions.some((s) => /freshener|repellent|compost|scrub/i.test(s.title)));
  assert.ok(!suggestions.some((s) => /safe disposal plan/i.test(s.title)));

  const fast = fastSuggestionGenerator(
    { id: 1, component_name: 'orange peel', component_type: 'organic' },
    { state: 'Delhi' },
    {},
    { scanType: 'food_peels', wasteCategory: 'food_peels', reuseGoals: ['disposal'] }
  );
  assert.ok(fast.some((s) => /freshener|repellent|compost|scrub/i.test(s.title)));
  assert.ok(!fast.some((s) => /safe disposal plan/i.test(s.title)));
});

test('vision accepts partial results without perfect product name', () => {
  const accepted = acceptVisionResult({
    product_name: 'unknown',
    detected_category: 'food_peels',
    category: 'peels',
    confidence_score: 72,
  });
  assert.ok(accepted);
  assert.equal(accepted.detected_category, 'food_peels');
  assert.equal(accepted.product_name, 'peels');
  assert.equal(accepted.requires_manual_review, false);
});

test('orange peels main body matches dataset', () => {
  const suggestions = getDatasetSuggestions(
    { id: 99, component_name: 'ORANGE PEELS (main body)', component_type: 'other', material: 'main body' },
    'other',
    { state: 'Delhi' }
  );
  assert.ok(suggestions.length >= 2);
  assert.ok(suggestions.some((s) => /freshener|repellent|compost|scrub/i.test(s.title)));
  assert.ok(!suggestions.some((s) => /safe disposal plan/i.test(s.title)));
});

test('phone dataset prefers smartphone patterns over laptop', () => {
  const suggestions = getDatasetSuggestions(
    { id: 1, component_name: 'Mobile phone', item_name: 'Samsung Mobile phone', material: 'Mobile phone' },
    'electronics',
    { state: 'Delhi' }
  );
  assert.ok(suggestions.length >= 2);
  assert.ok(suggestions.some((s) => /security camera|offline music|smartphone|phone/i.test(s.title)));
  assert.ok(!suggestions.some((s) => /media server|digital photo frame display/i.test(s.title)));
});

test('unknown item does not false-match dataset', () => {
  const suggestions = getDatasetSuggestions(
    { id: 1, component_name: 'Unknown titanium widget XYZ-9999', component_type: 'other', material: 'Metal' },
    'other',
    { state: 'Delhi' }
  );
  assert.equal(suggestions.length, 0);
});

test('modules load without syntax errors', () => {
  const { generateGeminiContent } = require('./services/geminiService');
  assert.equal(typeof generateGeminiContent, 'function');
  require('./services/suggestionModules');
  require('./services/analysisPipeline');
});

console.log(`\nVerification complete: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
