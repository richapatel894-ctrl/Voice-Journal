import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Entry } from '@/data';

type EntryRowProps = {
  entry: Entry;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** "8:15 AM" -> { hour: '8:15', period: 'AM' } for the two-line time chip. */
function timeChipParts(iso: string): { hour: string; period: string } {
  const formatted = new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const [hour, period] = formatted.split(/[\s\u202f]+/);
  return { hour, period: period ?? '' };
}

export function EntryRow({ entry, onPress, onEdit, onDelete }: EntryRowProps) {
  const isTranscribing = entry.kind === 'voice' && entry.transcriptionStatus === 'pending';
  const preview = isTranscribing ? 'Transcribing…' : entry.text || '(empty entry)';
  const label = entry.tags[0]?.tag ?? (entry.kind === 'voice' ? 'Voice entry' : 'Journal entry');
  const { hour, period } = timeChipParts(entry.createdAt);

  const openMenu = () => {
    Alert.alert(entry.kind === 'voice' ? 'Voice entry' : 'Text entry', undefined, [
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
    <Pressable onPress={onPress} style={styles.row}>
      <ThemedView type="backgroundElement" style={styles.chip}>
        <ThemedText type="label" themeColor="textSecondary" style={styles.chipPeriod}>
          {period}
        </ThemedText>
        <ThemedText style={styles.chipHour}>{hour}</ThemedText>
      </ThemedView>

      <View style={styles.body}>
        <ThemedText type="label" themeColor="textSecondary" numberOfLines={1}>
          {label}
          {entry.kind === 'voice' && entry.tags[0] ? '  ·  VOICE' : ''}
        </ThemedText>
        <ThemedText
          style={styles.text}
          themeColor={isTranscribing ? 'textSecondary' : 'text'}
          numberOfLines={3}>
          {preview}
        </ThemedText>
      </View>

      <Pressable hitSlop={12} onPress={openMenu} style={styles.menuButton}>
        <ThemedText themeColor="textSecondary">⋯</ThemedText>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chip: {
    width: 56,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  chipPeriod: { fontSize: 11, lineHeight: 14 },
  chipHour: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  body: { flex: 1, gap: Spacing.half },
  text: { fontSize: 17, lineHeight: 24 },
  menuButton: { paddingHorizontal: Spacing.one, paddingTop: Spacing.one },
});
