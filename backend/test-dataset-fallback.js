/**
 * Unit test: AI disabled → dataset items get dataset suggestions only;
 * unknown items get "Not found in dataset".
 * Run: node test-dataset-fallback.js
 */
process.env.DISABLE_AI_SUGGESTIONS = 'true';
process.env.USE_FAKE_DB = 'true';

const pool = require('./config/db');
const { generateAllSuggestions } = require('./services/suggestionModules');
const { loadDatasetPatterns } = require('./services/datasetPatternService');

let componentId = 1000;
const makeComponent = (name, type, material, itemName) => ({
  id: componentId++,
  component_name: name,
  component_type: type,
  material: material || name,
  item_name: itemName || name,
});

const runGeneration = async (analysisResult) => {
  const result = await generateAllSuggestions(analysisResult, ['all'], {}, pool);
  return {
    total: result.suggestions_count,
    dataset: result.dataset_count,
    ai: result.ai_count,
    notFound: result.not_found_count,
    titles: result.suggestions.map((s) => s.title),
    sources: result.suggestions.map((s) => s.suggestion_source),
  };
};

const CASES = [
  {
    name: 'Orange peel — in dataset, AI off',
    inDataset: true,
    analysis: {
      scanId: 9001,
      productName: 'orange peel',
      category: 'food_peels',
      components: [makeComponent('orange peel', 'organic', 'organic', 'orange peel')],
      safetyResults: [{ component_id: 1000, is_safe: true }],
      weather: { season: 'monsoon' },
      userProfile: { state: 'Delhi' },
      rawInput: JSON.stringify({ scanType: 'food_peels' }),
    },
  },
  {
    name: 'Mobile phone — in dataset, AI off',
    inDataset: true,
    analysis: {
      scanId: 9002,
      productName: 'Mobile phone',
      category: 'electronics',
      components: [makeComponent('device body/frame', 'electronic', 'Mobile phone', 'Mobile phone')],
      safetyResults: [{ component_id: 1001, is_safe: true }],
      weather: { season: 'monsoon' },
      userProfile: { state: 'Delhi' },
      rawInput: JSON.stringify({ scanType: 'electronics' }),
    },
  },
  {
    name: 'Plastic bottle — in dataset, AI off',
    inDataset: true,
    analysis: {
      scanId: 9003,
      productName: 'plastic water bottle',
      category: 'waste_packaging',
      components: [makeComponent('Plastic packaging', 'packaging', 'Plastic', 'plastic water bottle')],
      safetyResults: [{ component_id: 1002, is_safe: true }],
      weather: { season: 'monsoon' },
      userProfile: { state: 'Delhi' },
      rawInput: JSON.stringify({ scanType: 'waste_packaging' }),
    },
  },
  {
    name: 'Expired curd — in dataset, AI off',
    inDataset: true,
    analysis: {
      scanId: 9004,
      productName: 'expired curd',
      category: 'expired_products',
      components: [makeComponent('expired curd', 'dairy', 'dairy', 'expired curd')],
      safetyResults: [{ component_id: 1003, is_safe: true }],
      weather: { season: 'monsoon' },
      userProfile: { state: 'Delhi' },
      rawInput: JSON.stringify({ scanType: 'expired_product' }),
    },
  },
  {
    name: 'Unknown titanium widget — NOT in dataset, AI off',
    inDataset: false,
    analysis: {
      scanId: 9005,
      productName: 'Unknown titanium widget XYZ-9999',
      category: 'other',
      components: [makeComponent('Unknown titanium widget XYZ-9999', 'other', 'Metal', 'Unknown titanium widget XYZ-9999')],
      safetyResults: [{ component_id: 1004, is_safe: true }],
      weather: { season: 'monsoon' },
      userProfile: { state: 'Delhi' },
      rawInput: JSON.stringify({ scanType: 'other' }),
    },
  },
];

(async () => {
  console.log('\nAI-OFF DATASET FALLBACK TEST (direct pipeline)\n');
  console.log(`Dataset entries loaded: ${loadDatasetPatterns().length}\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of CASES) {
    const errors = [];
    let out = null;
    try {
      out = await runGeneration(testCase.analysis);

      if (testCase.inDataset) {
        if (out.dataset === 0) errors.push('dataset_count=0 (expected dataset suggestions)');
        if (out.notFound > 0) errors.push('got Not found for a dataset item');
        if (out.ai > 0) errors.push(`ai_count=${out.ai} (AI should be disabled)`);
        if (out.titles.some((t) => /not found in dataset/i.test(t))) errors.push('title contains Not found');
      } else {
        if (out.notFound === 0) errors.push('expected Not found for unknown item');
        if (out.dataset > 0) errors.push('unexpected dataset match');
      }
    } catch (error) {
      errors.push(error.message);
    }

    const ok = errors.length === 0;
    if (ok) passed += 1; else failed += 1;

    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${testCase.name}`);
    if (out) {
      console.log(`       dataset=${out.dataset} ai=${out.ai} not_found=${out.notFound}`);
      console.log(`       titles: ${out.titles.slice(0, 3).join(' | ') || 'none'}`);
    }
    errors.forEach((e) => console.log(`       ERROR: ${e}`));
  }

  console.log(`\nSummary: ${passed}/${CASES.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
