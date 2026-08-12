require('dotenv').config();
const axios = require('axios');

const key = process.env.GEMINI_API_KEY;
const candidates = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite-preview-06-17',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

(async () => {
  for (const model of candidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
        generationConfig: { maxOutputTokens: 10, thinkingConfig: { thinkingBudget: 0 } },
      }, { timeout: 15000 });
      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`OK ${model}: ${text.trim()}`);
      process.exit(0);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      console.log(`FAIL ${model}: ${status} ${String(msg).slice(0, 140)}`);
    }
  }
  process.exit(1);
})();
