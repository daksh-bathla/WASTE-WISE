/**
 * End-to-end analysis test for every scan category.
 * Run: node test-all-categories.js
 * Requires backend on http://127.0.0.1:5000
 */
const http = require('http');

const AUTH = 'Bearer wastewise_guest_test';
const HOST = '127.0.0.1';
const PORT = 5000;

const CATEGORY_CASES = [
  {
    id: 'expired_product',
    label: 'Expired product',
    payload: {
      input_type: 'expired_product',
      location_lat: 28.6139,
      location_lng: 77.209,
      product_name: 'Turmeric powder',
      category: 'Spices',
      expiry_date: '2024-01-15',
      expiry_type: 'best_before',
      ingredients: ['turmeric'],
      raw_input: JSON.stringify({
        scanType: 'expired_product',
        form: {
          itemName: 'Turmeric powder',
          category: 'Spices',
          productForm: 'Powder',
          reuseGoals: ['craft_diy'],
          expiryDate: '2024-01-15',
        },
      }),
    },
    expectProduct: /turmeric/i,
    expectSuggestions: /dye|compost|do not use|craft|reuse/i,
  },
  {
    id: 'food_peels',
    label: 'Food peels',
    payload: {
      input_type: 'food_peels',
      location_lat: 28.6139,
      location_lng: 77.209,
      product_name: 'orange peel',
      category: 'peels',
      peels: ['orange peel'],
      raw_input: JSON.stringify({ scanType: 'food_peels', form: { itemName: 'orange peel', category: 'Orange peel' } }),
    },
    expectProduct: /orange peel/i,
    expectSuggestions: /freshener|repellent|compost|scrub|security/i,
  },
  {
    id: 'waste_packaging',
    label: 'Waste packaging',
    payload: {
      input_type: 'waste_packaging',
      location_lat: 28.6139,
      location_lng: 77.209,
      product_name: 'Plastic water bottle',
      category: 'Plastic',
      packaging_materials: ['Plastic'],
      packaging_condition: 'good',
      raw_input: JSON.stringify({
        scanType: 'waste_packaging',
        form: { itemName: 'Plastic water bottle', materialType: 'Plastic', condition: 'good' },
      }),
    },
    expectProduct: /plastic|packaging|bottle/i,
    expectSuggestions: /planter|organiser|bird|reuse|recycle|bottle/i,
  },
  {
    id: 'electronics',
    label: 'Electronics',
    payload: {
      input_type: 'electronics',
      location_lat: 28.6139,
      location_lng: 77.209,
      product_name: 'Mobile phone',
      category: 'electronics',
      device_info: {
        brand: 'Samsung',
        device_category: 'Mobile phone',
        age: '3 years',
        condition: 'fair',
        issue: 'slow battery',
      },
      raw_input: JSON.stringify({
        scanType: 'electronics',
        form: {
          category: 'Mobile phone',
          brand: 'Samsung',
          age: '3 years',
          condition: 'fair',
          issue: 'slow battery',
        },
      }),
    },
    expectProduct: /mobile phone|samsung/i,
    expectSuggestions: /security camera|offline music|recycle|e-waste|repurpos/i,
  },
  {
    id: 'other',
    label: 'Other',
    payload: {
      input_type: 'other',
      location_lat: 28.6139,
      location_lng: 77.209,
      product_name: 'Wooden toy blocks',
      category: 'other',
      other_info: { materials: ['Wood'], condition: 'good' },
      materials: ['Wood'],
      condition: 'good',
      raw_input: JSON.stringify({
        scanType: 'other',
        form: { itemName: 'Wooden toy blocks', materials: ['Wood'], condition: 'good' },
      }),
    },
    expectProduct: /wooden toy|wood/i,
    expectSuggestions: /.+/,
  },
];

const request = (method, path, body) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const req = http.request({
    hostname: HOST,
    port: PORT,
    path,
    method,
    headers: {
      Authorization: AUTH,
      ...(payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      } : {}),
    },
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      let parsed = null;
      try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
      resolve({ status: res.statusCode, body: parsed });
    });
  });
  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

const runCase = async (testCase) => {
  const result = {
    category: testCase.id,
    label: testCase.label,
    analyseOk: false,
    suggestionsOk: false,
    analyseMs: 0,
    suggestionsMs: 0,
    scanId: null,
    productName: null,
    componentCount: 0,
    componentNames: [],
    suggestionsCount: 0,
    datasetCount: 0,
    aiCount: 0,
    notFoundCount: 0,
    sampleTitles: [],
    errors: [],
  };

  try {
    const t0 = Date.now();
    const analyse = await request('POST', '/api/scan/analyse', testCase.payload);
    result.analyseMs = Date.now() - t0;

    if (analyse.status !== 200) {
      result.errors.push(`Analyse HTTP ${analyse.status}: ${analyse.body?.details || analyse.body?.error || 'unknown'}`);
      return result;
    }

    result.analyseOk = true;
    result.scanId = analyse.body.scanId;
    result.productName = analyse.body.productName;
    result.componentCount = (analyse.body.components || []).length;
    result.componentNames = (analyse.body.components || []).map((c) => c.component_name);

    if (testCase.expectProduct && !testCase.expectProduct.test(result.productName || '')) {
      result.errors.push(`Product name mismatch: got "${result.productName}"`);
    }
    if (result.componentCount === 0) {
      result.errors.push('No components returned from analysis');
    }

    const t1 = Date.now();
    const suggestions = await request('POST', '/api/suggestions/generate', {
      scan_id: analyse.body.scanId,
      selected_goals: ['all'],
      contextual_answers: {},
    });
    result.suggestionsMs = Date.now() - t1;

    if (suggestions.status !== 200) {
      result.errors.push(`Suggestions HTTP ${suggestions.status}: ${suggestions.body?.message || suggestions.body?.error || 'unknown'}`);
      return result;
    }

    result.suggestionsOk = true;
    result.suggestionsCount = suggestions.body.suggestions_count || 0;
    result.datasetCount = suggestions.body.dataset_count || 0;
    result.aiCount = suggestions.body.ai_count || 0;
    result.notFoundCount = suggestions.body.not_found_count || 0;
    result.sampleTitles = (suggestions.body.suggestions || []).slice(0, 4).map((s) => s.title);

    if (result.notFoundCount > 0 && result.datasetCount === 0 && result.aiCount === 0) {
      result.errors.push('Only "Not found in dataset" suggestions returned');
    }

    const titleBlob = result.sampleTitles.join(' ');
    if (testCase.expectSuggestions && result.suggestionsCount > 0 && !testCase.expectSuggestions.test(titleBlob)) {
      result.errors.push(`Unexpected suggestion titles: ${result.sampleTitles.join(' | ')}`);
    }
  } catch (error) {
    result.errors.push(error.message);
  }

  return result;
};

(async () => {
  console.log('WasteWise — analysis test for all categories\n');
  console.log(`Backend: http://${HOST}:${PORT}\n`);

  try {
    await request('GET', '/api/scan/seasonal');
  } catch (error) {
    console.error('FAIL: Backend not reachable. Start server first (node server.js).');
    console.error(error.message);
    process.exit(1);
  }

  const results = [];
  for (const testCase of CATEGORY_CASES) {
    process.stdout.write(`Testing ${testCase.label} (${testCase.id})... `);
    const result = await runCase(testCase);
    results.push(result);
    const pass = result.analyseOk && result.suggestionsOk && result.errors.length === 0;
    console.log(pass ? 'PASS' : 'FAIL');
  }

  console.log('\n' + '='.repeat(72));
  console.log('DETAILED RESULTS');
  console.log('='.repeat(72));

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const ok = r.analyseOk && r.suggestionsOk && r.errors.length === 0;
    if (ok) passed += 1; else failed += 1;

    console.log(`\n[${ok ? 'PASS' : 'FAIL'}] ${r.label} (${r.category})`);
    console.log(`  Analyse:     ${r.analyseOk ? 'OK' : 'FAIL'} (${r.analyseMs}ms) scanId=${r.scanId}`);
    console.log(`  Product:     ${r.productName}`);
    console.log(`  Components:  ${r.componentCount} — ${r.componentNames.join(', ') || 'none'}`);
    console.log(`  Suggestions: ${r.suggestionsOk ? 'OK' : 'FAIL'} (${r.suggestionsMs}ms)`);
    console.log(`  Counts:      total=${r.suggestionsCount} dataset=${r.datasetCount} ai=${r.aiCount} not_found=${r.notFoundCount}`);
    if (r.sampleTitles.length) {
      console.log(`  Samples:     ${r.sampleTitles.join(' | ')}`);
    }
    if (r.errors.length) {
      console.log(`  Errors:`);
      r.errors.forEach((e) => console.log(`    - ${e}`));
    }
  }

  console.log('\n' + '='.repeat(72));
  console.log(`Summary: ${passed}/${results.length} categories passed, ${failed} failed`);
  console.log('='.repeat(72));

  process.exit(failed > 0 ? 1 : 0);
})();
