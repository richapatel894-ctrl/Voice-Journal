/**
 * Emotion coordinates on the 2-D mood map (valence, arousal), matching
 * `backend/classifier.js`'s EMOTION_COORDS so existing entries and any
 * future Insights emotion map stay consistent. Used by the manual emotion
 * picker in the composer (up to 3 per entry, PRD §9); auto-tagging will
 * choose from this same set once wired up.
 */
export const EMOTION_CATALOG: Record<string, { valence: number; arousal: number }> = {
  Happy: { valence: 0.8, arousal: 0.5 },
  Excited: { valence: 0.7, arousal: 0.9 },
  Grateful: { valence: 0.7, arousal: -0.1 },
  Calm: { valence: 0.5, arousal: -0.4 },
  Confused: { valence: -0.1, arousal: 0.25 },
  Anxious: { valence: -0.5, arousal: 0.7 },
  Angry: { valence: -0.6, arousal: 0.8 },
  Sad: { valence: -0.7, arousal: -0.3 },
  Disappointed: { valence: -0.4, arousal: -0.2 },
  Tired: { valence: -0.2, arousal: -0.7 },
};

export const EMOTION_NAMES = Object.keys(EMOTION_CATALOG);
