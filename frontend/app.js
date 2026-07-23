'use strict';
/*
 * app.js — the FRONTEND logic.
 *
 * Responsibilities: draw the UI, capture the microphone, and talk to the
 * backend over HTTP using fetch(). It holds NO source of truth — the backend
 * and the files on disk do. (See TECH_DESIGN.md §0, §3.)
 */

// ---- tiny API client -------------------------------------------------------
// Every function here is one HTTP round-trip to our backend. Open DevTools →
// Network while using the app and you'll see each of these fire.
const api = {
  async createEntry(kind, text) {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, text }),
    });
    return res.json();
  },
  async listEntries() {
    return (await fetch('/api/entries')).json();
  },
  async updateEntry(id, patch) {
    const res = await fetch(`/api/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return res.json();
  },
  async uploadMedia(id, filename, blob) {
    const res = await fetch(`/api/entries/${id}/media?filename=${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: blob,
    });
    return res.json();
  },
  async emotionStats() {
    return (await fetch('/api/stats/emotions')).json();
  },
};

const THEMES = ['Toastmasters', 'Work', 'Personal Growth', 'Cooking', 'Traveling', 'Relationships', 'Uncategorized'];
const EMOTIONS = ['Happy', 'Content', 'Sad', 'Anxious', 'Angry', 'Disappointed', 'Neutral'];

// ---- tab switching ---------------------------------------------------------
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
// RECORDING (the primary action)
// ===========================================================================
let mediaRecorder = null;
let audioChunks = [];
let recognition = null;      // Web Speech API (live transcription)
let liveText = '';
let pendingFiles = [];       // files chosen before saving a text entry

const recordBtn = document.getElementById('recordBtn');
const recordHint = document.getElementById('recordHint');
const liveTranscriptEl = document.getElementById('liveTranscript');

recordBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
  else startRecording();
});

async function startRecording() {
  try {
    // 1) Ask the browser for microphone access (the OS shows a permission prompt).
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 2) MediaRecorder captures the audio into chunks → we'll upload the blob.
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => onRecordingStopped(stream);
    mediaRecorder.start();

    // 3) In parallel, live-transcribe with the Web Speech API (if available).
    liveText = '';
    startSpeechRecognition();

    recordBtn.classList.add('recording');
    recordBtn.querySelector('.mic-icon').textContent = '⏹';
    recordHint.textContent = 'Recording… tap to stop';
  } catch (err) {
    recordHint.textContent = '⚠️ Could not access microphone: ' + err.message;
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  if (recognition) recognition.stop();
  recordBtn.classList.remove('recording');
  recordBtn.querySelector('.mic-icon').textContent = '🎙';
  recordHint.textContent = 'Saving…';
}

async function onRecordingStopped(stream) {
  stream.getTracks().forEach((t) => t.stop()); // release the mic
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const transcript = (liveText || liveTranscriptEl.textContent || '').trim();

  // Create the entry (backend auto-categorizes from the transcript)…
  const entry = await api.createEntry('voice', transcript);
  // …then upload the audio blob and attach it to that entry.
  await api.uploadMedia(entry.id, 'audio.webm', audioBlob);

  recordHint.textContent = 'Tap to start recording';
  liveTranscriptEl.textContent = '';
  showSuggestion(entry);
}

// Web Speech API — browser's built-in speech-to-text. Not in every browser.
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
  const entry = await api.createEntry('text', text);
  // Upload each attached file, then attach to the entry.
  for (const file of pendingFiles) {
    await api.uploadMedia(entry.id, file.name, file);
  }
  textInput.value = '';
  pendingFiles = [];
  pendingEl.innerHTML = '';
  fileInput.value = '';
  showSuggestion(entry);
});

// ===========================================================================
// SUGGESTION CARD (confirm / correct the auto-categorization)
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

// If the user changes a dropdown, save it immediately (a PATCH request).
themeSelect.addEventListener('change', () => api.updateEntry(currentEntryId, { theme: themeSelect.value }));
emotionSelect.addEventListener('change', () => api.updateEntry(currentEntryId, { emotion: emotionSelect.value }));

document.getElementById('confirmBtn').addEventListener('click', async () => {
  await api.updateEntry(currentEntryId, {
    theme: themeSelect.value,
    emotion: emotionSelect.value,
    userConfirmed: true,
  });
  suggestionCard.classList.add('hidden');
});

// ===========================================================================
// ENTRIES list + filters
// ===========================================================================
const filterTheme = document.getElementById('filterTheme');
const filterEmotion = document.getElementById('filterEmotion');
fillSelect(filterTheme, ['', ...THEMES].map((t) => t || 'All themes'), 'All themes');
fillSelect(filterEmotion, ['', ...EMOTIONS].map((e) => e || 'All emotions'), 'All emotions');
filterTheme.addEventListener('change', loadEntries);
filterEmotion.addEventListener('change', loadEntries);

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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

function entryCardHTML(entry) {
  return `
    <div class="entry-card">
      <div class="entry-meta">
        <span class="badge kind">${entry.kind === 'voice' ? '🎙 voice' : '✍️ text'}</span>
        <span class="badge theme">${entry.theme}</span>
        <span class="badge emotion">${entry.emotion}</span>
        <span>${fmtDate(entry.createdAt)}</span>
      </div>
      <div class="entry-text">${escapeHTML(entry.text) || '<i>(no transcript)</i>'}</div>
      ${mediaHTML(entry)}
    </div>`;
}

function escapeHTML(s) {
  return (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function loadEntries() {
  const all = await api.listEntries();
  const theme = filterTheme.value && filterTheme.value !== 'All themes' ? filterTheme.value : '';
  const emotion = filterEmotion.value && filterEmotion.value !== 'All emotions' ? filterEmotion.value : '';
  const filtered = all.filter((e) => (!theme || e.theme === theme) && (!emotion || e.emotion === emotion));
  const list = document.getElementById('entriesList');
  list.innerHTML = filtered.length
    ? filtered.map(entryCardHTML).join('')
    : '<p class="empty">No entries yet. Go record one!</p>';
}

// ===========================================================================
// INSIGHTS — the emotion scatterplot (hand-drawn SVG). See TECH_DESIGN.md §5.
// ===========================================================================
async function loadInsights() {
  const stats = await api.emotionStats();
  const scatter = document.getElementById('scatter');
  document.getElementById('scatterEntries').innerHTML = '';

  if (stats.length === 0) {
    scatter.innerHTML = '<p class="empty">No emotions to show yet.</p>';
    return;
  }

  const W = 520, H = 420, pad = 50;
  const cx = W / 2, cy = H / 2;              // center = neutral (0,0)
  const scaleX = (W - pad * 2) / 2;          // valence −1..1 → pixels
  const scaleY = (H - pad * 2) / 2;          // arousal −1..1 → pixels
  const maxCount = Math.max(...stats.map((s) => s.count));

  // Convert a mood coordinate to a pixel coordinate (the core chart math).
  const px = (valence) => cx + valence * scaleX;
  const py = (arousal) => cy - arousal * scaleY; // minus: screen y grows downward

  const colors = {
    Happy: '#ffd166', Content: '#7ed957', Sad: '#6ea8ff',
    Anxious: '#c77dff', Angry: '#ff6b6b', Disappointed: '#9aa0ad',
  };

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  // axes
  svg += `<line x1="${pad}" y1="${cy}" x2="${W - pad}" y2="${cy}" stroke="#2e313d"/>`;
  svg += `<line x1="${cx}" y1="${pad}" x2="${cx}" y2="${H - pad}" stroke="#2e313d"/>`;
  // axis labels
  svg += `<text x="${W - pad + 4}" y="${cy - 6}" fill="#9aa0ad" font-size="11">pleasant</text>`;
  svg += `<text x="${pad - 40}" y="${cy - 6}" fill="#9aa0ad" font-size="11">unpleasant</text>`;
  svg += `<text x="${cx + 6}" y="${pad - 6}" fill="#9aa0ad" font-size="11">high energy</text>`;
  svg += `<text x="${cx + 6}" y="${H - pad + 16}" fill="#9aa0ad" font-size="11">low energy</text>`;

  // one circle per emotion; radius scales with count
  for (const s of stats) {
    const r = 14 + (s.count / maxCount) * 34;
    const x = px(s.valence), y = py(s.arousal);
    const color = colors[s.emotion] || '#7c6cff';
    svg += `<circle class="dot" data-emotion="${s.emotion}" cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity="0.7" stroke="${color}"/>`;
    svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="#14151a" font-size="11" font-weight="700" pointer-events="none">${s.emotion} ${s.count}</text>`;
  }
  svg += `</svg>`;
  scatter.innerHTML = svg;

  // clicking a circle shows the entries behind that emotion
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
