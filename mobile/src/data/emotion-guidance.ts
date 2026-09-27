/**
 * Short, hand-written what/why/how guidance per emotion for the Insights
 * snapshot's actionable card (PRD §8.6). Keyword-rule-era content, like the
 * classifier — transparent and easy to edit, not LLM-generated.
 */
export type EmotionGuidance = { what: string; why: string; how: string };

export const EMOTION_GUIDANCE: Record<string, EmotionGuidance> = {
  Happy: {
    what: "You've been feeling happy.",
    why: 'Often follows a win, good company, or a moment going the way you hoped.',
    how: 'Note what led to it — it is worth repeating on purpose.',
  },
  Excited: {
    what: "You've been feeling excited.",
    why: 'Usually tied to something new or upcoming that you are looking forward to.',
    how: 'Channel the energy into starting the thing, not just anticipating it.',
  },
  Grateful: {
    what: "You've been feeling grateful.",
    why: 'Tends to show up after noticing help, kindness, or something you almost took for granted.',
    how: 'A short thank-you, even unsent, tends to make the feeling last longer.',
  },
  Calm: {
    what: "You've been feeling calm.",
    why: 'A sign your routine or environment is currently working for you.',
    how: 'Notice what is different right now, so you can return to it later.',
  },
  Confused: {
    what: "You've been feeling confused.",
    why: 'Often means you are holding more open questions than answers right now.',
    how: 'Write the actual question down — naming it is usually the first unblock.',
  },
  Anxious: {
    what: "You've been feeling anxious.",
    why: 'Usually about something uncertain or out of your control, real or anticipated.',
    how: 'Separate what you can act on today from what you are just waiting on.',
  },
  Angry: {
    what: "You've been feeling angry.",
    why: 'Often a signal that a boundary or expectation was crossed.',
    how: 'Name what specifically was crossed before deciding what, if anything, to say.',
  },
  Sad: {
    what: "You've been feeling sad.",
    why: 'Can follow a loss, a disappointment, or just a harder stretch than usual.',
    how: 'Let it be there rather than rushing past it — it tends to move faster when acknowledged.',
  },
  Disappointed: {
    what: "You've been feeling disappointed.",
    why: 'Usually means reality fell short of an expectation you were holding.',
    how: 'Check whether the expectation was realistic, or worth resetting next time.',
  },
  Tired: {
    what: "You've been feeling tired.",
    why: 'Could be physical, or from carrying something mentally for a while.',
    how: 'Rest first, then decide — tired decisions are rarely your best ones.',
  },
};
