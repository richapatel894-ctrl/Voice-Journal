# Product Requirements Document — Voice Journal

**Author:** Richa
**Status:** v2. This is the single source of truth for product requirements. It replaces the v1 PRD and `journaling-app-requirements-and-decisions.md`, which are merged into this document.
**Last updated:** 2026-09-20

---

## 1. One-line summary

A private journaling app for iPhone whose **primary action is speaking**. You talk (or type), optionally attach photos, files and links, and the app timestamps, transcribes and auto-tags each entry by **theme** and **emotion**. It then lets you filter your entries by those tags and *see* your emotional life as a visual map.

## 2. Why (problem and motivation)

Journaling works best when it has the least friction. Typing is friction; talking is not. Existing apps either make voice a second-class feature, or store your most private thoughts in someone else's cloud.

The second problem is consistency. The core pain this app solves is **forgetting to journal**, so the app has to make coming back every day feel warm and take seconds.

**Goals:** make speaking a thought the fastest thing the app does, keep the data private and on-device, and turn months of entries into insight (themes and emotional patterns) without manual tagging.

## 3. Who it's for

Just me: a single-user personal tool. No accounts, no sharing, no multi-tenant concerns.

## 4. Platform and scope

- **Target platform: iPhone (iOS).** Android is not a goal.
- **One client: the Expo (React Native) app in `mobile/`.** It fully replaces the SwiftUI app (`ios/`), which is retired from the start: it is not developed further, and it stays reachable only through git history as a porting reference. The web prototype (`frontend/`) is not developed further either; whether its code is removed is decided with the architecture pass (section 11), because the Express backend serves it.
- **Native look and feel is a requirement.** Chrome uses real native components: `NativeTabs` from `expo-router` and `@expo/ui` (SwiftUI-backed sheets, pickers, lists, swipe actions, context menus). Charts are custom-drawn (`react-native-svg` or Skia) inside native chrome, because `@expo/ui` in SDK 57 has no charting components.
- Because these are native modules, the app runs as a custom dev client build (`npx expo run:ios`), not in Expo Go.

## 5. Design principles

1. **Voice first.** Recording is one tap from Home and starts immediately.
2. **Coming home.** The app should feel warm and personal, not like a generic dashboard.
3. **Capture never blocks.** Saving an entry never waits on the network or on transcription.
4. **Tags are suggestions, not paperwork.** Auto-tagging is silent; you correct it later if you care.
5. **Filters, not folders.** Entries live in one chronological store. Themes and emotions are tags. Any "collection" is a filtered view.
6. **Native by default.** Reach for a native component before a custom one.

## 6. Visual identity

- **Direction:** warm cream background, serif large titles (system serif), small-caps tracked labels, soft rounded cards with no heavy shadows, system sans for body text.
- **Accent:** the existing brand pink (`#D9557A` dark, `#FFC9DA` light), replacing the amber of the reference apps.
- **Emotion colors:** the existing per-emotion pastel palette.
- **Dark mode:** supported, follows the system setting, and uses a deep plum background instead of pure black.
- **References** (in `App UX inspirations/`): 5 Minute Journal for the cream and serif look, the feed grouping and the stat tiles; Apple Journal for the audio playback card; the dark color-block app for the streak row; pillowtalk for restraint.

## 7. Information architecture

Four native tabs: **Home**, **Entries**, **Insights**, **Settings**. Media (attached photos, files, links) is deliberately not a tab; it lives in Settings.

## 8. Screen requirements

### 8.1 Home
- Top to bottom: a streak row, a warm time-of-day greeting with "How are you feeling today?" (copy only, no mood picker; emotion is auto-detected), the **big Record button** (the hero), a smaller **Write** button, and a "Today" section.
- **Streak row:** seven weekday dots for the current week with today ringed, the current streak count, and the record streak. On the first save of the day: a haptic and a checkmark animation inside the save toast. There is no full-screen celebration.
- **Today section** shows only today's entries, deliberately avoiding an infinite feed. Empty state: "Nothing yet today. Speak or write your first thought." Past days are reached through Entries.
- Entry cards on Home have a "..." menu for edit and delete.
- Pull to refresh. A lightweight toast confirms saves (not a modal).
- Home is never gated on a server or network connection.

### 8.2 Recorder
- Tapping Record opens a full-screen sheet and **starts recording immediately** (one tap to record; the microphone permission prompt appears on the very first tap, with a one-line explanation).
- Shows a live waveform and timer, with pause and discard controls.
- **Stop saves the entry immediately.** There is no review step. The entry appears with a "Transcribing..." state until the transcript is ready. Transcription failure keeps the audio and offers a retry.
- After save: the silent auto-tag runs (section 9) and the toast shows.

### 8.3 Composer (text)
- **Write** opens a sheet with a text editor and a "+" menu for attachments (photos, files, links). The same sheet is used to edit an existing entry, where it also shows the tag editor (theme tags, and emotions with a maximum of three).
- Cancel and Save in the toolbar. Errors appear inline.

### 8.4 Entries
- A chronological list under **month and day headers**, newest first.
- A **horizontal chip strip** pinned under the search bar is the collections feature: an "All" chip first, then one chip per tag, each with an entry count, ordered by count with selected chips moving to the front. Overflow goes into a "More" chip that opens a searchable sheet.
- **Filter semantics:** multi-select. Chips within the strip combine as OR. The strip combined with the emotion filter is AND (for example "work or travel", and "anxious").
- **Emotion filter** is a native menu. **Sort** is a native menu (newest, oldest).
- **Search** covers text, theme and emotion.
- Tapping an entry pushes the **Entry detail**. Edit and delete are native swipe actions and a context menu.
- Tapping a day in the Insights heatmap, or an emotion bubble, opens Entries with that filter applied. Entries has no separate calendar screen and no separate Collections page.
- Empty state: "No entries yet. Go record one!"

### 8.5 Entry detail
- For voice entries: an **audio player card** (waveform, scrub, back and forward 15 seconds) with the transcript underneath.
- Tags (themes and up to three emotions) shown by name and editable; attachments; created timestamp; edit and delete.

### 8.6 Insights
One scrollable page. Sections, top to bottom:
1. **Period picker:** 3M / 6M / 12M / Year / All. It drives the emotion map, snapshot, stat tiles, mood-over-time and heatmap.
2. **Emotion map:** valence and arousal bubbles, sized by count. Tapping a bubble opens Entries filtered to that emotion.
3. **Snapshot:** entry count, most-written theme, most-felt emotion, plus an actionable card (what, why, how) for the selected emotion.
4. **Stat tiles:** current streak, record streak, total entries, days journaling.
5. **Mood over time:** an area chart of valence per entry over the selected period.
6. **Journaling heatmap:** frequency by day over the selected period (the SwiftUI heatmap ignored the period picker, which is fixed here). Tapping a day opens Entries for that day.

- **Later (not v1):** a written summary layer (what you've been feeling, writing about, and what's top of mind), a frequent-words view, and a weekly mood view. The written summary needs an LLM, so it follows the architecture decision in section 11.
- Filters from the Entries chip strip do not carry over to Insights in v1. The strip's filter state should be one shared value so Insights can reuse it later.

### 8.7 Settings
- **Reminders:** on/off, time, and weekday selection, delivered as local notifications.
- **Appearance:** system, light or dark.
- **Media:** a grid of all attached photos, files and links.
- **Data:** export all entries as JSON plus audio through the iOS share sheet. This is the backup story for a phone-only store.
- **Advanced:** optional server URL and key (only if a server remains part of the architecture, see section 11).
- **About.**

### 8.8 Onboarding and permissions
- **No welcome carousel.**
- The microphone permission is requested at the first Record tap (section 8.2).
- The **reminder is offered right after the first saved entry** ("Want a nudge tomorrow at 8pm?"), and the notification permission is requested only if the user accepts.

### 8.9 Default states (assumed unless changed)
- Loading: skeleton or native progress indicator, never a blocking spinner over capture.
- Transcribing: inline on the entry card and detail.
- Errors: inline text next to the thing that failed, with a retry where one makes sense.

## 9. Tagging model

- **Themes are open-ended tags.** An entry has up to about 3 tags. Auto-tagging suggests them, seeded from the original 10-theme catalog so names stay consistent. The user can add, rename or remove tags, and these tags feed the Entries chip strip.
- **Emotions are one-to-many, with a maximum of three per entry.** An entry can carry up to three emotions (for example happy, anxious and tired) and is filed under all of them. Auto-tagging never assigns more than three, and when editing you can tap at most three emotions; a fourth tap is disabled until one is removed. The first tag is the "primary" emotion for tight UI spots (a card dot, a thumbnail); collections and insights treat every tag as fully valid.
- **The emotion map aggregates by full count:** each tag counts fully toward its emotion, not split-weighted, because it reads more intuitively as frequency.
- **Silent auto-tag, editable later.** There is no confirm step after save. Corrections happen in the Composer or on the Entry detail. Corrections are recorded, because they quietly build a labeled dataset for a better tagger later.
- Entries are the single source of truth. Theme and emotion tags are attributes of an entry, never folders an entry is moved into.

## 10. Data requirements (what we must store)

This section states *what* data the UX needs. It deliberately does not choose the storage technology (section 11).

| Data | Fields the UX needs | Notes |
|---|---|---|
| **Entry** | id, kind (voice or text), created timestamp (ISO 8601 UTC), text (transcript or typed), transcription status (pending, done, failed), user-edited flag | One store, ordered by created timestamp. |
| **Tag (theme)** | name, per-entry assignment, source (auto or user), confidence | Open-ended. Up to about 3 per entry. Entry counts per tag must be cheap to compute for the chip strip. |
| **Emotion assignment** | emotion name, per-entry, order (first is primary), valence, arousal | Up to 3 per entry. Valence and arousal drive the emotion map and the mood-over-time chart. |
| **Audio recording** | file, duration, waveform data (for the player card), owning entry | Voice entries keep their audio. The SwiftUI app discarded it. |
| **Attachment** | type (photo, file, link), file or URL, owning entry | Photos, files and links, browsable in Settings. |
| **Streak inputs** | the set of days that have at least one entry | Derived from entries, not stored separately. Timezone-aware. |
| **Settings** | reminder on/off, time, weekdays; appearance | Small key-value data. |

**Constraints the UX places on storage:**
1. **Saving never blocks on the network** (design principle 3). The entry and its audio are durable on the phone before any transcription or tagging happens.
2. **Filter and count queries must be fast:** by tag (OR), by emotion (AND), by day, by text, and by period, over thousands of entries.
3. **Export must be possible** (JSON plus audio files).
4. Data stays private: nothing leaves the device unless the user opts in to a feature that needs it.

## 11. Architecture decisions (deferred, with timing)

The UX decisions above fix the *requirements* on data. The following *technology* choices are not made yet. **They are decided in a dedicated architecture pass right after this UX plan is approved, and before any code is written for build step 1 (the data layer, section 13).** The UX plan does not need to wait for them, and they do not need to be made earlier.

| Decision | Options | UX consequence |
|---|---|---|
| **Where entries live** | On-device SQLite (`expo-sqlite`) with audio and media as files on disk and only their paths in the database (recommended direction); or the existing Express and `better-sqlite3` backend | Direction already set: the phone must work alone (section 5, principle 3). |
| **Transcription** | On-device speech recognition; Whisper on a Mac server or cloud when reachable | Drives the "Transcribing..." state length and the failure and retry path. |
| **Auto-tagging and emotion** | Keyword rules on-device; an LLM API or server call when reachable | Drives tag quality, and the written summary in Insights. |
| **Backup or sync** | Export only; iCloud or another sync later | Export in Settings is required either way. |
| **Server's role** | Retire it; keep it as an optional booster (Whisper, LLM tagging); or keep it as a sync target | Decides whether the Advanced settings section exists. |

## 12. User stories

| # | As me, I want to... | So that... | Acceptance criteria |
|---|---|---|---|
| U1 | open the app and immediately record | capturing a thought takes under 2 seconds | The Record button is the largest element on Home; one tap opens the recorder and starts recording. |
| U2 | type an entry instead | I can journal silently | Write produces an entry identical in every other way to a voice one. |
| U3 | attach a photo, file or link | I keep context with the memory | Attachments show on the entry and in Settings, Media. |
| U4 | have the date and time recorded | I never think about it | Every entry shows its created timestamp. |
| U5 | have themes and emotions detected for me | I don't tag by hand | After save, tags appear on the entry with no extra step. |
| U6 | correct a wrong tag | my data stays accurate | Editing tags updates the entry immediately. |
| U7 | filter my entries with tag chips | I can revisit a topic or mood in one tap | The chip strip filters the list; multiple chips combine as OR; the emotion filter adds AND. |
| U8 | see my emotions as a visual map | I notice patterns over time | The bubble map renders for the selected period; tapping a bubble opens its entries. |
| U9 | replay my voice entries | the memory is in my own voice | The Entry detail plays the saved audio with a waveform and shows the transcript. |
| U10 | see my streak and this week at a glance | I feel the pull to come back | Home shows weekday dots, the current streak and the record streak. |
| U11 | get a reminder at a time I choose | I stop forgetting to journal | Settings sets day and time; a local notification fires; it is offered after the first entry. |
| U12 | export my data | a lost phone does not lose my journal | Settings, Data exports JSON plus audio via the share sheet. |

## 13. Build phases

1. Theme, app shell and data layer (needs the section 11 decisions).
2. Record, save and Home.
3. Entries: chip strip, search, detail and edit.
4. Text composer and attachments.
5. Reminders and Settings (including export).
6. Insights.
7. Polish.

**No cutover gate.** The SwiftUI app is retired from the start (section 4). The trade-off is that there is no working phone client until the daily loop (steps 1 to 5) exists in Expo, so the build should reach a usable Home, Record and Entries as early as possible.

## 14. Non-goals

- No login, accounts or sync across devices in v1.
- No sharing or social features.
- No Android, and no iPad-specific layout.
- No perfect AI categorization: "good enough and easy to correct" beats "perfect".
- Hand-made cross-theme collections (for example a "Japan trip" set). Tag filters cover the need; saved filters could come later.
- No encryption at rest in v1 (a known gap).
- No full-screen streak celebration, no mood picker at capture, no welcome carousel.

## 15. Success criteria

The app is "done" for v1 when, on my iPhone, I can:
1. Tap Record and start speaking in one tap, stop, and see a saved entry that transcribes and tags itself, with the phone offline.
2. Write a text entry and attach a photo, and see both on the entry.
3. Correct a tag and see it stick, and see it reflected in the chip strip counts.
4. Filter Entries with two chips and the emotion menu and get the expected set.
5. Replay a voice entry's audio from the Entry detail.
6. Open Insights, pick a period, tap an emotion bubble or a heatmap day, and land on the matching entries.
7. Get a daily reminder at the time I set.
8. Export everything, close and reopen the app, and find all my data still there.

## 16. Decision log

| Date | Decision |
|---|---|
| earlier | Entries are the single source of truth; theme and emotion are tags, not folders. |
| earlier | Emotions are one-to-many per entry; the map aggregates by full count; the first tag is primary. |
| earlier | Target platform is iPhone. |
| 2026-09-18 | Build the client with Expo; use real native components (`NativeTabs`, `@expo/ui`). Expo fully replaces the SwiftUI app. |
| 2026-09-20 | Home hero is the big Record button, with greeting and streak above it. |
| 2026-09-20 | Silent auto-tag with a toast on save; tags are editable later (no confirm step). |
| 2026-09-20 | Charts are custom-drawn inside native chrome (`@expo/ui` has no Swift Charts in SDK 57). |
| 2026-09-20 | The plan lives in this PRD; the separate requirements doc is retired. |
| 2026-09-20 | The phone must work without a server; saving never blocks on network. Storage technology is decided in a separate architecture pass (section 11). |
| 2026-09-20 | Warm cream and serif identity with the brand pink accent; deep-plum dark mode. |
| 2026-09-20 | Full-screen recorder that starts on tap; stop saves immediately. |
| 2026-09-20 | Voice entries keep their audio, with a player on the detail screen. |
| 2026-09-20 | Streak row with weekday dots, current and record streak, and a light celebration on first save. |
| 2026-09-20 | Entries: month and day headers, plus a horizontal tag chip strip (multi-select, OR within tags, AND with emotion). No separate Collections page. |
| 2026-09-20 | Tags are open-ended (about 3 per entry, seeded from the 10-theme catalog). |
| 2026-09-20 | Insights v1: parity (emotion map, snapshot, heatmap), stat tiles and mood-over-time. Written summary, frequent words and weekly mood come later. Written summary, frequent words and weekly mood come later. |
| 2026-09-20 | Filters do not carry over to Insights in v1. |
| 2026-09-20 | No onboarding carousel; permissions in context; reminder offered after the first entry. |
| 2026-09-20 | Settings includes Data export. |
| 2026-09-20 | Retire the SwiftUI app from the start, with no cutover gate. The web prototype is no longer developed; its removal is decided with the architecture pass. |
| 2026-09-20 | Emotions are capped at three per entry, for auto-tagging and for manual edits. |
| 2026-09-20 | Android is a non-goal; the streak day rolls over at midnight. |
| 2026-09-20 | No separate month calendar: the Insights heatmap is the view of which days have entries, and it now respects the period picker. |
| superseded | The old "PWA vs backend vs Capacitor" question is resolved: a native Expo app. The "backend appetite" question is now the section 11 architecture pass. |

## 17. Open questions

- The section 11 architecture decisions (storage engine, transcription, auto-tagging, backup and sync, the server's role).
- The exact limit on theme tags per entry (currently "about 3") and normalization rules (for example merging near-duplicate tags).
- Whether to delete the `ios/` SwiftUI code and the `frontend/` web prototype from the repo now, or leave them in place until the architecture pass.

## 18. Roadmap beyond v1

- **Written summary layer**, frequent words and weekly mood in Insights.
- **Theme-scoped Insights** (the emotion map for one tag), reusing the shared filter state.
- **Saved filters** as lightweight collections.
- **Better AI:** on-device or local transcription, LLM-based categorization, real text embeddings for the emotion map.
- **Publish:** App Store provisioning, privacy nutrition labels, TestFlight, the review process.
