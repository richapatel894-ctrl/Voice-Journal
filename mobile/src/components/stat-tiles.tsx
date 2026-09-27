import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Stat = { label: string; value: string | number };

type StatTilesProps = {
  currentStreak: number;
  recordStreak: number;
  totalEntries: number;
  daysJournaling: number;
};

export function StatTiles({ currentStreak, recordStreak, totalEntries, daysJournaling }: StatTilesProps) {
  const stats: Stat[] = [
    { label: 'Current streak', value: currentStreak },
    { label: 'Record streak', value: recordStreak },
    { label: 'Total entries', value: totalEntries },
    { label: 'Days journaling', value: daysJournaling },
  ];

  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <ThemedView key={stat.label} type="backgroundElement" style={styles.tile}>
          <ThemedText type="title" style={styles.value}>
            {stat.value}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {stat.label}
          </ThemedText>
        </ThemedView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  value: { fontSize: 32, lineHeight: 38 },
});
