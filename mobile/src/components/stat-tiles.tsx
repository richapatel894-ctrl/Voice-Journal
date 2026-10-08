import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type StatTilesProps = {
  currentStreak: number;
  recordStreak: number;
  totalEntries: number;
  daysJournaling: number;
};

const STREAK_MILESTONES = [3, 5, 7, 14, 30, 60, 100, 365];

function streakMessage(current: number): string {
  if (current === 0) return 'Journal today to start a streak.';
  const next = STREAK_MILESTONES.find((m) => m > current);
  return next ? `Keep going to earn ${next} days streak.` : 'Incredible streak. Keep it going.';
}

/** The reference Insights layout: one streak card (current + record), then two tiles. */
export function StatTiles({ currentStreak, recordStreak, totalEntries, daysJournaling }: StatTilesProps) {
  return (
    <View style={styles.wrapper}>
      <Card>
        <View style={styles.streakMessage}>
          <ThemedText themeColor="accentText">★</ThemedText>
          <ThemedText themeColor="textSecondary">{streakMessage(currentStreak)}</ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.streakRow}>
          <Metric value={currentStreak} label="Current streak" />
          <Metric value={recordStreak} label="Record" />
        </View>
      </Card>

      <View style={styles.tiles}>
        <Tile value={totalEntries} label="Total entries" />
        <Tile value={daysJournaling} label="Days journaling" />
      </View>
    </View>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <ThemedText style={styles.value}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.value}>{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.three },
  streakMessage: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  divider: { height: 1, backgroundColor: 'rgba(57,46,34,0.10)' },
  streakRow: { flexDirection: 'row' },
  metric: { flex: 1, alignItems: 'center', gap: Spacing.half },
  tiles: { flexDirection: 'row', gap: Spacing.three },
  tile: {
    flex: 1,
    borderRadius: 20,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 124,
    justifyContent: 'center',
  },
  value: { fontSize: 38, lineHeight: 44, fontWeight: 600 },
});
