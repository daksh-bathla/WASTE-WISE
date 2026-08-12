const { generateSpeech, formatSuggestionForVoice } = require('../services/voiceService');
const pool = require('../config/db');

const generateVoice = async (req, res) => {
  try {
    const { suggestion_id, language } = req.body;
    const userId = req.user.id;

    if (!suggestion_id) {
      return res.status(400).json({ error: 'Suggestion ID is required' });
    }

    const [sugRows] = await pool.query(
      'SELECT * FROM suggestions WHERE id = ?',
      [suggestion_id]
    );
    if (sugRows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const suggestion = sugRows[0];
    const steps = typeof suggestion.steps === 'string' ? JSON.parse(suggestion.steps || '[]') : suggestion.steps;

    const [disclaimerRows] = await pool.query(
      'SELECT * FROM disclaimers WHERE suggestion_id = ?',
      [suggestion_id]
    );
    const disclaimer = disclaimerRows[0];

    const voiceText = formatSuggestionForVoice(
      { title: suggestion.title, steps },
      disclaimer ? disclaimer.who_should_not_use : ''
    );

    const result = await generateSpeech(voiceText, language || 'en');

    if (!result) {
      return res.status(500).json({ error: 'Failed to generate voice' });
    }

    res.json({
      audio: result.audio,
      voiceName: result.voiceName,
      language: result.language,
      mimeType: result.mimeType,
      fallback: Boolean(result.fallback),
      reason: result.reason || null,
      text: voiceText,
    });
  } catch (error) {
    console.error('Voice generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate voice' });
  }
};

module.exports = { generateVoice };
