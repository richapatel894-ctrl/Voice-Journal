'use strict';
/*
 * app.js — the FRONTEND logic.
 * Draws the UI, captures the mic, and talks to the backend over HTTP (fetch).
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
  async uploadMedia(id, filename, blob) {
    const res = await fetch(`/api/entries/${id}/media?filename=${encodeURIComponent(filename)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: blob,
    });
    return res.json();
  },
  async emotionStats() { return (await fetch('/api/stats/emotions')).json(); },
};

const THEMES = ['Toastmasters', 'Work', 'Personal Growth', 'Cooking', 'Traveling', 'Relationships', 'Uncategorized'];
const EMOTIONS = ['Happy', 'Calm', 'Sad', 'Anxious', 'Angry', 'Disappointed', 'Neutral'];
const MOODS = [
  { emotion: 'Happy',   emoji: '😊' },
  { emotion: 'Calm',    emoji: '😌' },
  { emotion: 'Sad',     emoji: '😢' },
  { emotion: 'Anxious', emoji: '😰' },
  { emotion: 'Angry',   emoji: '😠' },
];

let selectedMood = null; // the emoji the user tapped on the home screen

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

  const hero = document.getElementById('hero');
  hero.className = `hero scene-${scene}`;
  document.getElementById('greeting').textContent = `${greeting}, Richa`;

  // sprinkle some stars for the night scene
  const stars = document.getElementById('stars');
  stars.innerHTML = '';
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 60 + '%';
    s.style.animationDelay = (Math.random() * 2.4).toFixed(2) + 's';
    stars.appendChild(s);
  }
}

// ---- mood picker ----
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

// ===========================================================================
// tab switching
// ===========================================================================
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
    if (name === 'entries') loadEntries();
    if (name === 'insights') loadInsights();
  });
});

// ===========================================================================
// RECORDING
// ===========================================================================
let mediaRecorder = null, audioChunks = [], recognition = null, liveText = '', pendingFiles = [];

const recordBtn = document.getElementById('recordBtn');
const writeBtn = document.getElementById('writeBtn');
const composeBox = document.getElementById('composeBox');
const recordHint = document.getElementById('recordHint');
const liveTranscriptEl = document.getElementById('liveTranscript');

recordBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
  else startRecording();
});

writeBtn.addEventListener('click', () => {
  composeBox.classList.toggle('hidden');
  if (!composeBox.classList.contains('hidden')) document.getElementById('textInput').focus();
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
    recordBtn.innerHTML = '<span class="ico">⏹</span> Stop';
    recordHint.textContent = 'Recording… tap to stop';
  } catch (err) {
    recordHint.textContent = '⚠️ Could not access microphone: ' + err.message;
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  if (recognition) recognition.stop();
  recordBtn.classList.remove('recording');
  recordBtn.innerHTML = '<span class="ico">🎙</span> Record';
  recordHint.textContent = 'Saving…';
}

async function onRecordingStopped(stream) {
  stream.getTracks().forEach((t) => t.stop());
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const transcript = (liveText || liveTranscriptEl.textContent || '').trim();
  const entry = await api.createEntry('voice', transcript, selectedMood);
  await api.uploadMedia(entry.id, 'audio.webm', audioBlob);
  recordHint.textContent = 'Tap record, or type in your entry';
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

function resetMood() {
  selectedMood = null;
  document.querySelectorAll('.mood').forEach((b) => b.classList.remove('selected'));
}

// ===========================================================================
// TEXT ENTRY + attachments
// ===========================================================================
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const pendingEl = document.getElementById('pendingAttachments');

fileInput.addEventListener('change', () => {
  pendingFiles = Array.from(fileInput.files);
  pendingEl.innerHTML = pendingFiles.map((f) => `<span class="chip">📎 ${f.name}</span>`).join('');
});

document.getElementById('saveTextBtn').addEventListener('click', async () => {
  const text = textInput.value.trim();
  if (!text && pendingFiles.length === 0) return;
  const entry = await api.createEntry('text', text, selectedMood);
  for (const file of pendingFiles) await api.uploadMedia(entry.id, file.name, file);
  textInput.value = '';
  pendingFiles = [];
  pendingEl.innerHTML = '';
  fileInput.value = '';
  composeBox.classList.add('hidden');
  resetMood();
  showSuggestion(entry);
});

// ===========================================================================
// SUGGESTION CARD
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
// ENTRIES — filter, sort, edit
// ===========================================================================
const filterTheme = document.getElementById('filterTheme');
const filterEmotion = document.getElementById('filterEmotion');
const sortBy = document.getElementById('sortBy');

filterTheme.innerHTML = '<option value="">All themes</option>' + THEMES.map((t) => `<option value="${t}">${t}</option>`).join('');
filterEmotion.innerHTML = '<option value="">All emotions</option>' + EMOTIONS.map((e) => `<option value="${e}">${e}</option>`).join('');
[filterTheme, filterEmotion, sortBy].forEach((el) => el.addEventListener('change', loadEntries));

function fmtDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function escapeHTML(s) {
  return (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
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

// Read-only card
function entryCardHTML(entry) {
  return `
    <div class="entry-card" data-id="${entry.id}">
      <div class="entry-meta">
        <span class="badge kind">${entry.kind === 'voice' ? '🎙 voice' : '✍️ text'}</span>
        <span class="badge theme">${entry.theme}</span>
        <span class="badge emotion" data-emotion="${entry.emotion}">${entry.emotion}</span>
        <span>${fmtDate(entry.createdAt)}</span>
        <button class="edit-btn" data-action="edit" style="margin-left:auto;background:none;border:none;color:var(--pink-deep);cursor:pointer;font-weight:600;">✎ Edit</button>
      </div>
      <div class="entry-text">${escapeHTML(entry.text) || '<i>(no transcript)</i>'}</div>
      ${mediaHTML(entry)}
    </div>`;
}

// Editable card
function entryEditHTML(entry) {
  const themeOpts = THEMES.map((t) => `<option value="${t}" ${t === entry.theme ? 'selected' : ''}>${t}</option>`).join('');
  const emoOpts = EMOTIONS.map((e) => `<option value="${e}" ${e === entry.emotion ? 'selected' : ''}>${e}</option>`).join('');
  return `
    <div class="entry-card" data-id="${entry.id}">
      <div class="entry-meta">
        <span class="badge kind">${entry.kind === 'voice' ? '🎙 voice' : '✍️ text'}</span>
        <span>${fmtDate(entry.createdAt)}</span>
      </div>
      <textarea class="edit-text" style="width:100%;min-height:80px;border:1px solid var(--border);border-radius:12px;padding:10px;font-family:inherit;font-size:1rem;background:var(--surface-2);">${escapeHTML(entry.text)}</textarea>
      <div class="suggestion-row" style="margin-top:10px;"><label>Theme</label><select class="edit-theme">${themeOpts}</select></div>
      <div class="suggestion-row"><label>Emotion</label><select class="edit-emotion">${emoOpts}</select></div>
      ${mediaHTML(entry)}
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">
        <button data-action="cancel" style="background:none;border:1px solid var(--border);border-radius:10px;padding:8px 16px;cursor:pointer;">Cancel</button>
        <button data-action="save" class="primary">Save changes</button>
      </div>
    </div>`;
}

let allEntriesCache = [];

async function loadEntries() {
  allEntriesCache = await api.listEntries();
  renderEntries();
}

function renderEntries() {
  const theme = filterTheme.value;
  const emotion = filterEmotion.value;
  let list = allEntriesCache.filter((e) => (!theme || e.theme === theme) && (!emotion || e.emotion === emotion));

  switch (sortBy.value) {
    case 'date-asc':  list.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)); break;
    case 'theme':     list.sort((a, b) => (a.theme || '').localeCompare(b.theme || '')); break;
    case 'emotion':   list.sort((a, b) => (a.emotion || '').localeCompare(b.emotion || '')); break;
    default:          list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); // date-desc
  }

  const container = document.getElementById('entriesList');
  container.innerHTML = list.length ? list.map(entryCardHTML).join('') : '<p class="empty">No entries yet. Go record one!</p>';
}

// Event delegation for edit / save / cancel on the entries list
document.getElementById('entriesList').addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  const card = btn.closest('.entry-card');
  const id = card.dataset.id;
  const action = btn.dataset.action;
  const entry = allEntriesCache.find((e) => e.id === id);

  if (action === 'edit') { card.outerHTML = entryEditHTML(entry); return; }
  if (action === 'cancel') { renderEntries(); return; }
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
// INSIGHTS — emotion scatterplot
// ===========================================================================
async function loadInsights() {
  const stats = await api.emotionStats();
  const scatter = document.getElementById('scatter');
  document.getElementById('scatterEntries').innerHTML = '';

  if (stats.length === 0) { scatter.innerHTML = '<p class="empty">No emotions to show yet.</p>'; return; }

  const W = 520, H = 420, pad = 50;
  const cx = W / 2, cy = H / 2;
  const scaleX = (W - pad * 2) / 2, scaleY = (H - pad * 2) / 2;
  const maxCount = Math.max(...stats.map((s) => s.count));
  const px = (v) => cx + v * scaleX;
  const py = (a) => cy - a * scaleY;

  const colors = {
    Happy: '#ffd98a', Calm: '#a8e6cf', Content: '#a8e6cf',
    Sad: '#a9c8ff', Anxious: '#d6c2ff', Angry: '#ffb3b3', Disappointed: '#e6d5c3',
  };

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
    const color = colors[s.emotion] || '#ff8da1';
    svg += `<circle class="dot" data-emotion="${s.emotion}" cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="0.85" stroke="${color}"/>`;
    svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="#5a4a3a" font-size="11" font-weight="700" pointer-events="none">${s.emotion} ${s.count}</text>`;
  }
  svg += `</svg>`;
  scatter.innerHTML = svg;

  scatter.querySelectorAll('.dot').forEach((dot) => {
    dot.addEventListener('click', async () => {
      const emotion = dot.dataset.emotion;
      const all = await api.listEntries();
      const matching = all.filter((e) => e.emotion === emotion);
      document.getElementById('scatterEntries').innerHTML =
        `<h3 style="color:var(--muted)">${emotion} — ${matching.length} entries</h3>` +
        matching.map(entryCardHTML).join('');
    });
  });
}

// ---- init ----
setupHero();
setupMoodPicker();
