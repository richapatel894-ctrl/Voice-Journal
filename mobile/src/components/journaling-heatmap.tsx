import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { HeatmapDay } from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { localDayString } from '@/lib/date';

type JournalingHeatmapProps = {
  days: HeatmapDay[];
  /** Local day the range starts on ('YYYY-MM-DD'), or null for all-time (uses the earliest day present). */
  sinceDay: string | null;
  onSelectDay: (day: string) => void;
};

/** Sanity cap so a multi-year "All" range can't render an unbounded grid. */
const DAYS_MAX = 366 * 2;

function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDayString(new Date(y, m - 1, d + delta));
}

export function JournalingHeatmap({ days, sinceDay, onSelectDay }: JournalingHeatmapProps) {
  const theme = useTheme();
  const countByDay = new Map(days.map((d) => [d.day, d.count]));
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const today = localDayString();
  const rangeStart = sinceDay ?? days[0]?.day ?? today;
  const totalDays = Math.min(
    DAYS_MAX,
    Math.round((new Date(today).getTime() - new Date(rangeStart).getTime()) / 86400000) + 1
  );
  const weeks = Math.max(1, Math.ceil(totalDays / 7));
  const gridStart = addDays(today, -(weeks * 7 - 1));

  const columns = Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, dayOfWeek) => addDays(gridStart, week * 7 + dayOfWeek))
  );

  const shadeFor = (count: number) => {
    if (count === 0) return theme.backgroundElement;
    const intensity = 0.3 + 0.7 * (count / maxCount);
    return theme.accent + Math.round(intensity * 255).toString(16).padStart(2, '0');
  };

  return (
    <View style={styles.scrollRow}>
      {columns.map((week, i) => (
        <View key={i} style={styles.column}>
          {week.map((day) => {
            const count = countByDay.get(day) ?? 0;
            const disabled = day > today || day < rangeStart;
            return (
              <Pressable
                key={day}
                disabled={disabled || count === 0}
                onPress={() => onSelectDay(day)}
                style={[
                  styles.cell,
                  { backgroundColor: disabled ? 'transparent' : shadeFor(count) },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function HeatmapSummary({ days, sinceDay }: { days: HeatmapDay[]; sinceDay: string | null }) {
  const activeDays = days.filter((d) => d.count > 0).length;
  const label = sinceDay ? `since ${sinceDay}` : 'all time';
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {activeDays} {activeDays === 1 ? 'day' : 'days'} journaled ({label})
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  scrollRow: { flexDirection: 'row', gap: 3 },
  column: { gap: 3 },
  cell: { width: 11, height: 11, borderRadius: 2 },
});
