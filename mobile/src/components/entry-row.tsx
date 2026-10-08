import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Entry } from '@/data';
import { formatTime } from '@/lib/date';

type EntryRowProps = {
  entry: Entry;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Offered in the ⋯ menu when a voice entry's transcription failed. */
  onRetry?: () => void;
};

export function EntryRow({ entry, onPress, onEdit, onDelete, onRetry }: EntryRowProps) {
  const isTranscribing = entry.kind === 'voice' && entry.transcriptionStatus === 'pending';
  const isFailed = entry.kind === 'voice' && entry.transcriptionStatus === 'failed';
  const preview = isTranscribing
    ? 'Transcribing…'
    : isFailed
      ? 'Couldn’t transcribe — see ⋯ to retry'
      : entry.text || '(empty entry)';

  const openMenu = () => {
    Alert.alert(entry.kind === 'voice' ? 'Voice entry' : 'Text entry', undefined, [
      ...(isFailed && onRetry ? [{ text: 'Retry transcription', onPress: onRetry }] : []),
      { text: 'Edit', onPress: onEdit },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete this entry?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Pressable onPress={onPress}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.iconWrap}>
          <ThemedText>{entry.kind === 'voice' ? '🎙' : '✏️'}</ThemedText>
        </View>
        <View style={styles.body}>
          <ThemedText
            type="small"
            themeColor={isTranscribing || isFailed ? 'textSecondary' : 'text'}
            numberOfLines={2}>
            {preview}
          </ThemedText>
          <ThemedText type="label" themeColor="textSecondary" style={styles.time}>
            {formatTime(entry.createdAt)}
          </ThemedText>
        </View>
        <Pressable hitSlop={12} onPress={openMenu} style={styles.menuButton}>
          <ThemedText themeColor="textSecondary">⋯</ThemedText>
        </Pressable>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  iconWrap: {
    paddingTop: Spacing.half,
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  time: {
    marginTop: Spacing.half,
  },
  menuButton: {
    paddingHorizontal: Spacing.one,
  },
});
