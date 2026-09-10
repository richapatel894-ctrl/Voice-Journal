'use strict';
const OpenAI = require('openai');

// Emotion coordinates on the 2-D mood map (valence, arousal)
const EMOTION_COORDS = {
  Happy:        { valence:  0.8, arousal:  0.5 },
  Excited:      { valence:  0.7, arousal:  0.9 },
  Grateful:     { valence:  0.7, arousal: -0.1 },
  Calm:         { valence:  0.5, arousal: -0.4 },
  Confused:     { valence: -0.1, arousal:  0.25 },
  Anxious:      { valence: -0.5, arousal:  0.7 },
  Angry:        { valence: -0.6, arousal:  0.8 },
  Sad:          { valence: -0.7, arousal: -0.3 },
  Disappointed: { valence: -0.4, arousal: -0.2 },
  Tired:        { valence: -0.2, arousal: -0.7 },
  Content:      { valence:  0.5, arousal: -0.4 }, // legacy alias
};

const VALID_EMOTIONS = Object.keys(EMOTION_COORDS);

const THEMES = [
  'Toastmasters', 'Work', 'Personal Growth', 'Cooking',
  'Traveling', 'Relationships', 'Health', 'Finance', 'Hobbies', 'Uncategorized',
];

// --- LLM-based classification via OpenRouter --------------------------------
async function classifyWithLLM(text) {
  if (!process.env.OPENROUTER_API_KEY) return null;

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey:  process.env.OPENROUTER_API_KEY,
    defaultHeaders: { 'HTTP-Referer': 'http://localhost:5050' },
  });

  const prompt = `You are a journaling assistant. Analyze this journal entry and return ONLY a JSON object — no explanation, no markdown.

Journal entry:
"""
${text}
"""

Return exactly this JSON structure:
{
  "theme": "<one of: ${THEMES.join(', ')}>",
  "themeConfidence": <0.0 to 1.0>,
  "emotion": "<one of: ${VALID_EMOTIONS.join(', ')}>",
  "summary": "<one sentence summary of the entry>"
}`;

  try {
    const response = await client.chat.completions.create({
      model: 'openai/gpt-5.6-luna',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw    = response.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);

    const theme   = THEMES.includes(parsed.theme) ? parsed.theme : 'Uncategorized';
    const emotion = VALID_EMOTIONS.includes(parsed.emotion) ? parsed.emotion : '';
    return {
      theme,
      themeConfidence: Number(parsed.themeConfidence) || 0.5,
      emotion,
      emotionScores: emotion ? EMOTION_COORDS[emotion] : null,
      summary: parsed.summary || '',
    };
  } catch {
    return null; // fall through to keyword fallback
  }
}

// --- Keyword fallback (used when Claude API key is absent or call fails) ----
const KEYWORD_THEMES = {
  Toastmasters:      ['toastmaster', 'speech', 'icebreaker', 'club', 'evaluation', 'public speaking'],
  Work:              ['work', 'meeting', 'project', 'deadline', 'boss', 'office', 'sprint'],
  'Personal Growth': ['learn', 'goal', 'habit', 'growth', 'improve', 'reflect', 'meditat'],
  Cooking:           ['cook', 'recipe', 'dinner', 'kitchen', 'bake', 'meal'],
  Traveling:         ['travel', 'trip', 'flight', 'hotel', 'beach', 'airport', 'vacation'],
  Relationships:     ['friend', 'family', 'partner', 'love', 'date', 'mom', 'dad'],
};

const KEYWORD_EMOTIONS = {
  Happy:        ['happy', 'great', 'joy', 'glad', 'proud', 'wonderful', 'awesome'],
  Excited:      ['excited', 'thrilled', 'pumped', 'ecstatic'],
  Grateful:     ['grateful', 'thankful', 'blessed', 'appreciate'],
  Calm:         ['calm', 'peaceful', 'relaxed', 'satisfied', 'content'],
  Confused:     ['confused', 'unsure', 'uncertain', 'torn'],
  Anxious:      ['anxious', 'worried', 'nervous', 'stress', 'overwhelm', 'scared'],
  Angry:        ['angry', 'mad', 'furious', 'frustrat', 'irritat'],
  Sad:          ['sad', 'down', 'cry', 'lonely', 'hurt', 'unhappy'],
  Disappointed: ['disappoint', 'let down', 'regret', 'failed'],
  Tired:        ['tired', 'exhausted', 'drained', 'burnt out'],
};

function keywordClassify(text) {
  const t = (text || '').toLowerCase();

  let bestTheme = { theme: 'Uncategorized', hits: 0 };
  let totalThemeHits = 0;
  for (const [theme, words] of Object.entries(KEYWORD_THEMES)) {
    const hits = words.filter(w => t.includes(w)).length;
    totalThemeHits += hits;
    if (hits > bestTheme.hits) bestTheme = { theme, hits };
  }

  let bestEmotion = { emotion: '', hits: 0 };
  for (const [emotion, words] of Object.entries(KEYWORD_EMOTIONS)) {
    const hits = words.filter(w => t.includes(w)).length;
    if (hits > bestEmotion.hits) bestEmotion = { emotion, hits };
  }

  return {
    theme: bestTheme.theme,
    themeConfidence: totalThemeHits === 0 ? 0 : Number(Math.min(1, bestTheme.hits / totalThemeHits).toFixed(2)),
    emotion: bestEmotion.emotion,
    emotionScores: bestEmotion.emotion ? EMOTION_COORDS[bestEmotion.emotion] : null,
    summary: '',
  };
}

// --- Public API -------------------------------------------------------------
async function classify(text) {
  const llm = await classifyWithLLM(text);
  return llm || keywordClassify(text);
}

module.exports = { classify, EMOTION_COORDS, THEMES, VALID_EMOTIONS };
