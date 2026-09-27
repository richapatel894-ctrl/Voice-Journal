import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  AttachmentType,
  Entry,
  EntryFilter,
  EntryKind,
  NewEntry,
  ProcessingStatus,
} from '@/data/types';

type EntryRow = {
  id: string;
  kind: EntryKind;
  created_at: string;
  text: string;
  transcription_status: ProcessingStatus;
  tagging_status: ProcessingStatus;
  tagging_model: string | null;
  user_edited: number;
};

type TagRow = { entry_id: string; tag: string; source: 'auto' | 'user'; confidence: number | null };
type EmotionRow = {
  entry_id: string;
  emotion: string;
  position: number;
  valence: number;
  arousal: number;
};
type AudioRow = { entry_id: string; file_path: string; duration_ms: number; waveform: string };
type AttachmentRow = {
  id: string;
  entry_id: string;
  type: AttachmentType;
  file_path: string | null;
  thumbnail_path: string | null;
  file_size: number | null;
  duration_ms: number | null;
  url: string | null;
  title: string | null;
  created_at: string;
};

const placeholders = (count: number) => Array(count).fill('?').join(', ');

async function hydrateEntries(db: SQLiteDatabase, rows: EntryRow[]): Promise<Entry[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const idList = placeholders(ids.length);

  const [tagRows, emotionRows, audioRows, attachmentRows] = await Promise.all([
    db.getAllAsync<TagRow>(`SELECT * FROM entry_tags WHERE entry_id IN (${idList})`, ids),
    db.getAllAsync<EmotionRow>(
      `SELECT * FROM entry_emotions WHERE entry_id IN (${idList}) ORDER BY position ASC`,
      ids
    ),
    db.getAllAsync<AudioRow>(`SELECT * FROM audio_recordings WHERE entry_id IN (${idList})`, ids),
    db.getAllAsync<AttachmentRow>(
      `SELECT * FROM attachments WHERE entry_id IN (${idList}) ORDER BY created_at ASC`,
      ids
    ),
  ]);

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    createdAt: row.created_at,
    text: row.text,
    transcriptionStatus: row.transcription_status,
    taggingStatus: row.tagging_status,
    taggingModel: row.tagging_model,
    userEdited: row.user_edited === 1,
    tags: tagRows
      .filter((t) => t.entry_id === row.id)
      .map((t) => ({ tag: t.tag, source: t.source, confidence: t.confidence })),
    emotions: emotionRows
      .filter((e) => e.entry_id === row.id)
      .map((e) => ({
        emotion: e.emotion,
        position: e.position,
        valence: e.valence,
        arousal: e.arousal,
      })),
    audio: (() => {
      const a = audioRows.find((r) => r.entry_id === row.id);
      return a
        ? { entryId: a.entry_id, filePath: a.file_path, durationMs: a.duration_ms, waveform: JSON.parse(a.waveform) }
        : null;
    })(),
    attachments: attachmentRows
      .filter((a) => a.entry_id === row.id)
      .map((a) => ({
        id: a.id,
        entryId: a.entry_id,
        type: a.type,
        filePath: a.file_path,
        thumbnailPath: a.thumbnail_path,
        fileSize: a.file_size,
        durationMs: a.duration_ms,
        url: a.url,
        title: a.title,
        createdAt: a.created_at,
      })),
  }));
}

export async function createEntry(db: SQLiteDatabase, entry: NewEntry): Promise<Entry> {
  await db.runAsync(
    `INSERT INTO entries (id, kind, created_at, text, transcription_status, tagging_status)
     VALUES ($id, $kind, $createdAt, $text, $transcriptionStatus, 'pending')`,
    {
      $id: entry.id,
      $kind: entry.kind,
      $createdAt: entry.createdAt,
      $text: entry.text,
      $transcriptionStatus: entry.transcriptionStatus,
    }
  );
  const created = await getEntry(db, entry.id);
  if (!created) throw new Error(`Entry ${entry.id} was inserted but could not be read back`);
  return created;
}

export async function getEntry(db: SQLiteDatabase, id: string): Promise<Entry | null> {
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  if (!row) return null;
  const [entry] = await hydrateEntries(db, [row]);
  return entry;
}

/**
 * Filters combine as: (any of `themes`) AND (all of `emotions`) AND (`search`
 * matches text, a theme or an emotion) — per PRD §8.4.
 */
export async function listEntries(db: SQLiteDatabase, filter: EntryFilter = {}): Promise<Entry[]> {
  const { themes = [], emotions = [], search, day, sort = 'newest' } = filter;
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (day) {
    clauses.push(`date(created_at, 'localtime') = ?`);
    params.push(day);
  }
  if (themes.length > 0) {
    clauses.push(
      `id IN (SELECT entry_id FROM entry_tags WHERE tag IN (${placeholders(themes.length)}))`
    );
    params.push(...themes);
  }
  if (emotions.length > 0) {
    clauses.push(`id IN (
      SELECT entry_id FROM entry_emotions
      WHERE emotion IN (${placeholders(emotions.length)})
      GROUP BY entry_id
      HAVING COUNT(DISTINCT emotion) = ?
    )`);
    params.push(...emotions, emotions.length);
  }
  if (search && search.trim().length > 0) {
    const q = `%${search.trim()}%`;
    clauses.push(`(
      text LIKE ?
      OR id IN (SELECT entry_id FROM entry_tags WHERE tag LIKE ?)
      OR id IN (SELECT entry_id FROM entry_emotions WHERE emotion LIKE ?)
    )`);
    params.push(q, q, q);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const order = sort === 'oldest' ? 'ASC' : 'DESC';
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries ${where} ORDER BY created_at ${order}`,
    params
  );
  return hydrateEntries(db, rows);
}

export async function updateEntryText(db: SQLiteDatabase, id: string, text: string): Promise<void> {
  await db.runAsync('UPDATE entries SET text = ?, user_edited = 1 WHERE id = ?', text, id);
}

export async function setTranscriptionResult(
  db: SQLiteDatabase,
  id: string,
  result: { status: ProcessingStatus; text?: string }
): Promise<void> {
  if (result.text !== undefined) {
    await db.runAsync(
      'UPDATE entries SET transcription_status = ?, text = ? WHERE id = ?',
      result.status,
      result.text,
      id
    );
  } else {
    await db.runAsync('UPDATE entries SET transcription_status = ? WHERE id = ?', result.status, id);
  }
}

export async function setTaggingResult(
  db: SQLiteDatabase,
  id: string,
  result: { status: ProcessingStatus; model?: string }
): Promise<void> {
  await db.runAsync(
    'UPDATE entries SET tagging_status = ?, tagging_model = ? WHERE id = ?',
    result.status,
    result.model ?? null,
    id
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: string): Promise<void> {
  // Attachment and audio files on disk are the caller's responsibility to
  // remove first (see src/data/storage.ts) — this only clears the database
  // rows, which cascade to entry_tags, entry_emotions, audio_recordings and
  // attachments via ON DELETE CASCADE.
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}
