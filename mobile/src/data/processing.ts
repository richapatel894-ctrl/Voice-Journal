import type { SQLiteDatabase } from 'expo-sqlite';

import { getEntry, listEntries, setTaggingResult, setTranscriptionResult } from '@/data/entries';
import { setEntryEmotions } from '@/data/emotions';
import { emitEntryChanged } from '@/data/save-events';
import { setEntryTags, tagCounts } from '@/data/tags';
import { TAGGING_MODEL, THEME_CATALOG, tagEntryText } from '@/data/tagging';
import { hasTranscriptionKey, transcribeAudio } from '@/data/transcription';
import type { Entry } from '@/data/types';

/** Entries currently being processed, so a retry or app-start sweep can't double-submit one. */
const inFlight = new Set<string>();

async function transcribeVoiceEntry(db: SQLiteDatabase, entry: Entry): Promise<void> {
  if (entry.kind !== 'voice' || !entry.audio || entry.transcriptionStatus !== 'pending') return;
  try {
    const text = await transcribeAudio(entry.audio.filePath);
    await setTranscriptionResult(db, entry.id, { status: 'done', text });
  } catch {
    // The audio is kept; the entry shows a failed state with a retry (PRD §8.5).
    await setTranscriptionResult(db, entry.id, { status: 'failed' });
  }
}

async function tagEntry(db: SQLiteDatabase, entry: Entry): Promise<void> {
  if (entry.taggingStatus === 'done') return;
  // Tags the user set themselves (or earlier runs) are never overwritten (PRD principle 4).
  if (entry.tags.length > 0 || entry.emotions.length > 0) {
    await setTaggingResult(db, entry.id, { status: 'done' });
    return;
  }
  if (entry.transcriptionStatus !== 'done') return; // wait for the transcript
  if (!entry.text.trim()) {
    await setTaggingResult(db, entry.id, { status: 'done' });
    return;
  }
  try {
    const inUse = (await tagCounts(db)).map((t) => t.tag);
    const knownThemes = [...new Set([...THEME_CATALOG, ...inUse])];
    const { themes, emotions } = await tagEntryText(entry.text, knownThemes);
    await setEntryTags(db, entry.id, themes.map((t) => ({ tag: t.tag, source: 'auto', confidence: t.confidence })));
    await setEntryEmotions(db, entry.id, emotions);
    await setTaggingResult(db, entry.id, { status: 'done', model: TAGGING_MODEL });
  } catch {
    await setTaggingResult(db, entry.id, { status: 'failed' });
  }
}

/** Transcribe (voice entries) then tag, notifying visible screens after each step. */
async function processEntry(db: SQLiteDatabase, entryId: string): Promise<void> {
  if (inFlight.has(entryId)) return;
  // Without a key everything stays `pending` and is picked up once one exists.
  if (!hasTranscriptionKey()) return;

  inFlight.add(entryId);
  try {
    let entry = await getEntry(db, entryId);
    if (!entry) return;
    if (entry.kind === 'voice' && entry.transcriptionStatus === 'pending') {
      await transcribeVoiceEntry(db, entry);
      const updated = await getEntry(db, entryId);
      if (updated) emitEntryChanged(updated);
      entry = updated;
    }
    if (entry) await tagEntry(db, entry);
  } finally {
    inFlight.delete(entryId);
    const final = await getEntry(db, entryId);
    if (final) emitEntryChanged(final);
  }
}

/**
 * Called after Recorder and Composer save (PRD §11): transcribes voice entries with Whisper and
 * tags every entry with the LLM, in the background. Never throws: saving must not depend on this.
 */
export async function processNewEntry(db: SQLiteDatabase, entry: Entry): Promise<void> {
  await processEntry(db, entry.id);
}

/** Retry from the Entry detail screen / row menu after a failed transcription. */
export async function retryTranscription(db: SQLiteDatabase, entryId: string): Promise<void> {
  const entry = await getEntry(db, entryId);
  if (!entry) return;
  if (entry.transcriptionStatus === 'failed') {
    await setTranscriptionResult(db, entryId, { status: 'pending' });
    const pending = await getEntry(db, entryId);
    if (pending) emitEntryChanged(pending);
  }
  await processEntry(db, entryId);
}

/** App start: finish anything left unfinished (iOS suspended the app, or an earlier call failed). */
export async function resumePendingProcessing(db: SQLiteDatabase): Promise<void> {
  const entries = await listEntries(db);
  for (const entry of entries) {
    const needsTranscript = entry.kind === 'voice' && entry.transcriptionStatus === 'pending';
    const needsTags = entry.taggingStatus !== 'done' && entry.transcriptionStatus === 'done';
    if (needsTranscript || needsTags) await processEntry(db, entry.id);
  }
}
