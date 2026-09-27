import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type EmotionPoint = { emotion: string; count: number; valence: number; arousal: number };

type EmotionMapProps = {
  points: EmotionPoint[];
  selected: string | null;
  onSelect: (emotion: string) => void;
};

const MAP_SIZE = 288;
const MIN_BUBBLE = 40;
const MAX_BUBBLE = 84;

export function EmotionMap({ points, selected, onSelect }: EmotionMapProps) {
  const theme = useTheme();
  const maxCount = Math.max(1, ...points.map((p) => p.count));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.axisLabelTop]}>
        <ThemedText type="label" themeColor="textSecondary">
          high energy
        </ThemedText>
      </View>
      <View style={styles.row}>
        <View style={styles.axisLabelLeft}>
          <ThemedText type="label" themeColor="textSecondary" style={styles.rotatedLabel}>
            unpleasant
          </ThemedText>
        </View>

        <View style={[styles.map, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.crosshairV, { backgroundColor: theme.backgroundSelected }]} />
          <View style={[styles.crosshairH, { backgroundColor: theme.backgroundSelected }]} />
          {points.map((point) => {
            const size = MIN_BUBBLE + (point.count / maxCount) * (MAX_BUBBLE - MIN_BUBBLE);
            const x = ((point.valence + 1) / 2) * MAP_SIZE - size / 2;
            const y = ((1 - point.arousal) / 2) * MAP_SIZE - size / 2;
            const isSelected = selected === point.emotion;
            return (
              <Pressable
                key={point.emotion}
                onPress={() => onSelect(point.emotion)}
                style={[
                  styles.bubble,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    left: x,
                    top: y,
                    backgroundColor: isSelected ? theme.accent : theme.accentSoft,
                  },
                ]}>
                <ThemedText
                  type="small"
                  numberOfLines={1}
                  style={{ color: isSelected ? theme.background : theme.text }}>
                  {point.emotion}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.axisLabelRight}>
          <ThemedText type="label" themeColor="textSecondary" style={styles.rotatedLabel}>
            pleasant
          </ThemedText>
        </View>
      </View>
      <View style={styles.axisLabelBottom}>
        <ThemedText type="label" themeColor="textSecondary">
          low energy
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  map: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    borderRadius: Spacing.three,
  },
  crosshairV: { position: 'absolute', left: MAP_SIZE / 2, top: 0, bottom: 0, width: 1 },
  crosshairH: { position: 'absolute', top: MAP_SIZE / 2, left: 0, right: 0, height: 1 },
  bubble: { position: 'absolute', alignItems: 'center', justifyContent: 'center', padding: Spacing.one },
  axisLabelTop: { alignItems: 'center' },
  axisLabelBottom: { alignItems: 'center' },
  axisLabelLeft: { width: 20, alignItems: 'center', justifyContent: 'center' },
  axisLabelRight: { width: 20, alignItems: 'center', justifyContent: 'center' },
  rotatedLabel: { width: MAP_SIZE, textAlign: 'center', transform: [{ rotate: '-90deg' }] },
});
