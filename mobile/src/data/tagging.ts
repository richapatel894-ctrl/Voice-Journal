import { EMOTION_CATALOG, EMOTION_NAMES } from '@/data/emotion-catalog';
import { MAX_EMOTIONS_PER_ENTRY } from '@/data/emotions';
import { callLlm, LLM_MODEL, LlmError } from '@/data/llm';

export const TAGGING_MODEL = LLM_MODEL;

/** The seed vocabulary for themes, so names stay consistent (PRD §9). Themes are still open-ended. */
export const THEME_CATALOG = [
  'Toastmasters',
  'Work',
  'Personal Growth',
  'Cooking',
  'Traveling',
  'Relationships',
  'Health',
  'Finance',
  'Hobbies',
];

const MAX_THEMES_PER_ENTRY = 3;
const MAX_THEME_LENGTH = 30;

export type AutoTags = {
  themes: { tag: string; confidence: number | null }[];
  emotions: { emotion: string; valence: number; arousal: number }[];
};

function buildPrompt(text: string, knownThemes: string[]): string {
  return `You are a journaling assistant. Read this journal entry and return ONLY a JSON object, with no explanation and no markdown.

Journal entry:
"""
${text}
"""

Return exactly this JSON structure:
{
  "themes": [{ "name": "<theme>", "confidence": <0.0 to 1.0> }],
  "emotions": ["<emotion>"]
}

Rules:
- "themes": 1 to ${MAX_THEMES_PER_ENTRY} short topic names (1 to 3 words, Title Case). Prefer these existing themes when they fit: ${knownThemes.join(', ')}. Only invent a new theme if none of them fit.
- "emotions": 1 to ${MAX_EMOTIONS_PER_ENTRY} emotions the writer feels, most prominent first, chosen ONLY from: ${EMOTION_NAMES.join(', ')}.`;
}

/** Title Case, trimmed, so "personal  growth" and "Personal Growth" are one theme. */
function normalizeTheme(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Checks the model's JSON: unknown emotions and junk themes are dropped, counts are capped. Exported for reasoning about edge cases. */
export function parseAutoTags(raw: unknown, knownThemes: string[]): AutoTags {
  const obj = (raw ?? {}) as { themes?: unknown; emotions?: unknown };
  const canonical = new Map(knownThemes.map((t) => [t.toLowerCase(), t]));

  const themes: AutoTags['themes'] = [];
  for (const item of Array.isArray(obj.themes) ? obj.themes : []) {
    const name = typeof item === 'string' ? item : (item as { name?: unknown })?.name;
    if (typeof name !== 'string') continue;
    const cleaned = normalizeTheme(name);
    if (!cleaned || cleaned.length > MAX_THEME_LENGTH || cleaned.toLowerCase() === 'uncategorized') continue;
    const tag = canonical.get(cleaned.toLowerCase()) ?? cleaned;
    if (themes.some((t) => t.tag === tag)) continue;
    const confidence = typeof item === 'object' ? (item as { confidence?: unknown }).confidence : undefined;
    themes.push({ tag, confidence: typeof confidence === 'number' ? Math.min(1, Math.max(0, confidence)) : null });
    if (themes.length === MAX_THEMES_PER_ENTRY) break;
  }

  const emotions: AutoTags['emotions'] = [];
  for (const item of Array.isArray(obj.emotions) ? obj.emotions : []) {
    if (typeof item !== 'string') continue;
    const match = EMOTION_NAMES.find((n) => n.toLowerCase() === item.trim().toLowerCase());
    if (!match || emotions.some((e) => e.emotion === match)) continue;
    emotions.push({ emotion: match, ...EMOTION_CATALOG[match] });
    if (emotions.length === MAX_EMOTIONS_PER_ENTRY) break;
  }
  return { themes, emotions };
}

/**
 * Asks the LLM (via OpenRouter) for themes and emotions for an entry's text. Throws on
 * network/HTTP/format failures so the caller can mark the entry `failed`.
 * `knownThemes` is the seed catalog plus themes already in use, to keep names consistent.
 */
export async function tagEntryText(text: string, knownThemes: string[]): Promise<AutoTags> {
  const content = await callLlm({ prompt: buildPrompt(text, knownThemes), json: true, maxTokens: 800 });
  try {
    // Models sometimes wrap JSON in a code fence even when told not to.
    const json = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return parseAutoTags(JSON.parse(json), knownThemes);
  } catch {
    if (__DEV__) console.warn('[tagging] Could not parse model output');
    throw new LlmError('Unreadable tagging response');
  }
}
