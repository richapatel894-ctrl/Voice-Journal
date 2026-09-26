import type { SQLiteDatabase } from 'expo-sqlite';

import type { TagCount, ThemeTag } from '@/data/types';

/** Replaces all theme tags on an entry — the LLM re-tags, or a user edits, replace the whole set rather than diffing it. */
export async function setEntryTags(db: SQLiteDatabase, entryId: string, tags: ThemeTag[]): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM entry_tags WHERE entry_id = ?', entryId);
    for (const tag of tags) {
      await txn.runAsync(
        'INSERT INTO entry_tags (entry_id, tag, source, confidence) VALUES ($entryId, $tag, $source, $confidence)',
        { $entryId: entryId, $tag: tag.tag, $source: tag.source, $confidence: tag.confidence }
      );
    }
  });
}

/** Entry counts per theme tag, ordered highest first — feeds the Entries chip strip (PRD §8.4). */
export async function tagCounts(db: SQLiteDatabase): Promise<TagCount[]> {
  return db.getAllAsync<TagCount>(
    `SELECT tag, COUNT(*) as count FROM entry_tags GROUP BY tag ORDER BY count DESC, tag ASC`
  );
}
