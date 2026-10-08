import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TagChipProps = {
  label: string;
  count?: number;
  selected: boolean;
  /** Themes fill solid amber when selected; emotions use a soft amber fill with an outline, so the two read differently side by side. */
  variant?: 'theme' | 'emotion';
  /** Omit for a static, non-interactive chip (e.g. read-only tags on the Entry detail screen). */
  onPress?: () => void;
};

export function TagChip({ label, count, selected, variant = 'theme', onPress }: TagChipProps) {
  const theme = useTheme();
  const selectedStyle =
    variant === 'emotion'
      ? { backgroundColor: theme.accentSoft, borderColor: theme.accent }
      : { backgroundColor: theme.accent, borderColor: theme.accent };

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        selected ? selectedStyle : { backgroundColor: theme.backgroundElement, borderColor: 'transparent' },
      ]}>
      <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
        {label}
        {count !== undefined ? ` (${count})` : ''}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1.5,
  },
});
