const fs = require('fs');
const path = require('path');

const DATASET_PATH = path.join(__dirname, '../data/waste_reuse_dataset.json');
const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'used', 'old', 'empty', 'expired',
  'product', 'products', 'waste', 'material', 'packaging', 'body', 'main',
]);

const CATEGORY_ALIASES = {
  expired_product: 'expired_products',
  expired_products: 'expired_products',
  peels: 'food_peels',
  food_peels: 'food_peels',
  packaging: 'waste_packaging',
  waste_packaging: 'waste_packaging',
  electronics: 'electronics',
  electronic: 'electronics',
  other: 'other',
};

const normalizeWasteCategory = (category = '') => {
  const key = String(category || '').toLowerCase().trim();
  return CATEGORY_ALIASES[key] || key || 'expired_products';
};

let datasetCache = null;

const normalise = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const words = (value) => new Set(
  normalise(value)
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
);

const overlapScore = (left, right) => {
  const leftWords = words(left);
  const rightWords = words(right);
  let shared = 0;

  for (const word of leftWords) {
    if (rightWords.has(word)) shared += 1;
  }

  return shared;
};

const loadDatasetPatterns = () => {
  if (datasetCache) return datasetCache;

  try {
    const parsed = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'));
    datasetCache = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[DatasetPatterns] Failed to load reuse dataset:', error.message);
    datasetCache = [];
  }

  return datasetCache;
};

const scoreEntryKeywords = (entry, componentText) => {
  const input = normalise(componentText);
  const keywords = Array.isArray(entry.input_keywords) ? entry.input_keywords : [];
  const breakdownNames = (entry.component_breakdown || []).map((part) => part.component_name || '');
  const candidates = [...keywords, ...breakdownNames];
  let score = 0;

  const isPhoneItem = /\b(phone|smartphone|mobile)\b/.test(input);
  const isLaptopItem = /\b(laptop|notebook)\b/.test(input);
  const isPhoneEntry = candidates.some((c) => /\b(phone|smartphone|mobile)\b/i.test(c));
  const isLaptopEntry = candidates.some((c) => /\b(laptop|notebook)\b/i.test(c));
  if (isPhoneItem && isLaptopEntry && !isPhoneEntry) return 0;
  if (isLaptopItem && isPhoneEntry && !isLaptopEntry) return 0;

  for (const candidate of candidates) {
    const pattern = normalise(candidate);
    if (!pattern) continue;

    if (input === pattern) {
      score = Math.max(score, 100);
      continue;
    }
    if (input.includes(pattern) || pattern.includes(input)) {
      score = Math.max(score, 82);
      continue;
    }

    if (/\b(phone|smartphone|mobile)\b/.test(input) && /\b(phone|smartphone|mobile)\b/.test(pattern)) {
      score = Math.max(score, 44);
      continue;
    }

    score = Math.max(score, overlapScore(input, pattern) * 18);
  }

  return score;
};

const scoreEntry = (entry, componentText, category) => {
  const input = normalise(componentText);
  const keywords = Array.isArray(entry.input_keywords) ? entry.input_keywords : [];
  const breakdownNames = (entry.component_breakdown || []).map((part) => part.component_name || '');
  const candidates = [...keywords, ...breakdownNames];
  const normalizedCategory = normalizeWasteCategory(category);
  const entryCategory = normalizeWasteCategory(entry.category);
  let score = entryCategory === normalizedCategory ? 8 : 0;

  const isPhoneItem = /\b(phone|smartphone|mobile)\b/.test(input);
  const isLaptopItem = /\b(laptop|notebook)\b/.test(input);
  const isPhoneEntry = candidates.some((c) => /\b(phone|smartphone|mobile)\b/i.test(c));
  const isLaptopEntry = candidates.some((c) => /\b(laptop|notebook)\b/i.test(c));
  if (isPhoneItem && isLaptopEntry && !isPhoneEntry) return 0;
  if (isLaptopItem && isPhoneEntry && !isLaptopEntry) return 0;

  for (const candidate of candidates) {
    const pattern = normalise(candidate);
    if (!pattern) continue;

    if (input === pattern) {
      score = Math.max(score, 100);
      continue;
    }
    if (input.includes(pattern) || pattern.includes(input)) {
      score = Math.max(score, 82);
      continue;
    }

    if (/\b(phone|smartphone|mobile)\b/.test(input) && /\b(phone|smartphone|mobile)\b/.test(pattern)) {
      score = Math.max(score, 44);
      continue;
    }

    score = Math.max(score, overlapScore(input, pattern) * 18);
  }

  return score;
};

const MIN_DATASET_MATCH_SCORE = 26;
const MIN_CROSS_CATEGORY_SCORE = 36;

const findSimilarDatasetEntries = (component = {}, category = '', limit = 4) => {
  const componentText = [
    component.component_name,
    component.item_name,
    component.material,
    component.component_type,
  ]
    .map((part) => String(part || '').replace(/\([^)]*\)/g, ' ').replace(/\b(main body|product layer|packaging layer)\b/gi, ' '))
    .filter(Boolean)
    .join(' ');

  const ranked = loadDatasetPatterns()
    .map((entry) => ({ entry, score: scoreEntry(entry, componentText, category) }))
    .filter(({ score }) => score >= MIN_DATASET_MATCH_SCORE)
    .sort((left, right) => right.score - left.score);

  if (ranked.length > 0) {
    return ranked
      .slice(0, Math.min(Math.max(limit, 2), 4))
      .map(({ entry }) => entry);
  }

  // Cross-category fallback — only when keyword overlap is strong (2+ shared words).
  return loadDatasetPatterns()
    .map((entry) => ({ entry, score: scoreEntryKeywords(entry, componentText) }))
    .filter(({ score }) => score >= MIN_CROSS_CATEGORY_SCORE)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(Math.max(limit, 2), 4))
    .map(({ entry }) => entry);
};

const truncate = (value, maxLength) => {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const formatDatasetExamples = (entries = []) => {
  if (!entries.length) return 'No close dataset patterns were found.';

  return entries.map((entry, index) => {
    const itemNames = (entry.input_keywords || []).slice(0, 3).join(', ') || 'similar material';
    const components = (entry.component_breakdown || []).map((part) => {
      const suggestions = (part.suggestions || [])
        .filter((suggestion) => suggestion.module_type !== 'animal_feed')
        .slice(0, 3)
        .map((suggestion) => {
        const steps = (suggestion.steps || []).slice(0, 3).map((step) => `"${truncate(step, 220)}"`).join(', ');
        return `    - "${suggestion.title}" (module_type: ${suggestion.module_type || 'diy'})\n      steps: [${steps}]`;
      }).join('\n');
      return `  Component: "${part.component_name}"\n${suggestions}`;
    }).join('\n');
    const disclaimers = (entry.disclaimers || []).slice(0, 2).map((warning) => `"${truncate(warning, 240)}"`).join(', ');

    return `Example ${index + 1} — item(s): ${itemNames}\n${components}\n  disclaimers: [${disclaimers}]`;
  }).join('\n\n');
};

const getDatasetSuggestions = (component, category, userProfile = {}) => {
  const resolvedCategory = normalizeWasteCategory(category);
  let matches = findSimilarDatasetEntries(component, resolvedCategory, 3);
  if (!matches.length) {
    matches = findSimilarDatasetEntries(component, '', 3);
  }
  const suggestions = [];

  for (const entry of matches) {
    for (const part of (entry.component_breakdown || [])) {
      for (const sug of (part.suggestions || [])) {
        if (sug.module_type === 'animal_feed') continue;
        suggestions.push({
          item_component_id: component.id,
          module_type: sug.module_type || 'diy',
          title: sug.title,
          steps: sug.steps || [],
          source_url: 'Verified Waste Reuse Dataset',
          source_credibility: 'Dataset Verified',
          suggestion_source: 'dataset',
          region_tag: userProfile.state || 'India',
          personalisation_note: `Verified pattern from waste reuse dataset for ${part.component_name || component.component_name}.`,
          video_url: null,
          disclaimers: entry.disclaimers || [],
        });
      }
    }
  }

  return suggestions;
};

const hasDatasetMatch = (component, category = '') =>
  findSimilarDatasetEntries(component, normalizeWasteCategory(category), 1).length > 0;

module.exports = {
  DATASET_PATH,
  loadDatasetPatterns,
  findSimilarDatasetEntries,
  formatDatasetExamples,
  normalizeWasteCategory,
  getDatasetSuggestions,
  hasDatasetMatch,
};
