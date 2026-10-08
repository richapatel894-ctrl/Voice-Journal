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
    const day = localDayString(date);
    return { day, isToday: day === localDayString(today), hasEntry: daysWithEntries.has(day) };
  });

  return (
    <View style={styles.container}>
      <ThemedText type="label" themeColor="textSecondary">
        {current > 0 ? `${current}-day streak` : 'Start your streak today'}
      </ThemedText>
      <View style={styles.dots}>
        {weekDays.map((d, i) => (
          <View
            key={d.day}
            style={[
              styles.dot,
              { backgroundColor: d.hasEntry ? theme.accent : theme.backgroundSelected },
              d.isToday && { borderWidth: 3, borderColor: theme.accent, backgroundColor: d.hasEntry ? theme.accent : theme.background },
            ]}>
            <ThemedText type="smallBold" style={{ color: d.hasEntry ? theme.onAccent : theme.textSecondary }}>
              {WEEKDAY_LETTERS[i]}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
