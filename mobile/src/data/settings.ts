import type { SQLiteDatabase } from 'expo-sqlite';

/** Small key-value settings: Profile name and Appearance (PRD §8.7). */

export type AppearanceMode = 'system' | 'light' | 'dark';

const KEY_PROFILE_NAME = 'profile_name';
const KEY_APPEARANCE = 'appearance';

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES ($key, $value)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    { $key: key, $value: value }
  );
}

export const getProfileName = (db: SQLiteDatabase) => getSetting(db, KEY_PROFILE_NAME);
export const setProfileName = (db: SQLiteDatabase, name: string) =>
  setSetting(db, KEY_PROFILE_NAME, name);

export async function getAppearanceMode(db: SQLiteDatabase): Promise<AppearanceMode> {
  const value = await getSetting(db, KEY_APPEARANCE);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export const setAppearanceMode = (db: SQLiteDatabase, mode: AppearanceMode) =>
  setSetting(db, KEY_APPEARANCE, mode);
