require('dotenv').config();
const axios = require('axios');

const results = [];

const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'OK' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
};

const hasKey = (key) => Boolean(process.env[key] && String(process.env[key]).trim());

(async () => {
  console.log('\n=== WasteWise API Key Check ===\n');

  record('GEMINI_API_KEY configured', hasKey('GEMINI_API_KEY'));
  record('OPENROUTER_API_KEY configured', hasKey('OPENROUTER_API_KEY'));
  record('GROQ_API_KEY configured', hasKey('GROQ_API_KEY'));
  record('TAVILY_API_KEY configured', hasKey('TAVILY_API_KEY'));
  record('ELEVENLABS_API_KEY configured', hasKey('ELEVENLABS_API_KEY'));
  record('DB_HOST configured', hasKey('DB_HOST'));

  if (hasKey('GEMINI_API_KEY')) {
    const geminiModels = ['gemini-flash-latest', 'gemini-3-flash-preview', process.env.GEMINI_VISION_MODEL].filter(Boolean);
    let geminiOk = false;
    let geminiDetail = '';
    for (const model of [...new Set(geminiModels)]) {
      try {
        const res = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          { contents: [{ parts: [{ text: 'Reply with OK only' }] }] },
          {
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
            params: { key: process.env.GEMINI_API_KEY },
            timeout: 20000,
          }
        );
        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          geminiOk = true;
          geminiDetail = model;
          break;
        }
      } catch (error) {
        geminiDetail = error.response?.data?.error?.message || error.message;
      }
    }
    record('Gemini text API', geminiOk, geminiDetail);
  }

  if (hasKey('OPENROUTER_API_KEY')) {
    try {
      const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: 'Reply OK' }],
        max_tokens: 10,
      }, {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      });
      record('OpenRouter chat API', Boolean(res.data?.choices?.[0]?.message?.content));
    } catch (error) {
      record('OpenRouter chat API', false, error.response?.data?.error?.message || error.message);
    }
  }

  if (hasKey('GROQ_API_KEY')) {
    try {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Reply OK' }],
        max_tokens: 10,
      }, {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 20000,
      });
      record('Groq chat API', Boolean(res.data?.choices?.[0]?.message?.content));
    } catch (error) {
      record('Groq chat API', false, error.response?.data?.error?.message || error.message);
    }
  }

  if (hasKey('TAVILY_API_KEY')) {
    try {
      const { search } = require('./services/tavilyService');
      const res = await search('orange peel reuse', { max_results: 1 });
      record('Tavily search API', Array.isArray(res));
    } catch (error) {
      record('Tavily search API', false, error.message);
    }
  }

  try {
    const { analyzeProductImageMulti } = require('./services/visionService');
    const TINY_JPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AP//Z';
    const vision = await analyzeProductImageMulti(TINY_JPEG, 'image/jpeg');
    record('Vision multi-provider', Boolean(vision), vision?.product_name || vision?.detected_category || 'no signal');
  } catch (error) {
    record('Vision multi-provider', false, error.message);
  }

  try {
    const pool = require('./config/db');
    await pool.query('SELECT 1');
    record('Database connection', true);
  } catch (error) {
    record('Database connection', false, error.message);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log('\n=== AI CALLS PER USER SCAN (when all APIs work) ===');
  console.log('1. Image vision (if photo uploaded)     → 1 call  (Scan page only; cached for analyse)');
  console.log('2. Reuse ideas per component:');
  console.log('   - Tavily web search                   → 1 call');
  console.log('   - Gemini web search                   → 1 call');
  console.log('   - OpenRouter AI synthesis             → 1 call');
  console.log('3. Component decomposition (some types)   → 0-1 OpenRouter call');
  console.log('TOTAL for 1 item with photo: ~4-5 external AI/API calls');
  console.log('TOTAL for 1 item without photo:         ~3 external AI/API calls');
  console.log('Dataset lookup: 0 API calls (local JSON file)\n');

  console.log(`=== Summary: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
