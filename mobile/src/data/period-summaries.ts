import type { SQLiteDatabase } from 'expo-sqlite';

import { callLlm } from '@/data/llm';
import type { PeriodSummary } from '@/data/types';

/** The cached LLM-written summary shown in Insights (PRD §8.6), keyed by period label. */
export async function getPeriodSummary(
  db: SQLiteDatabase,
  period: string
): Promise<PeriodSummary | null> {
  const row = await db.getFirstAsync<{ period: string; text: string; generated_at: string }>(
    'SELECT * FROM period_summaries WHERE period = ?',
    period
  );
  return row ? { period: row.period, text: row.text, generatedAt: row.generated_at } : null;
}

export async function setPeriodSummary(db: SQLiteDatabase, summary: PeriodSummary): Promise<void> {
  await db.runAsync(
    `INSERT INTO period_summaries (period, text, generated_at) VALUES ($period, $text, $generatedAt)
     ON CONFLICT (period) DO UPDATE SET text = excluded.text, generated_at = excluded.generated_at`,
    { $period: summary.period, $text: summary.text, $generatedAt: summary.generatedAt }
  );
}

/** Keeps one summary request to a sensible size: the most recent entries, each trimmed. */
const MAX_ENTRIES_IN_PROMPT = 80;
const MAX_CHARS_PER_ENTRY = 600;

type SummaryRow = { created_at: string; text: string; themes: string | null; emotions: string | null };

async function entriesForSummary(db: SQLiteDatabase, sinceDay: string | null): Promise<SummaryRow[]> {
  const dayFilter = sinceDay ? `AND date(e.created_at, 'localtime') >= ?` : '';
  const rows = await db.getAllAsync<SummaryRow>(
    `SELECT e.created_at, e.text,
       (SELECT group_concat(tag, ', ') FROM entry_tags WHERE entry_id = e.id) as themes,
       (SELECT group_concat(emotion, ', ') FROM entry_emotions WHERE entry_id = e.id) as emotions
     FROM entries e
     WHERE TRIM(e.text) != '' ${dayFilter}
     ORDER BY e.created_at DESC
     LIMIT ${MAX_ENTRIES_IN_PROMPT}`,
    sinceDay ? [sinceDay] : []
  );
  return rows.reverse(); // oldest first, so the story reads in order
}

/** True when there is no summary yet, or an entry was written after the one on file. */
export async function isSummaryStale(
  db: SQLiteDatabase,
  period: string,
  sinceDay: string | null
): Promise<boolean> {
  const [summary, latest] = await Promise.all([
    getPeriodSummary(db, period),
    db.getFirstAsync<{ latest: string | null }>(
      `SELECT MAX(created_at) as latest FROM entries e WHERE TRIM(e.text) != '' ${
        sinceDay ? `AND date(e.created_at, 'localtime') >= ?` : ''
      }`,
      sinceDay ? [sinceDay] : []
    ),
  ]);
  if (!latest?.latest) return false; // nothing to summarize
  return !summary || latest.latest > summary.generatedAt;
}

/**
 * Writes (and caches) the LLM summary for a period: what the person has been feeling, writing
 * about and thinking about (PRD §8.6). Returns null when the period has no entries with text.
 * Throws `LlmError` if the request fails, leaving any previously cached summary in place.
 */
export async function generatePeriodSummary(
  db: SQLiteDatabase,
  period: string,
  sinceDay: string | null
): Promise<PeriodSummary | null> {
  const rows = await entriesForSummary(db, sinceDay);
  if (rows.length === 0) return null;

  const entries = rows
    .map((r) => {
      const date = r.created_at.slice(0, 10);
      const meta = [r.themes && `themes: ${r.themes}`, r.emotions && `feelings: ${r.emotions}`].filter(Boolean).join('; ');
      return `[${date}${meta ? ` | ${meta}` : ''}]\n${r.text.trim().slice(0, MAX_CHARS_PER_ENTRY)}`;
    })
    .join('\n\n');

  const prompt = `You are a warm, perceptive journaling companion. Below are journal entries from one person, oldest first. Write a short summary for them, addressed to "you", in 3 to 5 sentences of plain prose (no bullet points, no headings, no markdown). Cover what they have been feeling, what they have been writing about, and what seems to be on their mind lately. Be specific to what they wrote, kind but honest, and do not give advice unless it follows clearly from the entries. Do not invent details that are not in the entries.

Entries:
${entries}`;

  const text = await callLlm({ prompt, maxTokens: 1200 });
  const summary: PeriodSummary = { period, text, generatedAt: new Date().toISOString() };
  await setPeriodSummary(db, summary);
  return summary;
}
