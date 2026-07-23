'use strict';
/*
 * storage.js — the ONLY module that touches the disk.
 *
 * Everything about "where and how data is saved" lives here. The rest of the
 * app calls these functions and never thinks about files. This is the
 * "storage swap point": to move to a real database later, you rewrite THIS
 * file and nothing else. (See TECH_DESIGN.md §1, §2.)
 */

const fs = require('fs');
const path = require('path');

// Data lives in <project>/data — one level up from backend/.
const DATA_DIR = path.join(__dirname, '..', 'data');
const ENTRIES_DIR = path.join(DATA_DIR, 'entries');
const MEDIA_DIR = path.join(DATA_DIR, 'media');

// Make sure the folders exist on startup (idempotent).
function ensureDirs() {
  for (const dir of [DATA_DIR, ENTRIES_DIR, MEDIA_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Build a unique, sortable id from the current time + a little randomness.
// Example: 2026-07-23T18-04-11-123Z-a1b2
function newId() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${rand}`;
}

function entryPath(id) {
  // Guard against path traversal: only allow our own id characters.
  const safe = String(id).replace(/[^a-zA-Z0-9._-]/g, '');
  return path.join(ENTRIES_DIR, `${safe}.json`);
}

function saveEntry(entry) {
  fs.writeFileSync(entryPath(entry.id), JSON.stringify(entry, null, 2), 'utf8');
  return entry;
}

function getEntry(id) {
  const p = entryPath(id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// List ALL entries, newest first. Note: this opens every file — fine for a
// personal app, and a deliberate teaching moment about why databases index.
function listEntries() {
  if (!fs.existsSync(ENTRIES_DIR)) return [];
  return fs
    .readdirSync(ENTRIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(ENTRIES_DIR, f), 'utf8')))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// --- Media (WhatsApp-style single store) -----------------------------------
function mediaPath(filename) {
  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '');
  return path.join(MEDIA_DIR, safe);
}

function saveMedia(filename, buffer) {
  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '');
  fs.writeFileSync(mediaPath(safe), buffer);
  return safe;
}

function readMedia(filename) {
  const p = mediaPath(filename);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

module.exports = {
  DATA_DIR, ENTRIES_DIR, MEDIA_DIR,
  ensureDirs, newId,
  saveEntry, getEntry, listEntries,
  saveMedia, readMedia, mediaPath,
};
