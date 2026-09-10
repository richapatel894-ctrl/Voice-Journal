'use strict';
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const DB_PATH   = path.join(DATA_DIR, 'journal.db');

fs.mkdirSync(MEDIA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id          TEXT PRIMARY KEY,
    kind        TEXT NOT NULL DEFAULT 'text',
    created_at  TEXT NOT NULL,
    text        TEXT NOT NULL DEFAULT '',
    theme       TEXT,
    theme_confidence REAL,
    emotion     TEXT,
    valence     REAL,
    arousal     REAL,
    media       TEXT NOT NULL DEFAULT '[]',
    user_confirmed INTEGER NOT NULL DEFAULT 0
  );
`);

function newId() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rand  = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${rand}`;
}

function rowToEntry(row) {
  if (!row) return null;
  return {
    id:               row.id,
    kind:             row.kind,
    createdAt:        row.created_at,
    text:             row.text,
    theme:            row.theme,
    themeConfidence:  row.theme_confidence,
    emotion:          row.emotion,
    emotionScores:    row.valence != null ? { valence: row.valence, arousal: row.arousal } : null,
    media:            JSON.parse(row.media || '[]'),
    userConfirmed:    row.user_confirmed === 1,
  };
}

const insertStmt = db.prepare(`
  INSERT INTO entries (id, kind, created_at, text, theme, theme_confidence, emotion, valence, arousal, media, user_confirmed)
  VALUES (@id, @kind, @created_at, @text, @theme, @theme_confidence, @emotion, @valence, @arousal, @media, @user_confirmed)
`);

const updateStmt = db.prepare(`
  UPDATE entries SET
    text = @text, theme = @theme, theme_confidence = @theme_confidence,
    emotion = @emotion, valence = @valence, arousal = @arousal,
    media = @media, user_confirmed = @user_confirmed
  WHERE id = @id
`);

function saveEntry(entry) {
  const row = {
    id:               entry.id,
    kind:             entry.kind,
    created_at:       entry.createdAt,
    text:             entry.text || '',
    theme:            entry.theme || null,
    theme_confidence: entry.themeConfidence ?? null,
    emotion:          entry.emotion || null,
    valence:          entry.emotionScores?.valence ?? null,
    arousal:          entry.emotionScores?.arousal ?? null,
    media:            JSON.stringify(entry.media || []),
    user_confirmed:   entry.userConfirmed ? 1 : 0,
  };
  const exists = db.prepare('SELECT id FROM entries WHERE id = ?').get(entry.id);
  if (exists) updateStmt.run(row);
  else insertStmt.run(row);
  return entry;
}

function getEntry(id) {
  return rowToEntry(db.prepare('SELECT * FROM entries WHERE id = ?').get(id));
}

function listEntries({ theme, emotion } = {}) {
  let sql = 'SELECT * FROM entries WHERE 1=1';
  const params = [];
  if (theme)   { sql += ' AND theme = ?';   params.push(theme); }
  if (emotion) { sql += ' AND emotion = ?'; params.push(emotion); }
  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params).map(rowToEntry);
}

function trashEntry(id) {
  const entry = getEntry(id);
  if (!entry) return false;
  db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  return true;
}

function emotionStats() {
  return db.prepare(`
    SELECT emotion, COUNT(*) as count, AVG(valence) as valence, AVG(arousal) as arousal
    FROM entries WHERE emotion IS NOT NULL AND emotion != 'Neutral' AND emotion != ''
    GROUP BY emotion
  `).all();
}

// --- Media -------------------------------------------------------------------
function mediaPath(filename) {
  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '');
  return path.join(MEDIA_DIR, safe);
}

function saveMedia(filename, buffer) {
  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '');
  fs.writeFileSync(path.join(MEDIA_DIR, safe), buffer);
  return safe;
}

function readMedia(filename) {
  const p = mediaPath(filename);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

module.exports = {
  DATA_DIR, MEDIA_DIR, DB_PATH,
  newId,
  saveEntry, getEntry, listEntries, trashEntry, emotionStats,
  saveMedia, readMedia, mediaPath,
};
