import { randomUUID as newId } from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { attachmentsDirectory, newFile, thumbnailsDirectory } from '@/data/storage';
import type { Attachment } from '@/data/types';

/** What the composer stages locally before Save actually persists it (PRD §8.8: files are copied at save time). */
export type PendingAttachment =
  | { kind: 'photo'; uri: string; fileSize: number | null }
  | { kind: 'video'; uri: string; durationMs: number | null; fileSize: number | null }
  | { kind: 'file'; uri: string; name: string; fileSize: number | null }
  | { kind: 'link'; url: string; title: string };

const PHOTO_MAX_DIMENSION = 2000;
const THUMBNAIL_MAX_DIMENSION = 300;

async function resizeToFile(sourceUri: string, maxDimension: number, destination: ReturnType<typeof newFile>) {
  const context = ImageManipulator.manipulate(sourceUri);
  const rendered = await context.resize({ width: maxDimension }).renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  await new File(result.uri).move(destination);
  return destination;
}

/** Copies/resizes a staged attachment into permanent storage and builds its database record. Call `addAttachment` with the result. */
export async function persistPendingAttachment(entryId: string, pending: PendingAttachment): Promise<Attachment> {
  const id = newId();
  const createdAt = new Date().toISOString();
  const base: Pick<Attachment, 'id' | 'entryId' | 'createdAt'> = { id, entryId, createdAt };

  if (pending.kind === 'photo') {
    const file = await resizeToFile(pending.uri, PHOTO_MAX_DIMENSION, newFile(attachmentsDirectory, 'jpg'));
    const thumbnail = await resizeToFile(pending.uri, THUMBNAIL_MAX_DIMENSION, newFile(thumbnailsDirectory, 'jpg'));
    return {
      ...base,
      type: 'photo',
      filePath: file.uri,
      thumbnailPath: thumbnail.uri,
      fileSize: pending.fileSize,
      durationMs: null,
      url: null,
      title: null,
    };
  }

  if (pending.kind === 'video') {
    const destination = newFile(attachmentsDirectory, 'mov');
    await new File(pending.uri).copy(destination);
    return {
      ...base,
      type: 'video',
      filePath: destination.uri,
      // No frame thumbnail yet — deferred; the Media page falls back to a generic video icon.
      thumbnailPath: null,
      fileSize: pending.fileSize,
      durationMs: pending.durationMs,
      url: null,
      title: null,
    };
  }

  if (pending.kind === 'file') {
    const extension = pending.name.includes('.') ? pending.name.split('.').pop()! : 'dat';
    const destination = newFile(attachmentsDirectory, extension);
    await new File(pending.uri).copy(destination);
    return {
      ...base,
      type: 'file',
      filePath: destination.uri,
      thumbnailPath: null,
      fileSize: pending.fileSize,
      durationMs: null,
      url: null,
      title: pending.name,
    };
  }

  return {
    ...base,
    type: 'link',
    filePath: null,
    thumbnailPath: null,
    fileSize: null,
    durationMs: null,
    url: pending.url,
    title: pending.title || pending.url,
  };
}
