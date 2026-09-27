import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TagChipProps = {
  label: string;
  count?: number;
  selected: boolean;
  /** Omit for a static, non-interactive chip (e.g. read-only tags on the Entry detail screen). */
  onPress?: () => void;
};

export function TagChip({ label, count, selected, onPress }: TagChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.accent : theme.backgroundElement },
      ]}>
      <ThemedText type="smallBold" style={{ color: selected ? theme.background : theme.text }}>
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
  },
});
