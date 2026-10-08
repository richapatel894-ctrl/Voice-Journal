import type { SQLiteDatabase } from 'expo-sqlite';

import { toStoredPath } from '@/data/storage';
import type { AudioRecording } from '@/data/types';

/** Attaches the recorded audio to a voice entry (PRD §8.5: voice entries keep their audio). */
export async function setEntryAudio(db: SQLiteDatabase, audio: AudioRecording): Promise<void> {
  await db.runAsync(
    `INSERT INTO audio_recordings (entry_id, file_path, duration_ms, waveform)
     VALUES ($entryId, $filePath, $durationMs, $waveform)
     ON CONFLICT (entry_id) DO UPDATE SET
       file_path = excluded.file_path,
       duration_ms = excluded.duration_ms,
       waveform = excluded.waveform`,
    {
      $entryId: audio.entryId,
      $filePath: toStoredPath(audio.filePath),
      $durationMs: audio.durationMs,
      $waveform: JSON.stringify(audio.waveform),
    }
  );
}
