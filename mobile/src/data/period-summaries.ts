import type { SQLiteDatabase } from 'expo-sqlite';

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
