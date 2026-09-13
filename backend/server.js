'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const os       = require('os');

const storage    = require('./storage');
const { classify, EMOTION_COORDS } = require('./classifier');
const { transcribe } = require('./transcribe');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const PORT   = process.env.PORT || 5050;

// --- Middleware --------------------------------------------------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// CORS — allows the iOS app to call this server from the same WiFi network
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// API key auth — skip for the web frontend (same-origin), enforce for /api/*
app.use('/api', (req, res, next) => {
  const key = process.env.JOURNAL_API_KEY;
  if (!key) return next(); // no key configured → open (dev mode)
  const provided = req.headers['x-api-key'];
  if (provided !== key) return res.status(401).json({ error: 'invalid api key' });
  next();
});

// --- Entries ----------------------------------------------------------------

// POST /api/entries — create a text entry
app.post('/api/entries', async (req, res) => {
  const { kind, text, emotion: bodyEmotion } = req.body;
  const result = await classify(text || '');

  if (typeof bodyEmotion === 'string' && EMOTION_COORDS[bodyEmotion]) {
    result.emotion = bodyEmotion;
    result.emotionScores = EMOTION_COORDS[bodyEmotion];
  }

  const entry = {
    id:               storage.newId(),
    kind:             kind === 'voice' ? 'voice' : 'text',
    createdAt:        new Date().toISOString(),
    text:             text || '',
    theme:            result.theme,
    themeConfidence:  result.themeConfidence,
    emotion:          result.emotion,
    emotionScores:    result.emotionScores,
    media:            [],
    userConfirmed:    false,
  };
  storage.saveEntry(entry);
  res.status(201).json(entry);
});

// POST /api/transcribe — upload audio, get transcript back, optionally auto-save
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no audio file' });

  const transcript = await transcribe(req.file.buffer, req.file.originalname || 'audio.webm');
  if (transcript === null) {
    return res.status(503).json({ error: 'transcription unavailable — set OPENAI_API_KEY' });
  }
  res.json({ transcript });
});

// GET /api/entries
app.get('/api/entries', (req, res) => {
  const { theme, emotion } = req.query;
  res.json(storage.listEntries({ theme, emotion }));
});

// GET /api/entries/:id
app.get('/api/entries/:id', (req, res) => {
  const entry = storage.getEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'not found' });
  res.json(entry);
});

// PATCH /api/entries/:id
app.patch('/api/entries/:id', (req, res) => {
  const entry = storage.getEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'not found' });

  if (typeof req.body.text  === 'string') entry.text  = req.body.text;
  if (typeof req.body.theme === 'string') entry.theme = req.body.theme;
  if (typeof req.body.emotion === 'string') {
    entry.emotion = req.body.emotion;
    entry.emotionScores = EMOTION_COORDS[req.body.emotion] || null;
  }
  if (typeof req.body.userConfirmed === 'boolean') entry.userConfirmed = req.body.userConfirmed;

  storage.saveEntry(entry);
  res.json(entry);
});

// DELETE /api/entries/:id
app.delete('/api/entries/:id', (req, res) => {
  storage.trashEntry(req.params.id);
  res.json({ deleted: req.params.id });
});

// POST /api/entries/:id/media — attach a file, or a link (JSON body { url })
app.post('/api/entries/:id/media', upload.single('file'), async (req, res) => {
  const entry = storage.getEntry(req.params.id);
  if (!entry) return res.status(404).json({ error: 'not found' });

  if (!req.file) {
    const url = req.body && req.body.url;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'no file, and no valid url' });
    }
    entry.media.push(url);
    storage.saveEntry(entry);
    return res.status(201).json({ url });
  }

  const filename = `${req.params.id}-${req.file.originalname}`;
  const saved    = storage.saveMedia(filename, req.file.buffer);
  entry.media.push(saved);
  storage.saveEntry(entry);
  res.status(201).json({ filename: saved });
});

// GET /api/media/:filename
app.get('/api/media/:filename', (req, res) => {
  const buf = storage.readMedia(req.params.filename);
  if (!buf) return res.status(404).json({ error: 'not found' });
  const ext  = path.extname(req.params.filename).toLowerCase();
  const mime = { '.webm': 'audio/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
                 '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
                 '.gif': 'image/gif', '.pdf': 'application/pdf' }[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.send(buf);
});

// GET /api/stats/emotions
app.get('/api/stats/emotions', (req, res) => {
  res.json(storage.emotionStats());
});

// GET /api/health — for iOS app to verify connectivity
app.get('/api/health', (req, res) => {
  res.json({
    status:     'ok',
    whisper:    !!process.env.OPENAI_API_KEY,
    llm:        !!process.env.OPENROUTER_API_KEY,
    llmModel:   'openai/gpt-5.6-luna (via OpenRouter)',
  });
});

// --- Start ------------------------------------------------------------------
// Bind to 0.0.0.0 so devices on the same WiFi can reach this server
app.listen(PORT, '0.0.0.0', () => {
  const ifaces = os.networkInterfaces();
  let localIP  = 'unknown';
  for (const list of Object.values(ifaces)) {
    for (const i of list) {
      if (i.family === 'IPv4' && !i.internal) { localIP = i.address; break; }
    }
  }
  console.log(`\n  🎙  Voice Journal (Phase 2)`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${localIP}:${PORT}  ← use this for iOS\n`);
  console.log(`  Whisper:    ${process.env.OPENAI_API_KEY     ? '✅ enabled' : '⚠️  not configured (set OPENAI_API_KEY)'}`);
  console.log(`  LLM tagging:${process.env.OPENROUTER_API_KEY ? '✅ gpt-5.6-luna via OpenRouter' : '⚠️  not configured (set OPENROUTER_API_KEY)'}\n`);
});
