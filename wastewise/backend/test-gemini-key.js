require('dotenv').config();
const axios = require('axios');

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

axios.post(url, {
  contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
  generationConfig: { maxOutputTokens: 10 },
}, { timeout: 15000 })
  .then((res) => {
    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('GEMINI_OK:', text.trim() || JSON.stringify(res.data).slice(0, 200));
    process.exit(0);
  })
  .catch((err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message;
    console.error('GEMINI_FAIL:', status || 'no-status', msg);
    process.exit(1);
  });
