import type { SQLiteDatabase } from 'expo-sqlite';

import { getEntry, listEntries, setTranscriptionResult } from '@/data/entries';
import { emitEntryChanged } from '@/data/save-events';
import { hasTranscriptionKey, transcribeAudio } from '@/data/transcription';
import type { Entry } from '@/data/types';

/** Entries currently being transcribed, so a retry or app-start sweep can't double-submit one. */
const inFlight = new Set<string>();

async function transcribeVoiceEntry(db: SQLiteDatabase, entry: Entry): Promise<void> {
  if (entry.kind !== 'voice' || !entry.audio || inFlight.has(entry.id)) return;
  // Without a key the entry stays `pending` and is picked up once one exists.
  if (!hasTranscriptionKey()) return;

  inFlight.add(entry.id);
  try {
    await setTranscriptionResult(db, entry.id, { status: 'pending' });
    const text = await transcribeAudio(entry.audio.filePath);
    await setTranscriptionResult(db, entry.id, { status: 'done', text });
  } catch {
    // The audio is kept; the entry shows a failed state with a retry (PRD §8.5).
    await setTranscriptionResult(db, entry.id, { status: 'failed' });
  } finally {
    inFlight.delete(entry.id);
    const updated = await getEntry(db, entry.id);
    if (updated) emitEntryChanged(updated);
  }
}

/**
 * The seam where transcription (for voice entries) and LLM tagging plug in (PRD §11).
 * Called after Recorder and Composer save. Voice entries are transcribed with Whisper via
 * OpenRouter; LLM tagging is not wired yet. Never throws: saving must not depend on this.
 */
export async function processNewEntry(db: SQLiteDatabase, entry: Entry): Promise<void> {
  await transcribeVoiceEntry(db, entry);
}

/** Retry from the Entry detail screen after a failed transcription. */
export async function retryTranscription(db: SQLiteDatabase, entryId: string): Promise<void> {
  const entry = await getEntry(db, entryId);
  if (entry) await transcribeVoiceEntry(db, entry);
}

/** App start: finish any voice entries left `pending` (e.g. iOS suspended the app mid-upload). */
export async function resumePendingTranscriptions(db: SQLiteDatabase): Promise<void> {
  const entries = await listEntries(db);
  for (const entry of entries) {
    if (entry.kind === 'voice' && entry.transcriptionStatus === 'pending') await transcribeVoiceEntry(db, entry);
  }
}
