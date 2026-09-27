import type { SQLiteDatabase } from 'expo-sqlite';

import { localDayString } from '@/lib/date';

export type Period = '3M' | '6M' | '12M' | 'YEAR' | 'ALL';

export const PERIOD_LABELS: Record<Period, string> = {
  '3M': '3M',
  '6M': '6M',
  '12M': '12M',
  YEAR: 'Year',
  ALL: 'All',
};

/** The local calendar day a period starts on, or null for 'ALL' (no lower bound). */
export function periodStartDay(period: Period, today: Date = new Date()): string | null {
  if (period === 'ALL') return null;
  if (period === 'YEAR') return `${today.getFullYear()}-01-01`;
  const monthsBack = { '3M': 3, '6M': 6, '12M': 12 }[period];
  const start = new Date(today);
  start.setMonth(start.getMonth() - monthsBack);
  return localDayString(start);
}

type EmotionPoint = { emotion: string; count: number; valence: number; arousal: number };

/** Valence/arousal bubbles sized by count — the emotion map. */
export async function emotionMapStats(db: SQLiteDatabase, sinceDay: string | null): Promise<EmotionPoint[]> {
  const where = sinceDay ? `WHERE date(e.created_at, 'localtime') >= ?` : '';
  const params = sinceDay ? [sinceDay] : [];
  return db.getAllAsync<EmotionPoint>(
    `SELECT ee.emotion as emotion, COUNT(DISTINCT ee.entry_id) as count, AVG(ee.valence) as valence, AVG(ee.arousal) as arousal
     FROM entry_emotions ee
     JOIN entries e ON e.id = ee.entry_id
     ${where}
     GROUP BY ee.emotion
     ORDER BY count DESC`,
    params
  );
}

export type MoodPoint = { day: string; valence: number };

/** Valence per entry over the period — the mood-over-time chart. */
export async function moodOverTime(db: SQLiteDatabase, sinceDay: string | null): Promise<MoodPoint[]> {
  const where = sinceDay ? `WHERE date(e.created_at, 'localtime') >= ? AND ee.position = 0` : `WHERE ee.position = 0`;
  const params = sinceDay ? [sinceDay] : [];
  return db.getAllAsync<MoodPoint>(
    `SELECT date(e.created_at, 'localtime') as day, ee.valence as valence
     FROM entries e
     JOIN entry_emotions ee ON ee.entry_id = e.id
     ${where}
     ORDER BY e.created_at ASC`,
    params
  );
}

export type InsightsSnapshot = {
  entryCount: number;
  topTheme: string | null;
  topEmotion: string | null;
};

/** Entry count, most-written theme and most-felt emotion for the period. */
export async function insightsSnapshot(db: SQLiteDatabase, sinceDay: string | null): Promise<InsightsSnapshot> {
  const dayFilter = sinceDay ? `date(e.created_at, 'localtime') >= ?` : '1=1';
  const params = sinceDay ? [sinceDay] : [];

  const [countRow, themeRow, emotionRow] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM entries e WHERE ${dayFilter}`,
      params
    ),
    db.getFirstAsync<{ tag: string }>(
      `SELECT t.tag as tag FROM entry_tags t JOIN entries e ON e.id = t.entry_id
       WHERE ${dayFilter} GROUP BY t.tag ORDER BY COUNT(*) DESC LIMIT 1`,
      params
    ),
    db.getFirstAsync<{ emotion: string }>(
      `SELECT em.emotion as emotion FROM entry_emotions em JOIN entries e ON e.id = em.entry_id
       WHERE ${dayFilter} GROUP BY em.emotion ORDER BY COUNT(*) DESC LIMIT 1`,
      params
    ),
  ]);

  return {
    entryCount: countRow?.count ?? 0,
    topTheme: themeRow?.tag ?? null,
    topEmotion: emotionRow?.emotion ?? null,
  };
}

export type HeatmapDay = { day: string; count: number };

/** Entries per local day over the period — the journaling heatmap. */
export async function heatmapData(db: SQLiteDatabase, sinceDay: string | null): Promise<HeatmapDay[]> {
  const where = sinceDay ? `WHERE date(created_at, 'localtime') >= ?` : '';
  const params = sinceDay ? [sinceDay] : [];
  return db.getAllAsync<HeatmapDay>(
    `SELECT date(created_at, 'localtime') as day, COUNT(*) as count
     FROM entries
     ${where}
     GROUP BY day
     ORDER BY day ASC`,
    params
  );
}
