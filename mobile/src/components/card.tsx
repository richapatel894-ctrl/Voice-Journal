import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type CardProps = {
  /** Serif heading shown inside the card, like "Mood over time" in the reference Insights screen. */
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ title, children, style }: CardProps) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {title ? <ThemedText type="subtitle">{title}</ThemedText> : null}
      <View style={styles.body}>{children}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: Spacing.four, gap: Spacing.three },
  body: { gap: Spacing.two },
});
