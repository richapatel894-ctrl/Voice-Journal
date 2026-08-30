'use strict';
/*
 * classifier.js — turns entry text into a suggested THEME and EMOTION.
 *
 * This is intentionally simple: keyword matching, no machine learning.
 * It is transparent (you can read exactly why it decided something), free,
 * and instant. It is designed as a "swap point" — see TECH_DESIGN.md §4.
 * Later, the two exported functions can be reimplemented with an LLM or a
 * trained model WITHOUT changing anything else in the app, because the rest
 * of the system only depends on their input (text) and output (a label).
 */

// --- THEMES -----------------------------------------------------------------
// Each theme is a list of trigger words. We count how many appear in the text.
const THEMES = {
  Toastmasters:      ['toastmaster', 'speech', 'icebreaker', 'club', 'evaluation', 'table topics', 'podium', 'audience', 'public speaking'],
  Work:              ['work', 'meeting', 'project', 'deadline', 'boss', 'manager', 'colleague', 'office', 'launch', 'roadmap', 'stakeholder', 'sprint'],
  'Personal Growth': ['learn', 'goal', 'habit', 'growth', 'improve', 'reflect', 'discipline', 'meditat', 'read a book', 'journal'],
  Cooking:           ['cook', 'recipe', 'dinner', 'kitchen', 'bake', 'meal', 'ingredient', 'lunch', 'breakfast', 'ate'],
  Traveling:         ['travel', 'trip', 'flight', 'hotel', 'beach', 'city', 'airport', 'vacation', 'explore', 'journey'],
  Relationships:     ['friend', 'family', 'partner', 'love', 'date', 'mom', 'dad', 'sister', 'brother', 'relationship', 'wife', 'husband'],
};

// --- EMOTIONS ---------------------------------------------------------------
// Each emotion has trigger words AND a position on the 2-D "mood map"
// (valence = pleasant/unpleasant, arousal = high/low energy). See §4.
const EMOTIONS = {
  Happy:        { words: ['happy', 'great', 'joy', 'glad', 'proud', 'wonderful', 'awesome', 'cheerful'],                     valence:  0.8, arousal:  0.5 },
  Excited:      { words: ['excited', 'thrilled', 'can\'t wait', 'pumped', 'stoked', 'ecstatic', 'buzzing'],                  valence:  0.7, arousal:  0.9 },
  Grateful:     { words: ['grateful', 'thankful', 'blessed', 'appreciate', 'lucky'],                                        valence:  0.7, arousal: -0.1 },
  Calm:         { words: ['calm', 'peaceful', 'content', 'relaxed', 'satisfied', 'fine', 'okay', 'good', 'chill'],           valence:  0.5, arousal: -0.4 },
  Confused:     { words: ['confused', 'unsure', 'puzzled', 'uncertain', 'torn', 'conflicted', 'mixed up', "don't know"],     valence: -0.1, arousal:  0.25 },
  Anxious:      { words: ['anxious', 'worried', 'nervous', 'stress', 'overwhelm', 'scared', 'afraid', 'panic', 'tense'],     valence: -0.5, arousal:  0.7 },
  Angry:        { words: ['angry', 'mad', 'furious', 'annoyed', 'frustrat', 'irritat', 'rage', 'upset'],                     valence: -0.6, arousal:  0.8 },
  Sad:          { words: ['sad', 'down', 'cry', 'lonely', 'miss', 'hurt', 'lost', 'empty', 'unhappy'],                       valence: -0.7, arousal: -0.3 },
  Disappointed: { words: ['disappoint', 'let down', 'regret', 'unfortunate', 'expected more', 'failed', 'wish'],             valence: -0.4, arousal: -0.2 },
  Tired:        { words: ['tired', 'exhausted', 'drained', 'sleepy', 'burnt out', 'burned out', 'weary', 'fatigued'],        valence: -0.2, arousal: -0.7 },
};

// Count how many trigger words from `list` appear in the lowercased text.
function countHits(text, list) {
  let hits = 0;
  for (const word of list) {
    if (text.includes(word)) hits++;
  }
  return hits;
}

/**
 * classifyTheme(text) -> { theme, confidence }
 * Picks the theme with the most keyword hits. Confidence is a rough 0..1
 * signal of how sure we are (share of hits going to the winner).
 */
function classifyTheme(text) {
  const t = (text || '').toLowerCase();
  let best = { theme: 'Uncategorized', hits: 0 };
  let totalHits = 0;

  for (const [theme, words] of Object.entries(THEMES)) {
    const hits = countHits(t, words);
    totalHits += hits;
    if (hits > best.hits) best = { theme, hits };
  }

  const confidence = totalHits === 0 ? 0 : Math.min(1, best.hits / totalHits);
  return { theme: best.theme, confidence: Number(confidence.toFixed(2)) };
}

/**
 * classifyEmotion(text) -> { emotion, scores:{valence, arousal} }
 * Picks the emotion with the most keyword hits and returns its mood-map
 * coordinates (used by the visualization).
 */
function classifyEmotion(text) {
  const t = (text || '').toLowerCase();
  let best = { emotion: 'Neutral', hits: 0, valence: 0, arousal: 0 };

  for (const [emotion, def] of Object.entries(EMOTIONS)) {
    const hits = countHits(t, def.words);
    if (hits > best.hits) best = { emotion, hits, valence: def.valence, arousal: def.arousal };
  }

  return { emotion: best.emotion, scores: { valence: best.valence, arousal: best.arousal } };
}

// The canonical coordinates, exported so the stats endpoint can place ANY
// emotion on the map (even ones with zero entries yet, if we wanted to).
const EMOTION_COORDS = Object.fromEntries(
  Object.entries(EMOTIONS).map(([name, d]) => [name, { valence: d.valence, arousal: d.arousal }])
);
// Legacy alias: older entries may still use "Content" (now "Calm").
EMOTION_COORDS.Content = EMOTION_COORDS.Calm;

module.exports = { classifyTheme, classifyEmotion, EMOTION_COORDS, THEMES, EMOTIONS };
