import { Colors } from '@/constants/theme';
import { useAppearance } from '@/hooks/use-appearance';

/** Follows the user's Settings > Appearance choice (system/light/dark), not just the raw OS scheme. */
export function useTheme() {
  const { effectiveScheme } = useAppearance();
  return Colors[effectiveScheme];
}
