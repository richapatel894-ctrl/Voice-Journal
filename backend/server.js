'use strict';
/*
 * server.js — the BACKEND. Uses ONLY Node's built-in modules (no npm install).
 *
 * Its job: listen for HTTP requests, route them, do the work, send responses.
 * This is what a framework like Express or FastAPI does for you — here it's
 * spelled out by hand so you can see every step. (See TECH_DESIGN.md §0–§3.)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const storage = require('./storage');
const { classifyTheme, classifyEmotion, EMOTION_COORDS } = require('./classifier');

const PORT = 5050;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

storage.ensureDirs();

// ---- tiny helpers ----------------------------------------------------------

// Send a JSON response with a status code. (Content-Type tells the browser
// how to interpret the bytes — this is a "header".)
function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

// Read the full request body into a Buffer (bodies arrive in chunks).
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Guess a Content-Type from a file extension so browsers render media right.
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.webm': 'audio/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.pdf': 'application/pdf', '.txt': 'text/plain',
};
function mimeFor(file) { return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'; }

// Serve a static frontend file (index.html, app.js, styles.css).
function serveStatic(res, file) {
  const full = path.join(FRONTEND_DIR, file);
  if (!full.startsWith(FRONTEND_DIR) || !fs.existsSync(full)) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': mimeFor(full) });
  fs.createReadStream(full).pipe(res);
}

// ---- the router ------------------------------------------------------------
// Every request lands here. We look at METHOD + PATH and decide what to do.
// This giant if/else IS what a web framework hides behind app.get()/app.post().

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean); // e.g. ['api','entries','abc']
  const method = req.method;

  try {
    // --- Frontend (static files) ---
    if (method === 'GET' && url.pathname === '/') return serveStatic(res, 'index.html');
    if (method === 'GET' && !parts.includes('api') && parts.length === 1) {
      return serveStatic(res, parts[0]); // /app.js, /styles.css
    }

    // --- API: create an entry (runs auto-categorization) ---
    // POST /api/entries   body: { kind, text }
    if (method === 'POST' && url.pathname === '/api/entries') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      const text = body.text || '';
      const { theme, confidence } = classifyTheme(text);
      const auto = classifyEmotion(text);

      // If the user picked a mood on the home screen, that wins over the
      // keyword guess (self-reported feelings beat inferred ones).
      let emotion = auto.emotion;
      let scores = auto.scores;
      if (typeof body.emotion === 'string' && EMOTION_COORDS[body.emotion]) {
        emotion = body.emotion;
        scores = EMOTION_COORDS[body.emotion];
      }

      const entry = {
        id: storage.newId(),
        kind: body.kind === 'voice' ? 'voice' : 'text',
        createdAt: new Date().toISOString(),   // auto timestamp
        text,
        theme,
        themeConfidence: confidence,
        emotion,
        emotionScores: scores,
        media: [],
        userConfirmed: false,
      };
      storage.saveEntry(entry);
      return sendJSON(res, 201, entry);
    }

    // --- API: list all entries ---
    // GET /api/entries
    if (method === 'GET' && url.pathname === '/api/entries') {
      return sendJSON(res, 200, storage.listEntries());
    }

    // --- API: single entry / update / attach media (paths with an :id) ---
    if (parts[0] === 'api' && parts[1] === 'entries' && parts[2]) {
      const id = parts[2];
      const entry = storage.getEntry(id);
      if (!entry) return sendJSON(res, 404, { error: 'entry not found' });

      // GET /api/entries/:id
      if (method === 'GET' && parts.length === 3) return sendJSON(res, 200, entry);

      // PATCH /api/entries/:id   body: { theme?, emotion?, userConfirmed? }
      if (method === 'PATCH' && parts.length === 3) {
        const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
        if (typeof body.text === 'string') entry.text = body.text;
        if (typeof body.theme === 'string') entry.theme = body.theme;
        if (typeof body.emotion === 'string') {
          entry.emotion = body.emotion;
          if (EMOTION_COORDS[body.emotion]) entry.emotionScores = EMOTION_COORDS[body.emotion];
        }
        if (typeof body.userConfirmed === 'boolean') entry.userConfirmed = body.userConfirmed;
        storage.saveEntry(entry);
        return sendJSON(res, 200, entry);
      }

      // DELETE /api/entries/:id  (soft delete → moved to data/trash/)
      if (method === 'DELETE' && parts.length === 3) {
        storage.trashEntry(id);
        return sendJSON(res, 200, { deleted: id });
      }

      // POST /api/entries/:id/media?filename=foo.webp   body: raw bytes
      if (method === 'POST' && parts[3] === 'media') {
        const raw = url.searchParams.get('filename') || 'file';
        const filename = `${id}-${raw}`;
        const buffer = await readBody(req);
        const saved = storage.saveMedia(filename, buffer);
        entry.media.push(saved);
        storage.saveEntry(entry);
        return sendJSON(res, 201, { filename: saved });
      }
    }

    // --- API: serve a media file ---
    // GET /api/media/:filename
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'media' && parts[2]) {
      const buffer = storage.readMedia(parts[2]);
      if (!buffer) return sendJSON(res, 404, { error: 'media not found' });
      res.writeHead(200, { 'Content-Type': mimeFor(parts[2]) });
      return res.end(buffer);
    }

    // --- API: aggregated emotion data for the scatterplot ---
    // GET /api/stats/emotions -> [{ emotion, count, valence, arousal }]
    if (method === 'GET' && url.pathname === '/api/stats/emotions') {
      const entries = storage.listEntries();
      const counts = {}; // emotion -> count
      for (const e of entries) {
        if (!e.emotion || e.emotion === 'Neutral') continue;
        counts[e.emotion] = (counts[e.emotion] || 0) + 1;
      }
      const stats = Object.entries(counts).map(([emotion, count]) => ({
        emotion,
        count,
        valence: (EMOTION_COORDS[emotion] || { valence: 0 }).valence,
        arousal: (EMOTION_COORDS[emotion] || { arousal: 0 }).arousal,
      }));
      return sendJSON(res, 200, stats);
    }

    // Nothing matched.
    return sendJSON(res, 404, { error: 'no route', path: url.pathname });
  } catch (err) {
    console.error('Server error:', err);
    return sendJSON(res, 500, { error: 'server error', detail: String(err) });
  }
});

server.listen(PORT, () => {
  console.log(`\n  🎙  Voice Journal running → http://localhost:${PORT}`);
  console.log(`  📁  Your data lives in     → ${storage.DATA_DIR}\n`);
});
