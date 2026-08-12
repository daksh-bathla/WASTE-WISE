const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Ensure server is loaded
let serverApp;
try {
  serverApp = require('./server');
} catch (err) {
  console.error('Error importing server:', err.message);
}

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

let authToken = '';
let testScanId = null;
let testSuggestionId = null;

const results = [];

function recordResult(endpoint, method, status, passed, details = '') {
  const detailStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
  const truncatedDetail = detailStr.length > 250 ? detailStr.substring(0, 250) + '...' : detailStr;
  results.push({
    endpoint,
    method,
    status,
    passed,
    details: truncatedDetail
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${method} ${endpoint} - Status: ${status}`);
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  validateStatus: () => true
});

async function runTests() {
  console.log('Waiting 1.5 seconds for server initialization...');
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n================================');
  console.log('STARTING FULL API SUITE VERIFICATION');
  console.log('================================\n');

  // 1. Health Check
  try {
    const res = await client.get('/api/health');
    recordResult('/api/health', 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/health', 'GET', 500, false, e.message);
  }

  // 2. Auth - Signup
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  try {
    const res = await client.post('/api/auth/signup', {
      name: 'API Test User',
      email: testEmail,
      password: testPassword,
      city: 'Mumbai',
      state: 'Maharashtra'
    });
    recordResult('/api/auth/signup', 'POST', res.status, res.status === 201 || res.status === 200, res.data);
    if (res.data && res.data.token) {
      authToken = res.data.token;
    }
  } catch (e) {
    recordResult('/api/auth/signup', 'POST', 500, false, e.message);
  }

  // 3. Auth - Login
  try {
    const res = await client.post('/api/auth/login', {
      email: testEmail,
      password: testPassword
    });
    recordResult('/api/auth/login', 'POST', res.status, res.status === 200, res.data);
    if (res.data && res.data.token) {
      authToken = res.data.token;
    }
  } catch (e) {
    recordResult('/api/auth/login', 'POST', 500, false, e.message);
  }

  // 4. Auth - Forgot Password
  try {
    const res = await client.post('/api/auth/forgot-password', {
      email: testEmail
    });
    recordResult('/api/auth/forgot-password', 'POST', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/auth/forgot-password', 'POST', 500, false, e.message);
  }

  const authHeader = { headers: { Authorization: `Bearer ${authToken}` } };

  // 5. User Profile GET
  try {
    const res = await client.get('/api/user/profile', authHeader);
    recordResult('/api/user/profile', 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/user/profile', 'GET', 500, false, e.message);
  }

  // 6. User Profile PUT
  try {
    const res = await client.put('/api/user/profile', {
      name: 'API Test User Updated',
      city: 'Delhi',
      state: 'Delhi'
    }, authHeader);
    recordResult('/api/user/profile', 'PUT', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/user/profile', 'PUT', 500, false, e.message);
  }

  // 7. User Stats
  try {
    const res = await client.get('/api/user/stats', authHeader);
    recordResult('/api/user/stats', 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/user/stats', 'GET', 500, false, e.message);
  }

  // 8. Scan Analyse
  try {
    const res = await client.post('/api/scan/analyse', {
      product_name: 'Organic Milk 1L',
      expiry_date: '2026-08-20',
      category: 'Dairy'
    }, authHeader);
    recordResult('/api/scan/analyse', 'POST', res.status, res.status === 200, res.data);
    if (res.data && (res.data.scan_id || res.data.scanId || res.data.id)) {
      testScanId = res.data.scan_id || res.data.scanId || res.data.id;
    }
  } catch (e) {
    recordResult('/api/scan/analyse', 'POST', 500, false, e.message);
  }

  // 9. Scan Vision
  try {
    // 1x1 transparent PNG base64
    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await client.post('/api/scan/vision', {
      photo_data: sampleBase64,
      photo_mime: 'image/png'
    }, authHeader);
    recordResult('/api/scan/vision', 'POST', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/scan/vision', 'POST', 500, false, e.message);
  }

  // 10. Scan Recent
  try {
    const res = await client.get('/api/scan/recent', authHeader);
    recordResult('/api/scan/recent', 'GET', res.status, res.status === 200, res.data);
    if (!testScanId && Array.isArray(res.data?.scans) && res.data.scans.length > 0) {
      testScanId = res.data.scans[0].id;
    }
  } catch (e) {
    recordResult('/api/scan/recent', 'GET', 500, false, e.message);
  }

  // 11. Scan Results
  const scanIdToTest = testScanId || 1;
  try {
    const res = await client.get(`/api/scan/results/${scanIdToTest}`, authHeader);
    recordResult(`/api/scan/results/${scanIdToTest}`, 'GET', res.status, res.status === 200, res.data);
    if (res.data?.results && res.data.results.length > 0) {
      testSuggestionId = res.data.results[0].suggestion?.id;
    }
  } catch (e) {
    recordResult(`/api/scan/results/${scanIdToTest}`, 'GET', 500, false, e.message);
  }

  // 12. Scan Seasonal
  try {
    const res = await client.get('/api/scan/seasonal', authHeader);
    recordResult('/api/scan/seasonal', 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/scan/seasonal', 'GET', 500, false, e.message);
  }

  // 13. Suggestions Generate
  try {
    const res = await client.post('/api/suggestions/generate', {
      scan_id: scanIdToTest,
      selected_goals: ['all']
    }, authHeader);
    recordResult('/api/suggestions/generate', 'POST', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/suggestions/generate', 'POST', 500, false, e.message);
  }

  // 14. Suggestions E-Waste
  try {
    const res = await client.get(`/api/suggestions/ewaste/${scanIdToTest}`, authHeader);
    recordResult(`/api/suggestions/ewaste/${scanIdToTest}`, 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult(`/api/suggestions/ewaste/${scanIdToTest}`, 'GET', 500, false, e.message);
  }

  // 15. Suggestions Disposal
  try {
    const res = await client.get(`/api/suggestions/disposal/${scanIdToTest}`, authHeader);
    recordResult(`/api/suggestions/disposal/${scanIdToTest}`, 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult(`/api/suggestions/disposal/${scanIdToTest}`, 'GET', 500, false, e.message);
  }

  // 16. Scraplog Add
  try {
    const res = await client.post('/api/scraplog/add', {
      item_name: 'Whole Wheat Bread',
      item_type: 'food',
      quantity: 2,
      unit: 'slices',
      action_taken: 'repurposed'
    }, authHeader);
    recordResult('/api/scraplog/add', 'POST', res.status, res.status === 200 || res.status === 201, res.data);
  } catch (e) {
    recordResult('/api/scraplog/add', 'POST', 500, false, e.message);
  }

  // 17. Scraplog GET
  try {
    const res = await client.get('/api/scraplog/', authHeader);
    recordResult('/api/scraplog/', 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/scraplog/', 'GET', 500, false, e.message);
  }

  // 18. Scraplog Weekly
  try {
    const res = await client.get('/api/scraplog/weekly', authHeader);
    recordResult('/api/scraplog/weekly', 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/scraplog/weekly', 'GET', 500, false, e.message);
  }

  // 19. Community Rate
  const sugIdToTest = testSuggestionId || 1;
  try {
    const res = await client.post('/api/community/rate', {
      suggestion_id: sugIdToTest,
      rating: 5,
      comment: 'Great recipe idea!'
    }, authHeader);
    recordResult('/api/community/rate', 'POST', res.status, res.status === 200 || res.status === 201, res.data);
  } catch (e) {
    recordResult('/api/community/rate', 'POST', 500, false, e.message);
  }

  // 20. Community Feed
  try {
    const res = await client.get('/api/community/feed', authHeader);
    recordResult('/api/community/feed', 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/community/feed', 'GET', 500, false, e.message);
  }

  // 21. Community Trending
  try {
    const res = await client.get('/api/community/trending', authHeader);
    recordResult('/api/community/trending', 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/community/trending', 'GET', 500, false, e.message);
  }

  // 22. Community Top Cities
  try {
    const res = await client.get('/api/community/top-cities', authHeader);
    recordResult('/api/community/top-cities', 'GET', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/community/top-cities', 'GET', 500, false, e.message);
  }

  // 23. Voice Generate
  try {
    const res = await client.post('/api/voice/generate', {
      suggestion_id: sugIdToTest,
      language: 'en'
    }, authHeader);
    recordResult('/api/voice/generate', 'POST', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/voice/generate', 'POST', 500, false, e.message);
  }

  // 24. Sustainability Analyse
  try {
    const res = await client.post('/api/sustainability/analyse', {
      productData: {
        product_name: 'Organic Milk 1L',
        category: 'Dairy'
      },
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.076,
        lng: 72.8777
      }
    }, authHeader);
    recordResult('/api/sustainability/analyse', 'POST', res.status, res.status === 200, res.data);
  } catch (e) {
    recordResult('/api/sustainability/analyse', 'POST', 500, false, e.message);
  }

  console.log('\n================================');
  console.log('FINISHED TESTING ALL ENDPOINTS');
  console.log('================================\n');

  fs.writeFileSync(path.join(__dirname, 'api-test-results.json'), JSON.stringify(results, null, 2));
  process.exit(0);
}

runTests();
