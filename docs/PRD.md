# Product Requirements Document — Voice Journal

**Author:** Richa
**Status:** Draft v1 (prototype)
**Last updated:** 2026-07-23

---

## 1. One-line summary

A private, local-first journaling app whose **primary action is speaking**. You talk (or type), optionally attach photos/files, and the app timestamps, transcribes, and auto-organizes each entry by **theme** and **emotion** — then lets you *see* your emotional life as a visual map.

## 2. Why (problem & motivation)

Journaling works best when it has the least friction. Typing is friction; talking is not. Existing apps either:
- make voice a second-class feature (buried behind text), or
- store your most private thoughts in someone else's cloud.

**Goal:** make *speaking a thought* the fastest thing the app does, keep 100% of the data on my own laptop, and turn months of entries into insight (themes + emotional patterns) without manual tagging.

## 3. Who it's for

Just me (single user, personal tool). No accounts, no sharing, no multi-tenant concerns — this simplifies almost every engineering decision (see Tech Design §"What we get to *not* build").

## 4. Goals & non-goals

### Goals (v1 prototype)
1. **Voice-first capture** — one big obvious "record" button; recording is the default screen.
2. **Text capture** — write an entry instead of speaking.
3. **Attachments** — add photos/files to *any* entry (voice or text). Media stored in one central folder, browsable in-app (WhatsApp-style media store).
4. **Automatic metadata** — every entry auto-stamped with date + time.
5. **Local storage** — everything saved to a folder on my laptop. No cloud.
6. **Auto-categorization**
   - *Theme* (Toastmasters, Work, Personal Growth, Cooking, Traveling, Relationships, …) — suggested after capture, user confirms or corrects.
   - *Emotion* (Happy, Sad, Anxious, Angry, Disappointed, …) — same confirm/correct loop.
7. **Emotion visualization** — a scatterplot where each emotion is a circle; bigger circle = stronger/more-frequent emotion. Click a circle → see the entries behind it.

### Non-goals (explicitly out for v1)
- No login / accounts / sync across devices.
- No sharing or social features.
- No mobile app yet (that's the *next* phase — see roadmap).
- No perfect AI categorization — "good enough + easy to correct" beats "perfect."
- No encryption at rest in v1 (noted as a known gap; see Tech Design §Security).

## 5. Core user stories

| # | As me, I want to… | So that… | Acceptance criteria |
|---|---|---|---|
| U1 | open the app and immediately record | capturing a thought takes <2 seconds | Record button is the first, largest thing on screen; tapping it starts recording. |
| U2 | type an entry instead | I can journal silently | A text box + save produces an entry identical in every other way to a voice one. |
| U3 | attach a photo/file to an entry | I keep context with the memory | Entry shows thumbnails; files land in the central media folder. |
| U4 | have the date/time recorded for me | I never think about it | Entry displays created timestamp; stored in the data file. |
| U5 | see a suggested theme + emotion after I capture | I don't have to tag manually | After save, app shows suggested theme + emotion and a "looks right? / change it" control. |
| U6 | correct a wrong category | my data stays accurate | Changing theme/emotion updates the stored entry immediately. |
| U7 | browse all entries by theme or emotion | I can revisit a topic or mood | Filterable list; clicking a filter shows only matching entries. |
| U8 | see my emotions as a visual map | I notice patterns over time | Scatterplot renders; circle size reflects frequency/intensity; clicking a circle lists its entries. |

## 6. Key product decisions (and the trade-offs)

- **Voice → text is required for auto-categorization.** You can't categorize *content* you can't read. Decision: transcribe voice to text. Prototype uses the browser's built-in speech recognition (zero setup); later we can swap to a local Whisper model for accuracy/offline. *This is the single most important dependency in the product.*
- **"Suggest then confirm," not "silently file."** Auto-categorization is a *draft*, not a verdict. Keeps me in control and quietly builds a labeled dataset I could later use to train a better model.
- **Local-first is a feature, not a limitation.** It's the privacy promise *and* it removes a huge amount of engineering (no auth, no servers, no sync). We accept the cost: no backup/sync until I add it deliberately.

## 7. Success criteria for the prototype

The prototype is "done" when I can, end to end, on my laptop:
1. Record a voice note → see it transcribed, timestamped, and given a suggested theme + emotion.
2. Write a text note and attach a photo → see the photo in the entry and in the media folder.
3. Correct a category and see it stick.
4. Open the visualization and click an emotion to see its entries.
5. Close the app, reopen it, and find all my data still there (persistence).

## 8. Roadmap (beyond prototype)

- **Phase 2 — Better AI:** local Whisper transcription; LLM-based categorization; real text embeddings for the visualization (semantic clustering, not just fixed emotion positions).
- **Phase 3 — iOS app:** native SwiftUI recording UI; decide backend strategy (fully on-device vs. a synced backend). This is where we'll go deep on mobile + systems architecture.
- **Phase 4 — Publish:** App Store provisioning, privacy nutrition labels, TestFlight, review process.
