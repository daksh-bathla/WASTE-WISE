const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadDatasetPatterns,
  findSimilarDatasetEntries,
  formatDatasetExamples,
} = require('../services/datasetPatternService');
const { normaliseSynthesisSuggestions } = require('../services/suggestionModules');

test('loads the complete supplied reuse dataset and ranks exact patterns first', () => {
  assert.equal(loadDatasetPatterns().length, 77);

  const matches = findSimilarDatasetEntries(
    { component_name: 'orange peel', material: 'organic', component_type: 'organic' },
    'food_peels',
    4
  );

  assert.equal(matches.length, 4);
  assert.match(matches[0].input_keywords.join(' '), /orange peel/i);
  assert.match(formatDatasetExamples(matches), /Example 1/);
  assert.match(formatDatasetExamples(matches), /Component:/);
});

test('keeps only traceable sources and rejects unsafe or underspecified synthesis output', () => {
  const component = { id: 7, component_name: 'orange peel', material: 'organic', condition_status: 'good' };
  const result = normaliseSynthesisSuggestions({
    component_name: 'orange peel',
    suggestions: [
      {
        title: 'Orange-peel vinegar cleaner for sealed tile',
        module_type: 'diy',
        steps: [
          'Add 1 cup of dry orange peel to 250 ml vinegar so citrus oils infuse into the liquid.',
          'Store the sealed jar for 10 days so the acid extracts the peel fragrance.',
          'Mix 100 ml infusion with 100 ml water and apply it to 1 square metre of sealed tile.',
        ],
        source_url: 'https://trusted.example/orange-peel',
        source_name: 'Trusted Orange Peel Guide',
        why_now: 'The warm season helps dry the peel before it is infused.',
        personalisation: 'This uses a small batch suitable for an apartment kitchen.',
        confidence: 'high',
      },
      {
        title: 'Forged source should be removed',
        module_type: 'diy',
        steps: [
          'Mix 1 cup of orange peel with 250 ml vinegar to make an infusion.',
          'Store the jar for 10 days to extract citrus fragrance.',
          'Apply 50 ml to 1 sealed tile with a cloth to remove surface grease.',
        ],
        source_url: 'https://invented.example/not-a-source',
      },
    ],
    disclaimers: ['Never mix vinegar cleaner with bleach, and keep it away from natural stone.'],
  }, component, { city: 'Delhi', state: 'Delhi' }, [{
    title: 'Trusted Orange Peel Guide',
    url: 'https://trusted.example/orange-peel',
    content: 'Use orange peel only on sealed surfaces.',
  }]);

  assert.equal(result.length, 2);
  assert.equal(result[0].source_url, 'https://trusted.example/orange-peel');
  assert.equal(result[1].source_url, null);
  assert.equal(result[0].disclaimers.length, 1);
});

test('blocks health and body-use output for an expired component', () => {
  const result = normaliseSynthesisSuggestions({
    suggestions: [{
      title: 'Expired curd face treatment',
      module_type: 'health',
      steps: [
        'Mix 1 tablespoon expired curd with 1 teaspoon honey for a face paste.',
        'Apply the 2 teaspoon paste to facial skin for 10 minutes.',
        'Rinse with 200 ml water after the 10-minute treatment.',
      ],
    }],
    disclaimers: ['Do not use spoiled dairy on skin.'],
  }, {
    id: 8,
    component_name: 'expired curd',
    material: 'dairy',
    condition_status: 'degraded',
  }, {}, []);

  assert.deepEqual(result, []);
});
