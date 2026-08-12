const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const OFFLINE_DATASET_PATH = path.join(__dirname, '../../frontend/src/data/offline_suggestions.json');

let offlineCache = null;

const loadOfflineDataset = () => {
  if (offlineCache) return offlineCache;

  try {
    if (fs.existsSync(OFFLINE_DATASET_PATH)) {
      const data = fs.readFileSync(OFFLINE_DATASET_PATH, 'utf-8');
      offlineCache = JSON.parse(data);
      return offlineCache;
    }
  } catch (error) {
    console.error('Error loading offline dataset:', error.message);
  }

  offlineCache = [];
  return offlineCache;
};

const findInOfflineDataset = (itemName, inputType) => {
  const dataset = loadOfflineDataset();
  const lowerName = (itemName || '').toLowerCase();

  for (const entry of dataset) {
    const keywords = entry.input_keywords || [];
    if (keywords.some((kw) => lowerName.includes(kw.toLowerCase()))) {
      return entry;
    }
  }

  return null;
};

const callOllama = async (prompt, model = 'phi3:mini') => {
  return new Promise((resolve, reject) => {
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    exec(`ollama run ${model} "${escapedPrompt}"`, { timeout: 60000 }, (err, stdout) => {
      if (err) {
        console.error('Ollama execution error:', err.message);
        resolve(null);
        return;
      }
      resolve(stdout);
    });
  });
};

const getOfflineSuggestion = async (itemName, inputType, components) => {
  const cached = findInOfflineDataset(itemName, inputType);
  if (cached) return cached;

  const prompt = `You are a zero waste assistant for Indian households.
For the item "${itemName}" (${inputType}), provide suggestions for what to do with it.
If components are provided: ${JSON.stringify(components)}
Break it down into components and suggest uses for each.

Return JSON:
{
  "item_name": "${itemName}",
  "input_type": "${inputType}",
  "components": [
    {
      "component_name": "name",
      "suggestions": [
        {"title": "suggestion", "module_type": "traditional/modern/diy", "steps": ["step 1"]}
      ]
    }
  ],
  "disclaimers": ["general safety disclaimer"]
}

Return ONLY the JSON object.`;

  try {
    const result = await callOllama(prompt);
    if (!result) return null;

    const cleaned = result.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Offline Ollama suggestion error:', error.message);
    return null;
  }
};

module.exports = { loadOfflineDataset, findInOfflineDataset, callOllama, getOfflineSuggestion };
