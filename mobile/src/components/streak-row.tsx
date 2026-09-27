import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { localDayString } from '@/lib/date';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type StreakRowProps = {
  current: number;
  daysWithEntries: Set<string>;
};

export function StreakRow({ current, daysWithEntries }: StreakRowProps) {
  const theme = useTheme();
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      day: localDayString(date),
      isToday: localDayString(date) === localDayString(today),
      hasEntry: daysWithEntries.has(localDayString(date)),
    };
  });

  return (
    <View style={styles.container}>
      <ThemedText type="label" themeColor="textSecondary">
        {current > 0 ? `🔥 ${current}-day streak` : 'Start your streak today'}
      </ThemedText>
      <View style={styles.dots}>
        {weekDays.map((d, i) => (
          <View key={d.day} style={styles.dotColumn}>
            <View
              style={[
                styles.dot,
                { backgroundColor: d.hasEntry ? theme.accent : theme.backgroundElement },
                d.isToday && { borderWidth: 2, borderColor: theme.accent },
              ]}
            />
            <ThemedText type="label" themeColor="textSecondary">
              {WEEKDAY_LETTERS[i]}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  dotColumn: { alignItems: 'center', gap: Spacing.one },
  dot: { width: 24, height: 24, borderRadius: 12 },
});
