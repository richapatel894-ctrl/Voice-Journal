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

/**
 * The app container's UUID changes on reinstall/update, so absolute file URIs saved in the
 * database go stale. The database stores paths relative to the Documents directory
 * (e.g. `audio/<uuid>.m4a`); these helpers convert at the data-layer boundary so the rest of
 * the app keeps working with full URIs.
 */
export function toStoredPath(uri: string | null): string | null {
  if (!uri) return uri;
  const root = Paths.document.uri.endsWith('/') ? Paths.document.uri : `${Paths.document.uri}/`;
  return uri.startsWith(root) ? uri.slice(root.length) : uri;
}

export function resolveStoredPath(stored: string | null): string | null {
  if (!stored || stored.includes('://')) return stored;
  const root = Paths.document.uri.endsWith('/') ? Paths.document.uri : `${Paths.document.uri}/`;
  return `${root}${stored}`;
}

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
