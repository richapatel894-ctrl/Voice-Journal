import type { SQLiteDatabase } from 'expo-sqlite';

export type Streak = {
  /** Consecutive days journaled, counting back from today (or from yesterday if today has no entry yet, so the streak doesn't visibly drop to zero before midnight). */
  current: number;
  /** The longest run of consecutive days journaled, ever. */
  record: number;
  /** Local calendar-day strings ('YYYY-MM-DD') that have at least one entry. */
  daysWithEntries: Set<string>;
};

function toDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dayString: string, delta: number): string {
  const [y, m, d] = dayString.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return toDayString(date);
}

/**
 * Derived entirely from `entries.created_at` (PRD §10: streak inputs are not
 * stored separately). The day boundary is local midnight — `date(..., 'localtime')`
 * converts the stored UTC timestamp using the device's timezone.
 */
export async function computeStreak(db: SQLiteDatabase): Promise<Streak> {
  const rows = await db.getAllAsync<{ day: string }>(
    `SELECT DISTINCT date(created_at, 'localtime') as day FROM entries ORDER BY day DESC`
  );
  const days = new Set(rows.map((r) => r.day));
  if (days.size === 0) return { current: 0, record: 0, daysWithEntries: days };

  const today = toDayString(new Date());
  let cursor = days.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sortedAscending = [...days].sort();
  let record = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sortedAscending) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    record = Math.max(record, run);
    previous = day;
  }

  return { current, record, daysWithEntries: days };
}
