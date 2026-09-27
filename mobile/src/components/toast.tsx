import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToastProps = {
  message: string | null;
  onHide: () => void;
};

const VISIBLE_MS = 2200;

export function Toast({ message, onHide }: ToastProps) {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onHide);
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, opacity, onHide]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { opacity, backgroundColor: theme.text }]}>
      <ThemedText type="smallBold" style={{ color: theme.background }}>
        {message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
});
