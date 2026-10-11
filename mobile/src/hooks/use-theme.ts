import { useContext } from 'react';

import { Colors } from '@/constants/theme';
import { useAppearance } from '@/hooks/use-appearance';
import { ThemeOverrideContext } from '@/hooks/theme-override';

/** Follows the user's Settings > Appearance choice (system/light/dark), not just the raw OS scheme. */
export function useTheme() {
  const { effectiveScheme } = useAppearance();
  const override = useContext(ThemeOverrideContext);
  return override ? { ...Colors[effectiveScheme], ...override } : Colors[effectiveScheme];
}
