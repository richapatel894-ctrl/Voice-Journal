# Journaling App — Requirements & Key Decisions

## Current state
- Local web app, running on localhost in the browser
- Records voice and transcribes it using the browser's built-in speech-to-text (Web Speech API)
- Data currently saved locally on the laptop only

---

## Feature Requirements

### Home
- Streak strip at the top (Duolingo/gratitude-app style) showing consistency
- Warm greeting banner — should feel like "coming home," not a generic dashboard
- Prompts "how are you feeling?"
- Record or write entry, with a lightweight confirmation that the entry was saved (toast/checkmark-style, not a heavy modal)
- Shows only today's entry — deliberately avoids becoming an infinite feed

### Entry creation
- Voice or text entry
- Attach files, folders, and links — saved to a media section
- Auto-tagged with theme and emotion (manual for now; LLM-based auto-tagging planned later)

### Entries & Collections
- Searchable, sortable, filterable
- Edit and delete entries
- Default view: chronological, scrollable list of latest entries
- Also viewable grouped by theme (work/growth, relationships, travel, cooking, new experiences, etc.)

### Insights
- Emotion map with an adjustable time period
- Written summary layer: what you've been feeling, what you've been writing about, what's been top of mind
- Actionable layer: what → why → how — breaking down feelings, their causes, and steps to address them
- Calendar/heatmap view of journaling frequency
- Clickable emotion clusters/bubbles that filter into the related entries

### Reminders
- User sets a day and time to receive a notification prompting them to journal
- Core motivation: solving for forgetting/inconsistency in journaling

### Media & Settings
- Media (files/folders/links attached to entries) is de-prioritized — tucked into Settings/Profile rather than being a prominent nav item

---

## Key Decisions

1. **Data model: entries are the single source of truth; theme and emotion are tags, not folders.**
   Rather than physically sorting entries into theme-based folders, all entries live in one chronological store. "Collections by theme" is a filtered view generated from tags, not a separate place entries are moved into. This avoids the "which folder does a multi-topic entry belong in" problem and means the planned LLM auto-tagging just adds tags later without changing the architecture.

2. **Emotions are one-to-many per entry.**
   An entry can carry multiple emotions (e.g. happy + anxious) and is filed under all of them. The emotion map aggregates with **full-count** (each tag counts fully toward its emotion, not split-weighted) since it reads more intuitively as frequency. Tags are stored in order, with the first tag treated as the "primary" emotion for tight UI spots (a feed-row dot, a thumbnail) — but collections and insights treat every tag as fully valid, not just the primary one.

3. **Target platform: iPhone (iOS).**
   This matters because every iOS browser (Safari, Chrome, etc.) runs on Apple's WebKit engine — there's no browser-switch workaround for iOS-specific limitations.

4. **Backend appetite: undecided — walked through tradeoffs, no commitment yet.**

---

## Open Decision: Path to an Installable iPhone App

| Path | Transcription | Reminders | Effort |
|---|---|---|---|
| **PWA only** (manifest + service worker, hosted over HTTPS, "Add to Home Screen") | Web Speech API works in a normal Safari tab, but multiple developer reports say it breaks once installed as a standalone home-screen app — needs direct testing | Can't reliably fire scheduled notifications while the app is closed — iOS has no background timers for PWAs, and Push requires a server anyway | Lowest — roughly an afternoon |
| **PWA + small backend** | Record with `MediaRecorder`, send audio to a cloud speech API (Whisper API, Deepgram) — more accurate than the free browser API | A small server stores the push subscription and fires Web Push at the scheduled time (works on iOS 16.4+, requires home-screen install) | Medium — small server + scheduled job |
| **Native wrapper (Capacitor)** around the existing web code | Native Speech framework via a Capacitor plugin — reliable, no browser quirks | Local notifications scheduled on-device, no server required | Medium-high — one-time Xcode/provisioning setup, minimal changes to existing app code |

**Recommendation discussed:** Build the PWA wrapper first (cheap, ~an afternoon) specifically to test whether recording/transcription survives standalone mode on-device. But plan for either a lightweight backend or a Capacitor wrapper regardless — reminders (the actual pain point being solved: forgetting to journal) can't be reliably delivered by a pure local PWA on iOS. Choice between the backend route and Capacitor is still open, and pending the test result plus appetite for backend work (which was noted as useful full-stack practice).
