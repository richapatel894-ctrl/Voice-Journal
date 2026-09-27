import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { Entry } from '@/data/types';

/**
 * Where audio and attachment files live on disk. The database only ever
 * stores paths into these directories (PRD §10) — never binary content.
 */
export const audioDirectory = new Directory(Paths.document, 'audio');
export const attachmentsDirectory = new Directory(Paths.document, 'attachments');
export const thumbnailsDirectory = new Directory(Paths.document, 'thumbnails');

export function ensureDataDirectories(): void {
  for (const dir of [audioDirectory, attachmentsDirectory, thumbnailsDirectory]) {
    if (!dir.exists) dir.create({ intermediates: true });
  }
}

/** A fresh, collision-free file inside `directory`, e.g. `newFile(audioDirectory, 'm4a')`. */
export function newFile(directory: Directory, extension: string): File {
  return new File(directory, `${Crypto.randomUUID()}.${extension}`);
}

export function deleteIfExists(file: File): void {
  if (file.exists) file.delete();
}

/** Removes an entry's audio and attachment files from disk; call before deleting its database rows. */
export function deleteEntryFiles(entry: Entry): void {
  if (entry.audio) deleteIfExists(new File(entry.audio.filePath));
  for (const attachment of entry.attachments) {
    if (attachment.filePath) deleteIfExists(new File(attachment.filePath));
    if (attachment.thumbnailPath) deleteIfExists(new File(attachment.thumbnailPath));
  }
}
