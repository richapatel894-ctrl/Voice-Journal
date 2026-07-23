# 🎙 Voice Journal

A private, **local-first** voice journaling app. Speak (or type) an entry, attach
photos/files, and it auto-timestamps, transcribes, and organizes everything by
**theme** and **emotion** — then shows your emotions as a visual map.

> Built as a learning project. See [`docs/TECH_DESIGN.md`](docs/TECH_DESIGN.md)
> for **LEARN** callouts that explain how frontend / backend / storage / APIs
> fit together, using this app as the example.

## Run it (no installation needed)

Requires only Node.js (you have v24).

```bash
node backend/server.js
```

Then open **http://localhost:5050** in your browser.

- Everything you save lives in **`./data/`** on your laptop:
  - `data/entries/` — one JSON file per entry (your "database")
  - `data/media/` — all photos + audio, WhatsApp-style single store
- Nothing is uploaded anywhere. (One caveat: browser live-transcription — see
  the Security section of the tech design.)

## Try the full loop

1. **Record** tab → tap the big mic → say something like
   *"Practiced my Toastmasters icebreaker speech tonight, I feel proud and happy."*
   → stop → see the suggested theme (**Toastmasters**) + emotion (**Happy**).
2. Type an entry and **📎 Attach** a photo → see it saved in the entry and in `data/media/`.
3. **Entries** tab → filter by theme/emotion.
4. **Insights** tab → click an emotion circle → see its entries.
5. Quit the server, restart it, reload — your data is still there (persistence).

## Project map

```
voice-journal/
├── docs/
│   ├── PRD.md            ← what we're building & why (product)
│   └── TECH_DESIGN.md    ← how it works + engineering learning callouts
├── backend/
│   ├── server.js         ← the API + web server (built-in Node http only)
│   ├── classifier.js     ← auto-categorization (keyword rules; a swap point)
│   └── storage.js        ← the only file that touches disk (a swap point)
├── frontend/
│   ├── index.html        ← UI structure
│   ├── styles.css        ← styling
│   └── app.js            ← mic capture, API calls, visualization
└── data/                 ← your journal (created as you use the app)
```

## What's next

- **Phase 2:** local Whisper transcription, LLM categorization, real text embeddings.
- **Phase 3:** the iOS app — reuses this exact API. (Tech design §9 previews the options.)
- **Phase 4:** App Store publishing.
