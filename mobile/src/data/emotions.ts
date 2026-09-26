import type { SQLiteDatabase } from 'expo-sqlite';

import type { EmotionTag } from '@/data/types';

/** PRD §9: an entry carries at most three emotions. */
export const MAX_EMOTIONS_PER_ENTRY = 3;

/** Replaces all emotions on an entry. `emotions[0]` becomes the primary emotion. */
export async function setEntryEmotions(
  db: SQLiteDatabase,
  entryId: string,
  emotions: Omit<EmotionTag, 'position'>[]
): Promise<void> {
  if (emotions.length > MAX_EMOTIONS_PER_ENTRY) {
    throw new Error(`An entry may carry at most ${MAX_EMOTIONS_PER_ENTRY} emotions, got ${emotions.length}`);
  }
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM entry_emotions WHERE entry_id = ?', entryId);
    for (const [position, emotion] of emotions.entries()) {
      await txn.runAsync(
        `INSERT INTO entry_emotions (entry_id, emotion, position, valence, arousal)
         VALUES ($entryId, $emotion, $position, $valence, $arousal)`,
        {
          $entryId: entryId,
          $emotion: emotion.emotion,
          $position: position,
          $valence: emotion.valence,
          $arousal: emotion.arousal,
        }
      );
    }
  });
}
