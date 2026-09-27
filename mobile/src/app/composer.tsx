import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  computeStreak,
  createEntry,
  emitEntrySaved,
  getEntry,
  newId,
  processNewEntry,
  updateEntryText,
} from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { localDayString } from '@/lib/date';

export default function ComposerScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(!isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getEntry(db, id).then((entry) => {
      setText(entry?.text ?? '');
      setLoaded(true);
    });
  }, [db, id]);

  const save = async () => {
    if (saving || text.trim().length === 0) return;
    setSaving(true);

    if (id) {
      await updateEntryText(db, id, text.trim());
      const entry = await getEntry(db, id);
      if (entry) emitEntrySaved(entry);
    } else {
      const streakBefore = await computeStreak(db);
      const isFirstEntryToday = !streakBefore.daysWithEntries.has(localDayString());

      const newEntryId = newId();
      await createEntry(db, {
        id: newEntryId,
        kind: 'text',
        createdAt: new Date().toISOString(),
        text: text.trim(),
        transcriptionStatus: 'done',
      });
      const entry = await getEntry(db, newEntryId);
      if (entry) {
        if (isFirstEntryToday) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        emitEntrySaved(entry);
        processNewEntry(db, entry);
      }
    }

    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.toolbar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
          <Pressable onPress={save} hitSlop={12} disabled={saving || text.trim().length === 0}>
            <ThemedText type="smallBold" themeColor={text.trim().length === 0 ? 'textSecondary' : 'accent'}>
              Save
            </ThemedText>
          </Pressable>
        </View>

        {loaded && (
          <TextInput
            style={[styles.input, { color: theme.text }]}
            multiline
            autoFocus
            placeholder="What's on your mind?"
            placeholderTextColor={theme.textSecondary}
            value={text}
            onChangeText={setText}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.four },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { flex: 1, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
});
