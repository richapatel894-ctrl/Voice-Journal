import type { SQLiteDatabase } from 'expo-sqlite';

import type { Attachment, AttachmentType } from '@/data/types';

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

function fromRow(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    entryId: row.entry_id,
    type: row.type,
    filePath: row.file_path,
    thumbnailPath: row.thumbnail_path,
    fileSize: row.file_size,
    durationMs: row.duration_ms,
    url: row.url,
    title: row.title,
    createdAt: row.created_at,
  };
}

export async function addAttachment(
  db: SQLiteDatabase,
  attachment: Attachment
): Promise<void> {
  await db.runAsync(
    `INSERT INTO attachments
       (id, entry_id, type, file_path, thumbnail_path, file_size, duration_ms, url, title, created_at)
     VALUES
       ($id, $entryId, $type, $filePath, $thumbnailPath, $fileSize, $durationMs, $url, $title, $createdAt)`,
    {
      $id: attachment.id,
      $entryId: attachment.entryId,
      $type: attachment.type,
      $filePath: attachment.filePath,
      $thumbnailPath: attachment.thumbnailPath,
      $fileSize: attachment.fileSize,
      $durationMs: attachment.durationMs,
      $url: attachment.url,
      $title: attachment.title,
      $createdAt: attachment.createdAt,
    }
  );
}

/** Every attachment across all entries, newest first — the Media page (PRD §8.8). */
export async function listAllAttachments(
  db: SQLiteDatabase,
  type?: AttachmentType
): Promise<Attachment[]> {
  const rows = type
    ? await db.getAllAsync<AttachmentRow>(
        'SELECT * FROM attachments WHERE type = ? ORDER BY created_at DESC',
        type
      )
    : await db.getAllAsync<AttachmentRow>('SELECT * FROM attachments ORDER BY created_at DESC');
  return rows.map(fromRow);
}

export async function getAttachment(db: SQLiteDatabase, id: string): Promise<Attachment | null> {
  const row = await db.getFirstAsync<AttachmentRow>('SELECT * FROM attachments WHERE id = ?', id);
  return row ? fromRow(row) : null;
}

/** Removes the database row only; deleting the underlying file(s) on disk is the caller's job (see src/data/storage.ts). */
export async function deleteAttachment(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM attachments WHERE id = ?', id);
}
