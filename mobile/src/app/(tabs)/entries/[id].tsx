import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AudioPlayerCard } from '@/components/audio-player-card';
import { TagChip } from '@/components/tag-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteEntry, deleteEntryFiles, getEntry, type Entry } from '@/data';

export default function EntryDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);

  useFocusEffect(
    useCallback(() => {
      getEntry(db, id).then(setEntry);
    }, [db, id])
  );

  const onDelete = () => {
    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!entry) return;
          deleteEntryFiles(entry);
          await deleteEntry(db, entry.id);
          router.back();
        },
      },
    ]);
  };

  if (!entry) return null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText themeColor="textSecondary">
            {new Date(entry.createdAt).toLocaleString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </ThemedText>
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push({ pathname: '/composer', params: { id: entry.id } })}
              hitSlop={12}>
              <ThemedText type="smallBold" themeColor="accentText">
                Edit
              </ThemedText>
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={12}>
              <ThemedText type="smallBold" themeColor="accentText">
                Delete
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {entry.audio && <AudioPlayerCard audio={entry.audio} />}

        <ThemedText>
          {entry.kind === 'voice' && entry.transcriptionStatus === 'pending'
            ? 'Transcribing…'
            : entry.text || '(empty entry)'}
        </ThemedText>

        {(entry.tags.length > 0 || entry.emotions.length > 0) && (
          <View style={styles.tagSection}>
            {entry.tags.length > 0 && (
              <View style={styles.chipRow}>
                {entry.tags.map((t) => (
                  <TagChip key={t.tag} label={t.tag} selected />
                ))}
              </View>
            )}
            {entry.emotions.length > 0 && (
              <View style={styles.chipRow}>
                {entry.emotions.map((e) => (
                  <TagChip key={e.emotion} label={e.emotion} variant="emotion" selected />
                ))}
              </View>
            )}
          </View>
        )}

        {entry.attachments.length > 0 && (
          <View style={styles.attachments}>
            <ThemedText type="label" themeColor="textSecondary">
              Attachments
            </ThemedText>
            {entry.attachments.map((a) => (
              <ThemedText key={a.id} type="small">
                {a.type === 'link' ? a.title || a.url : a.type}
              </ThemedText>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.four },
  tagSection: { gap: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  attachments: { gap: Spacing.one },
});
