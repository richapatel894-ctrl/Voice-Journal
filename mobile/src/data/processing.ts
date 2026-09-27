import type { SQLiteDatabase } from 'expo-sqlite';

import type { Entry } from '@/data/types';

/**
 * The seam where transcription (for voice entries) and LLM tagging plug in
 * (PRD §11). Deliberately a no-op for now: the transcription provider is an
 * open decision (only an OpenRouter key exists; Whisper needs an OpenAI key —
 * see the PRD's architecture table), so entries are left in their `pending`
 * state rather than calling a provider that isn't decided yet. Recorder and
 * Composer both call this after saving so wiring the real call later is a
 * one-function change, not a UI change.
 */
export async function processNewEntry(_db: SQLiteDatabase, _entry: Entry): Promise<void> {
  // Not implemented yet — see docs/PRD.md §11 "Transcription" (parked 2026-09-25).
}
