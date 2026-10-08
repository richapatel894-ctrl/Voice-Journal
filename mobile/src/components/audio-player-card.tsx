import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { AudioRecording } from '@/data';
import { useTheme } from '@/hooks/use-theme';

type AudioPlayerCardProps = {
  audio: AudioRecording;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const SKIP_SECONDS = 15;

export function AudioPlayerCard({ audio }: AudioPlayerCardProps) {
  const theme = useTheme();
  const player = useAudioPlayer(audio.filePath);
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(0);

  const duration = status.duration || audio.durationMs / 1000;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const bars = audio.waveform.length > 0 ? audio.waveform : [0.2, 0.4, 0.3, 0.5, 0.2];

  const skip = (seconds: number) => {
    const target = Math.max(0, Math.min(duration, status.currentTime + seconds));
    player.seekTo(target);
  };

  const seekAtLocation = (locationX: number) => {
    if (trackWidth === 0 || duration === 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
    player.seekTo(ratio * duration);
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onPress={(e) => seekAtLocation(e.nativeEvent.locationX)}
        style={styles.waveform}>
        {bars.map((amplitude, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: 4 + amplitude * 36,
                backgroundColor: i / bars.length <= progress ? theme.accent : theme.backgroundSelected,
              },
            ]}
          />
        ))}
      </Pressable>

      <View style={styles.timeRow}>
        <ThemedText type="label" themeColor="textSecondary">
          {formatTime(status.currentTime)}
        </ThemedText>
        <ThemedText type="label" themeColor="textSecondary">
          {formatTime(duration)}
        </ThemedText>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={() => skip(-SKIP_SECONDS)} hitSlop={12}>
          <ThemedText type="smallBold">⟲ 15</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => (status.playing ? player.pause() : player.play())}
          style={[styles.playButton, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            {status.playing ? 'Pause' : 'Play'}
          </ThemedText>
        </Pressable>
        <Pressable onPress={() => skip(SKIP_SECONDS)} hitSlop={12}>
          <ThemedText type="smallBold">15 ⟳</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 44,
    paddingVertical: Spacing.one,
  },
  bar: { flex: 1, borderRadius: 2, minWidth: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.five },
  playButton: { paddingHorizontal: Spacing.five, paddingVertical: Spacing.two, borderRadius: Spacing.five },
});
