import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'voice-journal.db';

const DATABASE_VERSION = 1;

/**
 * Runs once via `SQLiteProvider`'s `onInit`. Uses `PRAGMA user_version` to
 * track schema version, per the expo-sqlite migration pattern, so this can
 * grow additional `if (currentDbVersion === N)` steps later without wiping
 * existing data.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = row?.user_version ?? 0;
  if (currentDbVersion >= DATABASE_VERSION) return;

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;

      CREATE TABLE entries (
        id                     TEXT PRIMARY KEY NOT NULL,
        kind                   TEXT NOT NULL CHECK (kind IN ('voice', 'text')),
        created_at             TEXT NOT NULL,
        text                   TEXT NOT NULL DEFAULT '',
        transcription_status   TEXT NOT NULL DEFAULT 'done' CHECK (transcription_status IN ('pending', 'done', 'failed')),
        tagging_status         TEXT NOT NULL DEFAULT 'pending' CHECK (tagging_status IN ('pending', 'done', 'failed')),
        tagging_model          TEXT,
        user_edited            INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_entries_created_at ON entries (created_at DESC);

      CREATE TABLE entry_tags (
        entry_id    TEXT NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
        tag         TEXT NOT NULL,
        source      TEXT NOT NULL CHECK (source IN ('auto', 'user')),
        confidence  REAL,
        PRIMARY KEY (entry_id, tag)
      );
      CREATE INDEX idx_entry_tags_tag ON entry_tags (tag);

      CREATE TABLE entry_emotions (
        entry_id  TEXT NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
        emotion   TEXT NOT NULL,
        position  INTEGER NOT NULL,
        valence   REAL NOT NULL,
        arousal   REAL NOT NULL,
        PRIMARY KEY (entry_id, emotion)
      );
      CREATE INDEX idx_entry_emotions_emotion ON entry_emotions (emotion);

      CREATE TABLE audio_recordings (
        entry_id     TEXT PRIMARY KEY NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
        file_path    TEXT NOT NULL,
        duration_ms  INTEGER NOT NULL,
        waveform     TEXT NOT NULL DEFAULT '[]'
      );

      CREATE TABLE attachments (
        id               TEXT PRIMARY KEY NOT NULL,
        entry_id         TEXT NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
        type             TEXT NOT NULL CHECK (type IN ('photo', 'video', 'file', 'link')),
        file_path        TEXT,
        thumbnail_path   TEXT,
        file_size        INTEGER,
        duration_ms      INTEGER,
        url              TEXT,
        title            TEXT,
        created_at       TEXT NOT NULL
      );
      CREATE INDEX idx_attachments_entry_id ON attachments (entry_id);

      CREATE TABLE period_summaries (
        period        TEXT PRIMARY KEY NOT NULL,
        text          TEXT NOT NULL,
        generated_at  TEXT NOT NULL
      );

      CREATE TABLE settings (
        key    TEXT PRIMARY KEY NOT NULL,
        value  TEXT NOT NULL
      );
    `);
    currentDbVersion = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${currentDbVersion}`);
}
