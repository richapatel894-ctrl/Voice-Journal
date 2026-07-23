# Technical Design — Voice Journal (Prototype)

**Companion to:** PRD.md
**Audience:** me — using this build to *understand how software systems fit together.*

> 📚 Throughout this doc, blocks marked **LEARN** explain a general engineering
> concept using our app as the concrete example. That's the whole point of this
> project: build one real thing, and use it to understand how *all* apps work.

---

## 0. The mental model: what *is* an app?

Almost every app you've ever used is the same three things talking to each other:

```
   ┌─────────────┐      HTTP request       ┌─────────────┐      read/write     ┌─────────────┐
   │  FRONTEND   │  ───────────────────▶   │   BACKEND   │  ────────────────▶  │   STORAGE   │
   │ (what you   │                          │ (the rules  │                     │ (where data │
   │  see/click) │  ◀───────────────────   │  & logic)   │  ◀────────────────  │   lives)    │
   └─────────────┘      HTTP response       └─────────────┘      data           └─────────────┘
     browser / app         (JSON)             our server.js         files / DB
```

- **Frontend** = the *interface*. Runs on your screen (browser or phone). It knows how to draw buttons and capture your voice, but it holds **no source of truth**.
- **Backend** = the *brain*. Receives requests, enforces rules ("save this entry", "what emotion is this?"), and is the only thing allowed to touch storage.
- **Storage** = the *memory*. Survives restarts. In our prototype: plain files in a folder. In big apps: a database.

> **LEARN — Why split into three?** Separation of concerns. The screen can change
> (web today, iPhone tomorrow) without touching how data is stored. The storage
> can change (files today, database later) without the screen noticing. They
> agree on a **contract** in the middle — the API — and each side is free to
> evolve behind it. This is the single most important idea in system design.

---

## 1. Architecture of *this* prototype

We deliberately keep all three parts on **one machine, in one process**, to keep it simple and offline:

```
Your laptop
├── node server.js  ← the BACKEND (also hands the frontend files to the browser)
│      ▲  ▲
│      │  └── serves index.html / app.js / styles.css to the browser
│      │
│   http://localhost:5050
│      │
├── Browser tab  ← the FRONTEND (records mic, draws UI, calls the API)
│
└── ./data/       ← the STORAGE
    ├── entries/  ← one JSON file per journal entry (the "database rows")
    └── media/    ← all photos/audio/files, WhatsApp-style single store
```

> **LEARN — "localhost" and ports.** `localhost` (a.k.a. `127.0.0.1`) means *this
> same computer*. A **port** (`:5050`) is like an apartment number — one machine
> can run many servers, each on its own port, so requests reach the right one.
> When you deploy to the internet later, `localhost` becomes a domain name and
> the same code keeps working. The web is just this, at scale.

### Tech choices and *why*

| Layer | Choice | Why this, for learning + for now |
|---|---|---|
| Backend | **Node.js, built-in `http` module only** | Zero install. You see raw request routing instead of framework magic. |
| Frontend | **Plain HTML + CSS + JS** (no React, no build step) | You see the actual DOM, `fetch`, and the mic API with nothing in between. |
| Storage | **Filesystem** (JSON files + media files) | Matches the "store on my laptop in a folder" requirement *and* teaches why DBs exist. |
| Transcription | **Browser Web Speech API** | No API keys, no model download. Swap-able later. |
| Categorization | **Keyword rules in `classifier.js`** | Transparent, hackable, no ML infra. Structured so an LLM can replace it. |
| Visualization | **Hand-drawn SVG** in the browser | You see how a chart is *just math → shapes*. No chart library to hide it. |

> **LEARN — Every one of these is a swap-out point.** Good architecture means each
> choice above can be replaced without rewriting the others. We'll mark each
> "swap point" so you can see how a prototype grows into a production system.

---

## 2. The data model (the shape of a journal entry)

Everything in the app is an **entry**. One entry = one JSON file in `data/entries/`.

```jsonc
{
  "id": "2026-07-23T18-04-11-123Z-a1b2",   // unique id (timestamp + random)
  "kind": "voice",                          // "voice" | "text"
  "createdAt": "2026-07-23T18:04:11.123Z",  // auto timestamp (ISO 8601, UTC)
  "text": "Practiced my icebreaker speech for Toastmasters tonight...",
  "theme": "Toastmasters",                  // suggested, user-confirmable
  "themeConfidence": 0.8,
  "emotion": "Happy",                       // suggested, user-confirmable
  "emotionScores": { "valence": 0.7, "arousal": 0.5 }, // position on the mood map
  "media": ["2026-07-23T18-04-09Z-audio.webm", "photo-xyz.jpg"], // filenames in data/media/
  "userConfirmed": false                    // did I approve the categories yet?
}
```

> **LEARN — Why a "data model" comes first.** Before writing UI or logic, you
> decide the *shape* of your data. Every other part of the system is built to
> produce or consume this shape. Get it roughly right and everything downstream
> is easy; get it wrong and you rewrite everything. Notice we store `createdAt`
> as **ISO 8601 UTC** — a universal, sortable, timezone-safe string. Date/time
> handling is a classic source of bugs; a standard format avoids most of them.

> **LEARN — Files as a database.** Each entry is a file; the `entries/` folder is
> a "table"; the filename is the "primary key". This works beautifully for one
> user and a few thousand entries. It *breaks* when you need to ask "show all
> Happy entries from June sorted by date" fast — you'd have to open *every* file.
> That "open every file to answer a question" pain is *exactly* the problem
> databases (with indexes) solve. We'll feel that pain on purpose before fixing it.

---

## 3. The API — the contract between frontend and backend

The frontend never touches files. It *asks* the backend, over HTTP. This list of
requests **is** the API. (This same table is what you'd hand a mobile developer.)

| Method | Path | What it does | Request body | Response |
|---|---|---|---|---|
| `GET` | `/` | serve the app UI | — | HTML |
| `POST` | `/api/entries` | create an entry (runs auto-categorization) | `{ kind, text }` | the new entry JSON |
| `GET` | `/api/entries` | list all entries (newest first) | — | `[entry, …]` |
| `GET` | `/api/entries/:id` | get one entry | — | entry JSON |
| `PATCH` | `/api/entries/:id` | correct theme/emotion, confirm | `{ theme?, emotion?, userConfirmed? }` | updated entry |
| `POST` | `/api/entries/:id/media?filename=…` | attach a file (raw bytes) | binary blob | `{ filename }` |
| `GET` | `/api/media/:filename` | download/serve a media file | — | the file |
| `GET` | `/api/stats/emotions` | aggregated data for the scatterplot | — | `[{emotion, count, valence, arousal}, …]` |

> **LEARN — REST in one paragraph.** Notice the pattern: a **noun** (`entries`,
> `media`) plus an HTTP **verb** (`GET`=read, `POST`=create, `PATCH`=modify,
> `DELETE`=remove). This convention is called **REST**. It's popular because it's
> predictable: once you know the nouns, you can guess the URLs. The `:id` part is
> a **path parameter** (which entry?); the `?filename=` part is a **query
> parameter** (extra options). Data flows as **JSON** — a text format both the
> browser and server understand.

> **LEARN — Request → Response is the heartbeat.** *Nothing* happens on the
> backend unless the frontend asks. The frontend sends a **request** (verb + path
> + optional body); the backend does work and sends back a **response** (a status
> code like `200 OK` or `404 Not Found`, plus a body). Every app you use is
> millions of these tiny round-trips. Open your browser's DevTools → Network tab
> while using our app and you'll *see* each one.

### How a single action flows through the whole system

Recording a voice entry, end to end:

```
1. You tap Record.                     [frontend: MediaRecorder starts capturing mic]
2. Browser also live-transcribes.      [frontend: Web Speech API → text]
3. You tap Stop.                       [frontend: has an audio Blob + transcript text]
4. Frontend POSTs /api/entries         [HTTP request, body = {kind:"voice", text: transcript}]
5. Backend assigns id + timestamp.     [backend: server.js]
6. Backend runs classifier.js          [backend: text → theme + emotion + mood coords]
7. Backend writes data/entries/<id>.json  [storage: filesystem]
8. Backend responds with the entry.    [HTTP response, body = entry JSON]
9. Frontend POSTs the audio blob        [HTTP request to /api/entries/<id>/media]
10. Backend saves it to data/media/.   [storage]
11. Frontend shows the entry + "theme looks right?"  [UI updates]
```

> **LEARN — This is "full-stack" in one trace.** Follow those 11 steps and you've
> watched data travel: hardware (mic) → frontend → network → backend → disk →
> back. If you understand this one flow, you understand every feature — they're
> all variations of it.

---

## 4. Auto-categorization — how the "AI" works (and its honest limits)

`classifier.js` takes text and returns a theme + an emotion. In the prototype it's
**keyword matching**, not a neural network:

- **Theme:** each theme has trigger words (Toastmasters → "speech, club, icebreaker, evaluation"; Cooking → "recipe, dinner, kitchen"). Count matches, pick the winner, report a confidence.
- **Emotion:** each emotion has trigger words *and* a position on a 2-D **mood map** (below). Matches decide the emotion; the position drives the visualization.

> **LEARN — Start dumb, measure, then get smart.** Keyword rules are "wrong" a lot
> — but they're *inspectable* (you can read exactly why it chose "Work"), free,
> and instant. Every time you *correct* a suggestion, the app records the right
> answer. After a few hundred entries you'd have a labeled dataset — the fuel to
> justify a real model (an LLM call, or a small classifier you train). **Never
> build the fancy version first.** Build the dumb version, feel where it fails,
> then spend complexity exactly where it pays off.

### The mood map (why emotions have coordinates)

We place every emotion on a 2-D grid from psychology called the **circumplex model**:

```
                      high energy (arousal ↑)
                              │
              Angry ●         │        ● Excited
                              │
   unpleasant ─────────────── ● ─────────────── pleasant
   (valence −)     Sad ●      │      ● Content    (valence +)
                              │
                              │
                      low energy (arousal ↓)
```

- **Valence** = how pleasant (−1 unpleasant … +1 pleasant).
- **Arousal** = how activated/energetic (−1 calm … +1 intense).

Every emotion becomes an `(x, y)` point. That's what makes the scatterplot possible.

> **LEARN — This is a baby "embedding."** An **embedding** is the idea of turning
> something fuzzy (a feeling, a sentence, an image) into **numbers in a space**,
> so that "close in space" means "similar in meaning." We hand-assign 2 numbers
> per emotion. Real ML embeddings do the same thing with *hundreds* of numbers,
> *learned automatically* from data, for *any* text. Phase 2 swaps our 2 hand-set
> numbers for a real embedding model — but the *concept you see here* (meaning →
> coordinates → you can plot and cluster it) is identical. You now understand what
> "vector search" and "semantic similarity" actually mean.

---

## 5. The visualization

`GET /api/stats/emotions` returns, per emotion: how many entries have it, and its
mood-map coordinates. The frontend converts that to SVG circles:

- **position** = the emotion's (valence, arousal) mapped to pixels.
- **radius** = scaled by count (more entries → bigger circle) — your requirement.
- **click** = filter the entry list to that emotion.

> **LEARN — A chart is just `data → geometry`.** There's no magic in
> visualization libraries. A circle is `<circle cx cy r>`. To place it you do
> arithmetic: `pixelX = centerX + valence * scale`. Libraries (D3, Chart.js) just
> do this arithmetic for you and add polish. Drawing ~10 circles by hand once
> teaches you what those libraries are doing so you can debug them forever after.

---

## 6. What we get to *NOT* build (and why that's a design skill)

Because it's single-user and local, we skip a *huge* amount of normal app complexity:

| We skip… | Why we can | When you'd need it |
|---|---|---|
| Login / auth / passwords | one user, on their own machine | the moment 2 people or the cloud are involved |
| A database + migrations | thousands of files is fine | tens of thousands of entries, or complex queries |
| A hosting server / cloud | it runs on localhost | when you want it on your phone away from the laptop |
| CORS, HTTPS certs | same machine, same origin | any real internet deployment |
| Rate limiting, caching, load balancing | one user makes ~1 request at a time | many concurrent users |

> **LEARN — Scope is an engineering decision, not just a product one.** Half of
> senior engineering is knowing what you're *allowed not to build yet*. Each row
> above is real work we correctly defer. Naming them explicitly (instead of
> forgetting they exist) is what separates "a prototype" from "a toy."

---

## 7. Security & privacy (honest state)

- ✅ Data never leaves your laptop. No network calls off-machine (Web Speech is the one exception — see below).
- ⚠️ **Web Speech API note:** in Chrome, speech recognition may send audio to Google's servers for transcription. For true offline privacy, Phase 2's local Whisper removes this. *Flagging it so it's a choice, not a surprise.*
- ⚠️ Files are **not encrypted** at rest. Anyone with your laptop login can read `./data`. Fine for a personal prototype; note it before storing anything truly sensitive.
- ✅ No accounts means no passwords to leak.

> **LEARN — "Where does my data go?" is *the* question.** For every feature, trace
> the data's path and ask what leaves the machine. Most privacy problems are just
> an unnoticed network call. You now have the habit of looking for them.

---

## 8. How to run it

See `README.md`. One command, no install:

```bash
node backend/server.js
```

Then open `http://localhost:5050`.

---

## 9. The path to iOS (preview of the next big conversation)

The whole reason we built a clean **API** in §3: an iOS app is *just a different
frontend* calling the *same backend*. Three strategies we'll compare later:

1. **Fully on-device (Swift + local files):** most private, no server, but logic
   gets rewritten in Swift. Best match for "local-first."
2. **iPhone talks to a backend on your Mac/cloud:** reuse this exact server;
   phone sends requests over the network. Teaches real client-server + networking.
3. **Hybrid:** capture on-device, sync to a backend for the heavy AI + backup.

Each has real trade-offs in privacy, offline behavior, cost, and complexity —
that's the deep-dive we'll do when the prototype has taught you the fundamentals.
