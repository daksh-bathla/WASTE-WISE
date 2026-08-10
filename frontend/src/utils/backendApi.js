const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const safeJsonParse = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const getStoredToken = () => localStorage.getItem('token') || null;

export const requestJson = async (path, { method = 'GET', body, auth = true, headers = {} } = {}) => {
  const requestHeaders = { ...headers };
  const token = auth ? getStoredToken() : null;

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const init = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const raw = await response.text();
  const data = raw ? safeJsonParse(raw) ?? raw : null;

  if (!response.ok) {
    const message = data && typeof data === 'object'
      ? data.error || data.message || `Request failed with ${response.status}`
      : `Request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
};

export const authApi = {
  signup: (payload) => requestJson('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => requestJson('/auth/login', { method: 'POST', body: payload, auth: false }),
  forgotPassword: (payload) => requestJson('/auth/forgot-password', { method: 'POST', body: payload, auth: false }),
};

export const userApi = {
  getProfile: () => requestJson('/user/profile'),
  updateProfile: (payload) => requestJson('/user/profile', { method: 'PUT', body: payload }),
  deleteAccount: () => requestJson('/user/account', { method: 'DELETE' }),
  getStats: () => requestJson('/user/stats'),
};

export const scanApi = {
  analyse: (payload) => requestJson('/scan/analyse', { method: 'POST', body: payload }),
  vision: (payload) => requestJson('/scan/vision', { method: 'POST', body: payload }),
  recent: (limit = 4) => requestJson(`/scan/recent?limit=${limit}`),
  results: (scanId) => requestJson(`/scan/results/${scanId}`),
  seasonal: () => requestJson('/scan/seasonal'),
};

export const suggestionsApi = {
  generate: (payload) => requestJson('/suggestions/generate', { method: 'POST', body: payload }),
  ewaste: (scanId) => requestJson(`/suggestions/ewaste/${scanId}`),
  disposal: (scanId) => requestJson(`/suggestions/disposal/${scanId}`),
};

export const sustainabilityApi = {
  analyse: (payload) => requestJson('/sustainability/analyse', { method: 'POST', body: payload }),
};

export const scrapLogApi = {
  add: (payload) => requestJson('/scraplog/add', { method: 'POST', body: payload }),
  list: (params = '') => requestJson(`/scraplog${params}`),
  weekly: () => requestJson('/scraplog/weekly'),
};

export const communityApi = {
  rate: (payload) => requestJson('/community/rate', { method: 'POST', body: payload }),
  feed: (params = '') => requestJson(`/community/feed${params}`),
  trending: () => requestJson('/community/trending'),
  topCities: () => requestJson('/community/top-cities'),
};

export const voiceApi = {
  generate: (payload) => requestJson('/voice/generate', { method: 'POST', body: payload }),
};

export const buildScanPayload = (scanType, form, profile = {}, photoFile = null) => {
  const base = {
    input_type: scanType,
    location_lat: profile.lat || profile.location_lat || 28.6139,
    location_lng: profile.lng || profile.location_lng || 77.209,
    raw_input: JSON.stringify({ scanType, form }),
  };

  let specificPayload;

  if (scanType === 'electronics') {
    specificPayload = {
      ...base,
      product_name: form.brand ? `${form.brand} ${form.category}`.trim() : form.category,
      category: 'electronics',
      device_info: {
        brand: form.brand || '',
        device_category: form.category || 'device',
        age: form.age || '',
        condition: form.condition || '',
        issue: form.issue || '',
      },
    };
  } else if (scanType === 'food_peels') {
    const peelSource = [form.itemName, form.category].filter(Boolean).join(', ');
    const peels = peelSource
      .split(/,|\band\b/i)
      .map((item) => item.trim())
      .filter(Boolean);

    specificPayload = {
      ...base,
      product_name: peelSource || 'Food scraps',
      category: 'peels',
      peels,
      quantity: form.quantity || '',
      notes: form.notes || '',
    };
  } else if (scanType === 'waste_packaging') {
    const materials = [form.materialType || form.category || form.itemName].filter(Boolean);
    specificPayload = {
      ...base,
      product_name: form.itemName || 'Packaging',
      category: form.materialType || form.category || 'packaging',
      packaging_materials: materials,
      packaging_condition: form.condition || 'good',
      hasResidue: Boolean(form.hasResidue),
      size: form.size || '',
    };
  } else if (scanType === 'other') {
    specificPayload = {
      ...base,
      product_name: form.itemName || 'Item',
      category: 'other',
      other_info: {
        materials: form.materials || [],
        condition: form.condition || '',
        age: form.age || '',
        size: form.size || '',
        originalPurpose: form.originalPurpose || '',
        disposingReasons: form.disposingReasons || [],
      },
      materials: form.materials || [],
      condition: form.condition || '',
      notes: form.notes || '',
    };
  } else {
    const ingredients = (form.ingredients || '')
      .split(/\n|,|;/)
      .map((item) => item.trim())
      .filter(Boolean);

    specificPayload = {
      ...base,
      product_name: form.itemName || form.category || 'Item',
      category: form.category || 'expired_product',
      brand: form.brand || '',
      packaging_material: form.packagingMaterial || '',
      expiry_date: form.expiryDate || null,
      expiry_type: form.expiryType || 'best_before',
      ingredients,
      quantity: form.quantity || '',
      notes: form.notes || '',
    };
  }

  if (photoFile) {
    const formData = new FormData();
    formData.append('photo', photoFile);
    Object.entries(specificPayload).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });
    return formData;
  }

  return specificPayload;
};

export const buildContextualAnswers = (profile = {}) => {
  const animals = Array.isArray(profile.animals)
    ? profile.animals.map((animal) => ({
        species: String(animal).toLowerCase(),
        weight: 50,
      }))
    : [];

  return {
    animals,
    healthConcern: profile.allergies || '',
  };
};

const titleCase = (value = '') =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const moduleColor = (moduleType) => {
  const key = String(moduleType || '').toLowerCase();
  if (key.includes('traditional')) return 'purple';
  if (key.includes('animal')) return 'green';
  if (key.includes('diy')) return 'warning';
  if (key.includes('modern')) return 'green';
  if (key.includes('religious') || key.includes('cultural')) return 'purple';
  if (key.includes('health')) return 'danger';
  return 'neutral';
};

const normalizeSteps = (steps) => {
  const parsed = Array.isArray(steps)
    ? steps
    : typeof steps === 'string'
      ? safeJsonParse(steps) || [steps]
      : [];

  return parsed.map((step, index) => {
    if (typeof step === 'string') {
      return { title: `Step ${index + 1}`, text: step };
    }

    if (step && typeof step === 'object') {
      return {
        title: step.title || step.step_title || `Step ${index + 1}`,
        text: step.text || step.instruction || step.description || String(step),
      };
    }

    return { title: `Step ${index + 1}`, text: String(step) };
  });
};

const sourceNameFromUrl = (url) => {
  if (!url) return 'WasteWise';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Source';
  }
};

export const normalizeScanResults = (payload) => {
  const results = payload?.results || [];
  const groups = new Map();

  for (const row of results) {
    const component = row.component || {};
    const suggestion = row.suggestion || {};
    const existing = groups.get(component.id) || {
      id: component.id || `${row.item?.id || 'item'}-${Math.random()}`,
      name: component.component_name || row.item?.product_name || 'Component',
      meta: [component.component_type, component.material].filter(Boolean).join(' - ') || 'Component',
      suggestions: [],
    };

    existing.suggestions.push({
      id: suggestion.id,
      title: suggestion.title,
      moduleType: titleCase(suggestion.module_type),
      tagColor: moduleColor(suggestion.module_type),
      component: component.component_name || row.item?.product_name || 'Component',
      credibility: suggestion.source_credibility || 'Community',
      sourceName: sourceNameFromUrl(suggestion.source_url),
      sourceUrl: suggestion.source_url || '#',
      rating: Number(row.communityRating?.avg_rating || 0).toFixed(1),
      tried: Number(row.communityRating?.total_tried || 0),
      personalisation: suggestion.personalisation_note || 'Personalized suggestion',
      region: suggestion.region_tag || payload?.scan?.season || 'India',
      disclaimer: {
        who: row.disclaimer?.who_should_not_use || '',
        stop: row.disclaimer?.when_to_stop || '',
        notes: row.disclaimer?.medical_boundary || row.disclaimer?.animal_safety_note || '',
        patch: Boolean(row.disclaimer?.patch_test_required),
      },
      steps: normalizeSteps(suggestion.steps),
      raw: row,
    });

    groups.set(existing.id, existing);
  }

  return {
    scan: payload?.scan || null,
    items: payload?.items || [],
    components: [...groups.values()],
    totalSuggestions: results.length,
  };
};

export const normalizeEwasteResponse = (payload) => ({
  assessment: payload?.assessment || null,
  recyclingPlatforms: payload?.recyclingPlatforms || [],
  resalePlatforms: payload?.resalePlatforms || [],
  donationPlatforms: payload?.donationPlatforms || [],
});
