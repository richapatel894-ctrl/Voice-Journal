import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useAppearance } from '@/hooks/use-appearance';

/**
 * KNOWN BUG (2026-09-27, on-device): in dark mode, tab labels sometimes
 * render with corrupted glyphs ("Home" → "Ho...", "Insights" → "Insiahts").
 * Reproduces even with zero custom colors here and with the native trait
 * collection genuinely switched via `Appearance.setColorScheme` — so it
 * isn't caused by our styling. Looks like an upstream bug in
 * `expo-router/unstable-native-tabs` (an explicitly unstable API). Revisit
 * after an expo-router bump, or check on a real device (may be
 * simulator-only).
 */
export default function AppTabs() {
  const { effectiveScheme } = useAppearance();
  const colors = Colors[effectiveScheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.accentSoft}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" selectedColor={colors.text} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="entries">
        <NativeTabs.Trigger.Label>Entries</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" selectedColor={colors.text} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="chart.bar.xaxis"
          md="bar_chart"
          selectedColor={colors.text}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" selectedColor={colors.text} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
