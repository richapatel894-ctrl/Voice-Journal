import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { EmotionMascot, hasMascot } from '@/components/emotion-mascot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Entry } from '@/data';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
  const isTranscribing = entry.kind === 'voice' && entry.transcriptionStatus === 'pending';
  const isFailed = entry.kind === 'voice' && entry.transcriptionStatus === 'failed';
  const preview = isTranscribing
    ? 'Transcribing…'
    : isFailed
      ? 'Couldn’t transcribe — see ⋯ to retry'
      : entry.text || (entry.kind === 'voice' ? 'No speech detected' : '(empty entry)');

  // An entry saved moments ago gets a pop-in when its mascot appears (tagging finishes a few seconds after saving).
  const [justSaved] = useState(() => Date.now() - new Date(entry.createdAt).getTime() < 120000);
  const primary = entry.emotions.find((e) => hasMascot(e.emotion))?.emotion;

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
          {primary ? (
            <Animated.View key={primary} entering={justSaved ? ZoomIn.springify().damping(11) : undefined}>
              <EmotionMascot emotion={primary} size={44} />
            </Animated.View>
          ) : (
            <ThemedText>{entry.kind === 'voice' ? '🎙' : '✏️'}</ThemedText>
          )}
        </View>
        <View style={styles.body}>
          <ThemedText
            type="small"
            themeColor={isTranscribing || isFailed ? 'textSecondary' : 'text'}
            numberOfLines={2}>
            {preview}
          </ThemedText>
          {entry.emotions.length > 0 && (
            <View style={styles.pills}>
              {entry.emotions.map((e) => (
                <View key={e.emotion} style={[styles.pill, { backgroundColor: theme.accentSoft }]}>
                  {hasMascot(e.emotion) && <EmotionMascot emotion={e.emotion} size={16} />}
                  <ThemedText type="label" themeColor="accent" style={styles.pillText}>
                    {e.emotion}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
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
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.half },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingVertical: 2, paddingLeft: 4, paddingRight: 8 },
  pillText: { letterSpacing: 0.3, textTransform: 'none' },
  time: {
    marginTop: Spacing.half,
  },
  menuButton: {
    paddingHorizontal: Spacing.one,
  },
});
