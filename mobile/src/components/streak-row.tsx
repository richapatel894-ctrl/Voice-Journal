import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { localDayString } from '@/lib/date';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HEART_PATH =
  'M12 21s-7.2-4.7-9.6-9.4C.7 8.2 2.6 4.4 6.4 4.4c2 0 3.8 1.2 5.6 3.3 1.8-2.1 3.6-3.3 5.6-3.3 3.8 0 5.7 3.8 4 7.2C19.2 16.3 12 21 12 21z';
const HEART_SIZE = 30;

type StreakRowProps = {
  current: number;
  daysWithEntries: Set<string>;
};

function Heart({ filled, beating }: { filled: boolean; beating: boolean }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!beating || reduced || !focused) return;
    // two quick beats, then a rest, like a heartbeat
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 220 }),
        withTiming(1, { duration: 220 }),
        withTiming(1.12, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withDelay(760, withTiming(1, { duration: 0 }))
      ),
      -1
    );
    return () => cancelAnimation(scale);
  }, [beating, reduced, focused, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Svg width={HEART_SIZE} height={HEART_SIZE} viewBox="0 0 24 24">
        <Path
          d={HEART_PATH}
          fill={filled ? theme.accent : theme.backgroundElement}
          stroke={filled ? theme.accent : theme.textSecondary}
          strokeOpacity={filled ? 1 : 0.25}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

export function StreakRow({ current, daysWithEntries }: StreakRowProps) {
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
      <View style={styles.hearts}>
        {weekDays.map((d, i) => (
          <View key={d.day} style={styles.heartColumn}>
            <Heart filled={d.hasEntry} beating={d.isToday} />
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
  hearts: { flexDirection: 'row', justifyContent: 'space-between' },
  heartColumn: { alignItems: 'center', gap: Spacing.one },
});
