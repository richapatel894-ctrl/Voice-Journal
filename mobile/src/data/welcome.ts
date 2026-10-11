import type { SQLiteDatabase } from 'expo-sqlite';

import { QUOTES, type Quote, type QuoteTheme, type TimeOfDay } from '@/content/quotes';
import { getSetting, setSetting } from '@/data/settings';
import { localDayString } from '@/lib/date';

/** Looks per time of day in the welcome banner (see `components/welcome/scene-data.ts`). */
export const LOOK_COUNT = 10;

/** Morning 5-11, afternoon 11-16, sunset 16-19, night otherwise (PRD §8.1). */
export function timeOfDayFor(date: Date = new Date()): TimeOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'afternoon';
  if (h >= 16 && h < 19) return 'sunset';
  return 'night';
}

export type WelcomeChoice = {
  /** "2026-10-10:sunset": the choice stays the same for the whole window, then changes. */
  window: string;
  timeOfDay: TimeOfDay;
  look: number;
  quoteId: string;
};

type Recent = { looks: Record<TimeOfDay, number[]>; quotes: string[]; themes?: QuoteTheme[] };

const KEY_CURRENT = 'welcome_current';
const KEY_RECENT = 'welcome_recent';
const RECENT_LOOKS = 4; // of 10 looks, never repeat the last 4 shown for a time of day
const RECENT_QUOTES = 60;
const RECENT_THEMES = 2; // the next quote is about something different from the last two

/** The night window runs past midnight, so after midnight it still belongs to the evening it began. */
function windowFor(now: Date, timeOfDay: TimeOfDay): string {
  const anchor = new Date(now);
  if (timeOfDay === 'night' && now.getHours() < 5) anchor.setDate(anchor.getDate() - 1);
  return `${localDayString(anchor)}:${timeOfDay}`;
}

function pickAvoiding<T>(options: T[], avoid: T[]): T {
  const fresh = options.filter((o) => !avoid.includes(o));
  const pool = fresh.length > 0 ? fresh : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function readJson<T>(db: SQLiteDatabase, key: string): Promise<T | null> {
  const raw = await getSetting(db, key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const emptyRecent = (): Recent => ({ looks: { morning: [], afternoon: [], sunset: [], night: [] }, quotes: [], themes: [] });

/** A quote not shown recently, preferring a theme that differs from the last couple shown. */
function pickQuote(timeOfDay: TimeOfDay, recent: Recent): Quote {
  const unseen = QUOTES[timeOfDay].filter((q) => !recent.quotes.includes(q.id));
  const pool = unseen.length > 0 ? unseen : QUOTES[timeOfDay];
  const lastThemes = (recent.themes ?? []).slice(-RECENT_THEMES);
  const freshTheme = pool.filter((q) => !lastThemes.includes(q.theme));
  const choices = freshTheme.length > 0 ? freshTheme : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

function remember(recent: Recent, quote: Quote): void {
  recent.quotes = [...recent.quotes, quote.id].slice(-RECENT_QUOTES);
  recent.themes = [...(recent.themes ?? []), quote.theme].slice(-RECENT_THEMES);
}

/**
 * The scene look and quote for right now. Chosen at random the first time a time-of-day window is
 * seen (avoiding recent ones), then kept in the database so reopening the app in the same window
 * shows the same thing. Everything is bundled with the app; nothing is fetched.
 */
export async function getWelcomeChoice(db: SQLiteDatabase, now: Date = new Date()): Promise<WelcomeChoice> {
  const timeOfDay = timeOfDayFor(now);
  const window = windowFor(now, timeOfDay);

  const current = await readJson<WelcomeChoice>(db, KEY_CURRENT);
  if (current && current.window === window && QUOTES[timeOfDay].some((q) => q.id === current.quoteId)) return current;

  const recent = (await readJson<Recent>(db, KEY_RECENT)) ?? emptyRecent();
  const look = pickAvoiding(
    Array.from({ length: LOOK_COUNT }, (_, i) => i),
    recent.looks[timeOfDay] ?? []
  );
  const quote = pickQuote(timeOfDay, recent);

  recent.looks[timeOfDay] = [...(recent.looks[timeOfDay] ?? []), look].slice(-RECENT_LOOKS);
  remember(recent, quote);
  const choice: WelcomeChoice = { window, timeOfDay, look, quoteId: quote.id };
  await Promise.all([setSetting(db, KEY_CURRENT, JSON.stringify(choice)), setSetting(db, KEY_RECENT, JSON.stringify(recent))]);
  return choice;
}

/** Tapping the quote: another quote for the same time of day (the look stays). */
export async function nextWelcomeQuote(db: SQLiteDatabase, choice: WelcomeChoice): Promise<WelcomeChoice> {
  const recent = (await readJson<Recent>(db, KEY_RECENT)) ?? emptyRecent();
  const quote = pickQuote(choice.timeOfDay, recent);
  remember(recent, quote);
  const next = { ...choice, quoteId: quote.id };
  await Promise.all([setSetting(db, KEY_CURRENT, JSON.stringify(next)), setSetting(db, KEY_RECENT, JSON.stringify(recent))]);
  return next;
}
