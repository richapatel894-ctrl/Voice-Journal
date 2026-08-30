'use strict';
/*
 * app.js — MyVoice frontend logic.
 * Draws the UI, captures the mic, talks to the backend over HTTP (fetch).
 * Holds no source of truth — the backend + files on disk do.
 */

// ---- tiny API client (each call = one HTTP round-trip) --------------------
const api = {
  async createEntry(kind, text, emotion) {
    const res = await fetch('/api/entries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, text, emotion }),
    });
    return res.json();
  },
  async listEntries() { return (await fetch('/api/entries')).json(); },
  async updateEntry(id, patch) {
    const res = await fetch(`/api/entries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return res.json();
  },
  async deleteEntry(id) {
    return (await fetch(`/api/entries/${id}`, { method: 'DELETE' })).json();
  },
  async uploadMedia(id, filename, blob) {
    const res = await fetch(`/api/entries/${id}/media?filename=${encodeURIComponent(filename)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: blob,
    });
    return res.json();
  },
  async emotionStats() { return (await fetch('/api/stats/emotions')).json(); },
};

const THEMES = ['Toastmasters', 'Work', 'Personal Growth', 'Cooking', 'Traveling', 'Relationships', 'Uncategorized'];
const EMOTIONS = ['Happy', 'Calm', 'Sad', 'Anxious', 'Angry', 'Confused', 'Disappointed', 'Neutral'];
const MOODS = [
  { emotion: 'Happy',    emoji: '😊' },
  { emotion: 'Calm',     emoji: '😌' },
  { emotion: 'Sad',      emoji: '😢' },
  { emotion: 'Anxious',  emoji: '😰' },
  { emotion: 'Angry',    emoji: '😠' },
  { emotion: 'Confused', emoji: '😕' },
];
const EMOTION_COLORS = {
  Happy: '#ffd98a', Calm: '#a8e6cf', Content: '#a8e6cf', Sad: '#a9c8ff',
  Anxious: '#d6c2ff', Angry: '#ffb3b3', Confused: '#ffc9a4', Disappointed: '#e6d5c3',
};
const EMOTION_EMOJI = {
  Happy: '😊', Calm: '😌', Content: '😌', Sad: '😢', Anxious: '😰',
  Angry: '😠', Confused: '😕', Disappointed: '😞', Neutral: '😐',
};
// Mirror of the backend mood-map coordinates (so Insights can be computed
// client-side with a date filter, without a round-trip per range change).
const EMOTION_COORDS = {
  Happy: { valence: 0.8, arousal: 0.5 }, Calm: { valence: 0.5, arousal: -0.4 },
  Content: { valence: 0.5, arousal: -0.4 }, Sad: { valence: -0.7, arousal: -0.3 },
  Anxious: { valence: -0.5, arousal: 0.7 }, Angry: { valence: -0.6, arousal: 0.8 },
  Confused: { valence: -0.1, arousal: 0.25 }, Disappointed: { valence: -0.4, arousal: -0.2 },
};

let selectedMood = null;

// ===========================================================================
// TIME-OF-DAY sky + greeting
// ===========================================================================
function setupHero() {
  const hour = new Date().getHours();
  let scene, greeting;
  if (hour >= 5 && hour < 12)       { scene = 'sunrise'; greeting = 'Good morning'; }
  else if (hour >= 12 && hour < 17) { scene = 'day';     greeting = 'Good afternoon'; }
  else if (hour >= 17 && hour < 20) { scene = 'sunset';  greeting = 'Good evening'; }
  else                              { scene = 'night';   greeting = 'Good night'; }

  document.getElementById('hero').className = `hero scene-${scene}`;
  document.getElementById('greeting').textContent = `${greeting}, Richa`;

  const stars = document.getElementById('stars');
  stars.innerHTML = '';
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() < 0.3 ? 3 : 2;
    s.style.width = s.style.height = size + 'px';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 75 + '%';
    s.style.animationDelay = (Math.random() * 2.4).toFixed(2) + 's';
    stars.appendChild(s);
  }
}

function setupMoodPicker() {
  const picker = document.getElementById('moodPicker');
  picker.innerHTML = MOODS.map((m) => `
    <button class="mood" data-mood="${m.emotion}">
      <span class="emoji">${m.emoji}</span>
      <span class="label">${m.emotion}</span>
    </button>`).join('');
  picker.querySelectorAll('.mood').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      if (selectedMood === mood) { selectedMood = null; btn.classList.remove('selected'); return; }
      selectedMood = mood;
      picker.querySelectorAll('.mood').forEach((b) => b.classList.toggle('selected', b === btn));
    });
  });
}

function resetMood() {
  selectedMood = null;
  document.querySelectorAll('.mood').forEach((b) => b.classList.remove('selected'));
}

// ===========================================================================
// tab switching
// ===========================================================================
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
    if (name === 'entries') loadEntries();
    if (name === 'media') loadMedia();
    if (name === 'insights') loadInsights();
  });
});

// ===========================================================================
// RECORDING
// ===========================================================================
let mediaRecorder = null, audioChunks = [], recognition = null, liveText = '';

const recordBtn = document.getElementById('recordBtn');
const recordHint = document.getElementById('recordHint');
const liveTranscriptEl = document.getElementById('liveTranscript');

recordBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
  else startRecording();
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => onRecordingStopped(stream);
    mediaRecorder.start();
    liveText = '';
    startSpeechRecognition();
    recordBtn.classList.add('recording');
    recordBtn.querySelector('.ico').textContent = '⏹';
    recordHint.textContent = 'Recording… tap to stop';
  } catch (err) {
    recordHint.textContent = '⚠️ Could not access microphone: ' + err.message;
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  if (recognition) recognition.stop();
  recordBtn.classList.remove('recording');
  recordBtn.querySelector('.ico').textContent = '🎙';
  recordHint.textContent = 'Saving…';
}

async function onRecordingStopped(stream) {
  stream.getTracks().forEach((t) => t.stop());
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const transcript = (liveText || liveTranscriptEl.textContent || '').trim();
  const entry = await api.createEntry('voice', transcript, selectedMood);
  await api.uploadMedia(entry.id, 'audio.webm', audioBlob);
  recordHint.textContent = 'Tap to record';
  liveTranscriptEl.textContent = '';
  resetMood();
  showSuggestion(entry);
}

function startSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { liveTranscriptEl.textContent = '(live transcription not supported in this browser)'; return; }
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onresult = (event) => {
    let text = '';
    for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
    liveText = text;
    liveTranscriptEl.textContent = text;
  };
  recognition.start();
}

// ===========================================================================
// TEXT ENTRY + attachments (Enter saves, Shift+Enter = newline)
// ===========================================================================
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const pendingEl = document.getElementById('pendingAttachments');
let pendingFiles = [];

fileInput.addEventListener('change', () => {
  pendingFiles = Array.from(fileInput.files);
  pendingEl.innerHTML = pendingFiles.map((f) => `<span class="chip">📎 ${f.name}</span>`).join('');
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTextEntry(); }
});
document.getElementById('saveTextBtn').addEventListener('click', saveTextEntry);

async function saveTextEntry() {
  const text = textInput.value.trim();
  if (!text && pendingFiles.length === 0) return;
  const entry = await api.createEntry('text', text, selectedMood);
  for (const file of pendingFiles) await api.uploadMedia(entry.id, file.name, file);
  textInput.value = '';
  pendingFiles = [];
  pendingEl.innerHTML = '';
  fileInput.value = '';
  resetMood();
  showSuggestion(entry);
}

// ===========================================================================
// SUGGESTION CARD (compact, side-by-side)
// ===========================================================================
const suggestionCard = document.getElementById('suggestionCard');
const themeSelect = document.getElementById('themeSelect');
const emotionSelect = document.getElementById('emotionSelect');
let currentEntryId = null;

function fillSelect(select, options, selected) {
  select.innerHTML = options.map((o) => `<option value="${o}" ${o === selected ? 'selected' : ''}>${o}</option>`).join('');
}
function showSuggestion(entry) {
  currentEntryId = entry.id;
  fillSelect(themeSelect, THEMES, entry.theme);
  fillSelect(emotionSelect, EMOTIONS, entry.emotion);
  suggestionCard.classList.remove('hidden');
}
themeSelect.addEventListener('change', () => api.updateEntry(currentEntryId, { theme: themeSelect.value }));
emotionSelect.addEventListener('change', () => api.updateEntry(currentEntryId, { emotion: emotionSelect.value }));
document.getElementById('confirmBtn').addEventListener('click', async () => {
  await api.updateEntry(currentEntryId, { theme: themeSelect.value, emotion: emotionSelect.value, userConfirmed: true });
  suggestionCard.classList.add('hidden');
});

// ===========================================================================
// ENTRIES — filter, sort, edit, delete
// ===========================================================================
const filterTheme = document.getElementById('filterTheme');
const filterEmotion = document.getElementById('filterEmotion');
const sortBy = document.getElementById('sortBy');
filterTheme.innerHTML = '<option value="">All themes</option>' + THEMES.map((t) => `<option value="${t}">${t}</option>`).join('');
filterEmotion.innerHTML = '<option value="">All emotions</option>' + EMOTIONS.map((e) => `<option value="${e}">${e}</option>`).join('');
[filterTheme, filterEmotion, sortBy].forEach((el) => el.addEventListener('change', renderEntries));

function fmtDate(iso) { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
function escapeHTML(s) { return (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function mediaHTML(entry) {
  if (!entry.media || entry.media.length === 0) return '';
  const items = entry.media.map((name) => {
    const url = `/api/media/${encodeURIComponent(name)}`;
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return `<img src="${url}" alt="attachment" />`;
    if (/\.(webm|mp3|wav)$/i.test(name)) return `<audio controls src="${url}"></audio>`;
    return `<a href="${url}" target="_blank">📎 ${name}</a>`;
  });
  return `<div class="entry-media">${items.join('')}</div>`;
}

// Read-only card (no voice/text tag; audio strip kept for voice entries)
function entryCardHTML(entry, withActions = true) {
  const actions = withActions ? `
    <div class="entry-actions">
      <button class="icon-btn edit" data-action="edit">✎ Edit</button>
      <button class="icon-btn delete" data-action="delete">🗑 Delete</button>
    </div>` : '';
  return `
    <div class="entry-card" data-id="${entry.id}">
      <div class="entry-meta">
        <span class="badge theme">${entry.theme}</span>
        <span class="entry-emotion" title="${entry.emotion}">
          <span class="emo-emoji">${EMOTION_EMOJI[entry.emotion] || '😐'}</span>
          <span class="emo-label">${entry.emotion}</span>
        </span>
        <span class="entry-date">${fmtDate(entry.createdAt)}</span>
        ${actions}
      </div>
      <div class="entry-text">${escapeHTML(entry.text) || '<i>(no transcript)</i>'}</div>
      ${mediaHTML(entry)}
    </div>`;
}

// Editable card (compact, side-by-side theme/emotion)
function entryEditHTML(entry) {
  const themeOpts = THEMES.map((t) => `<option value="${t}" ${t === entry.theme ? 'selected' : ''}>${t}</option>`).join('');
  const emoOpts = EMOTIONS.map((e) => `<option value="${e}" ${e === entry.emotion ? 'selected' : ''}>${e}</option>`).join('');
  return `
    <div class="entry-card" data-id="${entry.id}">
      <div class="entry-meta"><span>${fmtDate(entry.createdAt)}</span></div>
      <textarea class="edit-text" style="width:100%;min-height:80px;border:1px solid var(--border);border-radius:12px;padding:10px;font-family:inherit;font-size:1rem;background:var(--surface-2);">${escapeHTML(entry.text)}</textarea>
      <div class="pill-grid" style="margin-top:10px;">
        <label class="pill-field">Theme<select class="edit-theme">${themeOpts}</select></label>
        <label class="pill-field">Emotion<select class="edit-emotion">${emoOpts}</select></label>
      </div>
      ${mediaHTML(entry)}
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;">
        <button data-action="cancel" style="background:none;border:1px solid var(--border);border-radius:10px;padding:8px 16px;cursor:pointer;">Cancel</button>
        <button data-action="save" class="primary">Save changes</button>
      </div>
    </div>`;
}

let allEntriesCache = [];
async function loadEntries() { allEntriesCache = await api.listEntries(); renderEntries(); }

function renderEntries() {
  const theme = filterTheme.value, emotion = filterEmotion.value;
  let list = allEntriesCache.filter((e) => (!theme || e.theme === theme) && (!emotion || e.emotion === emotion));
  switch (sortBy.value) {
    case 'date-asc': list.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)); break;
    case 'theme':    list.sort((a, b) => (a.theme || '').localeCompare(b.theme || '')); break;
    case 'emotion':  list.sort((a, b) => (a.emotion || '').localeCompare(b.emotion || '')); break;
    default:         list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  const container = document.getElementById('entriesList');
  container.innerHTML = list.length ? list.map((e) => entryCardHTML(e)).join('') : '<p class="empty">No entries yet. Go record one!</p>';
}

document.getElementById('entriesList').addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  const card = btn.closest('.entry-card');
  const id = card.dataset.id;
  const action = btn.dataset.action;
  const entry = allEntriesCache.find((e) => e.id === id);

  if (action === 'edit') { card.outerHTML = entryEditHTML(entry); return; }
  if (action === 'cancel') { renderEntries(); return; }
  if (action === 'delete') {
    if (!confirm('Delete this entry? It moves to a Trash folder and can be recovered.')) return;
    await api.deleteEntry(id);
    allEntriesCache = allEntriesCache.filter((e) => e.id !== id);
    renderEntries();
    return;
  }
  if (action === 'save') {
    const patch = {
      text: card.querySelector('.edit-text').value,
      theme: card.querySelector('.edit-theme').value,
      emotion: card.querySelector('.edit-emotion').value,
    };
    const updated = await api.updateEntry(id, patch);
    const i = allEntriesCache.findIndex((e) => e.id === id);
    if (i >= 0) allEntriesCache[i] = updated;
    renderEntries();
  }
});

// ===========================================================================
// MEDIA LIBRARY — every photo/audio/file + links found across all entries
// ===========================================================================
async function loadMedia() {
  const all = await api.listEntries();
  const images = [], audio = [], files = [], links = [];
  const linkRe = /\bhttps?:\/\/[^\s)]+/gi;

  for (const e of all) {
    for (const name of (e.media || [])) {
      const url = `/api/media/${encodeURIComponent(name)}`;
      const item = { url, name, entry: e };
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) images.push(item);
      else if (/\.(webm|mp3|wav|m4a)$/i.test(name)) audio.push(item);
      else files.push(item);
    }
    // links captured from the entry text (typed or spoken URLs)
    const found = (e.text || '').match(linkRe) || [];
    found.forEach((u) => links.push({ url: u, entry: e }));
  }

  const box = document.getElementById('mediaGroups');
  const sections = [];

  if (images.length) sections.push(`
    <h4 class="media-h">📷 Photos & video (${images.length})</h4>
    <div class="media-grid">${images.map((m) =>
      `<a href="${m.url}" target="_blank"><img src="${m.url}" alt="${m.name}"/></a>`).join('')}</div>`);

  if (audio.length) sections.push(`
    <h4 class="media-h">🎙 Voice clips (${audio.length})</h4>
    <div class="media-list">${audio.map((m) =>
      `<div class="media-row"><audio controls src="${m.url}"></audio><span class="media-date">${fmtDate(m.entry.createdAt)}</span></div>`).join('')}</div>`);

  if (files.length) sections.push(`
    <h4 class="media-h">📎 Files (${files.length})</h4>
    <div class="media-list">${files.map((m) =>
      `<div class="media-row"><a href="${m.url}" target="_blank">${escapeHTML(m.name)}</a></div>`).join('')}</div>`);

  if (links.length) sections.push(`
    <h4 class="media-h">🔗 Links (${links.length})</h4>
    <div class="media-list">${links.map((m) =>
      `<div class="media-row"><a href="${escapeHTML(m.url)}" target="_blank">${escapeHTML(m.url)}</a></div>`).join('')}</div>`);

  box.innerHTML = sections.length ? sections.join('') :
    '<p class="empty">No media yet. Attach a photo/file, record a voice note, or drop a link in an entry.</p>';
}

// ===========================================================================
// INSIGHTS — "My Emotional Map" (date-filtered, computed client-side)
// ===========================================================================
const rangeFilter = document.getElementById('rangeFilter');
rangeFilter.value = '3m'; // default: last 3 months
rangeFilter.addEventListener('change', loadInsights);

// Turn the selected range into a cutoff Date (or null = all time).
function rangeCutoff(value) {
  const now = new Date();
  switch (value) {
    case '3m':  return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '6m':  return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '12m': return new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
    case 'year':return new Date(now.getFullYear(), 0, 1);
    default:    return null; // all time
  }
}

let insightsEntriesInRange = [];

async function loadInsights() {
  const all = await api.listEntries();
  const cutoff = rangeCutoff(rangeFilter.value);
  insightsEntriesInRange = cutoff ? all.filter((e) => new Date(e.createdAt) >= cutoff) : all;

  renderScatter(insightsEntriesInRange);
  renderSummary(insightsEntriesInRange);
  // Below the map: show all entries in the selected range (newest first).
  const sorted = [...insightsEntriesInRange].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  document.getElementById('scatterEntries').innerHTML =
    sorted.length ? sorted.map((e) => entryCardHTML(e, false)).join('') : '';
}

function renderScatter(entries) {
  const scatter = document.getElementById('scatter');
  const counts = {};
  for (const e of entries) {
    if (!e.emotion || e.emotion === 'Neutral') continue;
    counts[e.emotion] = (counts[e.emotion] || 0) + 1;
  }
  const stats = Object.entries(counts).map(([emotion, count]) => ({
    emotion, count,
    valence: (EMOTION_COORDS[emotion] || { valence: 0 }).valence,
    arousal: (EMOTION_COORDS[emotion] || { arousal: 0 }).arousal,
  }));
  if (stats.length === 0) { scatter.innerHTML = '<p class="empty">No emotions in this range yet.</p>'; return; }

  const W = 520, H = 420, pad = 50;
  const cx = W / 2, cy = H / 2, scaleX = (W - pad * 2) / 2, scaleY = (H - pad * 2) / 2;
  const maxCount = Math.max(...stats.map((s) => s.count));
  const px = (v) => cx + v * scaleX, py = (a) => cy - a * scaleY;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<line x1="${pad}" y1="${cy}" x2="${W - pad}" y2="${cy}" stroke="#f0cdd6"/>`;
  svg += `<line x1="${cx}" y1="${pad}" x2="${cx}" y2="${H - pad}" stroke="#f0cdd6"/>`;
  svg += `<text x="${W - pad + 4}" y="${cy - 6}" fill="#b9a7b0" font-size="11">pleasant</text>`;
  svg += `<text x="${pad - 40}" y="${cy - 6}" fill="#b9a7b0" font-size="11">unpleasant</text>`;
  svg += `<text x="${cx + 6}" y="${pad - 6}" fill="#b9a7b0" font-size="11">high energy</text>`;
  svg += `<text x="${cx + 6}" y="${H - pad + 16}" fill="#b9a7b0" font-size="11">low energy</text>`;
  for (const s of stats) {
    const r = 14 + (s.count / maxCount) * 34;
    const x = px(s.valence), y = py(s.arousal);
    const color = EMOTION_COLORS[s.emotion] || '#ff8da1';
    svg += `<circle class="dot" data-emotion="${s.emotion}" cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="0.85" stroke="${color}"/>`;
    svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="#5a4a3a" font-size="11" font-weight="700" pointer-events="none">${s.emotion} ${s.count}</text>`;
  }
  svg += `</svg>`;
  scatter.innerHTML = svg;

  // Clicking a circle narrows the entries below to that emotion (within range).
  scatter.querySelectorAll('.dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      const emotion = dot.dataset.emotion;
      const matching = insightsEntriesInRange.filter((e) => e.emotion === emotion)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      document.getElementById('scatterEntries').innerHTML =
        `<h3 style="color:var(--muted)">${emotion} — ${matching.length} entries</h3>` +
        matching.map((e) => entryCardHTML(e, false)).join('');
    });
  });
}

// Basic, non-LLM summary now (top theme + dominant feeling + count).
// The richer "what's on my mind / what worries me" summary needs an LLM —
// see TECH_DESIGN.md; that upgrade slots in right here.
function renderSummary(entries) {
  const box = document.getElementById('insightSummary');
  if (entries.length === 0) { box.innerHTML = '<span class="stat">No entries in this range.</span>'; return; }
  const top = (key) => {
    const c = {};
    entries.forEach((e) => { const v = e[key]; if (v && v !== 'Neutral' && v !== 'Uncategorized') c[v] = (c[v] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  };
  const theme = top('theme'), emotion = top('emotion');
  box.innerHTML = `
    <h4>Your snapshot</h4>
    <span class="stat">
      ${entries.length} entries in this window.
      ${theme ? `Most-written theme: <b>${theme[0]}</b> (${theme[1]}).` : ''}
      ${emotion ? `Most-felt emotion: <b>${emotion[0]}</b> (${emotion[1]}).` : ''}
    </span>
    <div class="llm-note">✨ A written summary of what's on your mind and what worries you will appear here once an AI model is connected.</div>`;
}

// ---- init ----
setupHero();
setupMoodPicker();
