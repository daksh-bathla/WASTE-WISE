const axios = require('axios');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

const voiceMap = {
  hi: { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  en: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
  ta: { voiceId: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
  bn: { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  mr: { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  te: { voiceId: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
  kn: { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  gu: { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
};

const getVoiceConfig = (language) => voiceMap[language] || voiceMap.en;

const browserFallback = (language, reason) => ({
  audio: null,
  voiceName: 'Browser voice',
  language,
  fallback: true,
  mimeType: null,
  reason,
});

const generateSpeech = async (text, language = 'en') => {
  const voiceConfig = getVoiceConfig(language);

  if (!ELEVENLABS_API_KEY) {
    console.warn('ELEVENLABS_API_KEY not set - browser speech fallback requested');
    return browserFallback(language, 'missing_elevenlabs_key');
  }

  try {
    const response = await axios.post(
      `${ELEVENLABS_URL}/${voiceConfig.voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 60000,
      }
    );

    const audioBase64 = Buffer.from(response.data).toString('base64');
    return {
      audio: audioBase64,
      voiceName: voiceConfig.name,
      language,
      fallback: false,
      mimeType: 'audio/mpeg',
    };
  } catch (error) {
    console.error('ElevenLabs TTS error:', error.message);
    return browserFallback(language, 'elevenlabs_failed');
  }
};

const stepText = (step, index) => {
  if (typeof step === 'string') return `Step ${index + 1}: ${step}`;
  if (!step || typeof step !== 'object') return `Step ${index + 1}`;
  return `Step ${index + 1}: ${step.instruction || step.text || step.description || step.title || ''}`.trim();
};

const formatSuggestionForVoice = (suggestion, disclaimer) => {
  const steps = Array.isArray(suggestion.steps)
    ? suggestion.steps.map(stepText).filter(Boolean).join('. ')
    : suggestion.steps;

  let text = `${suggestion.title}. `;
  if (steps) text += `${steps}. `;
  if (disclaimer) text += `Safety note: ${disclaimer}. `;

  return text;
};

module.exports = { generateSpeech, formatSuggestionForVoice, getVoiceConfig };
