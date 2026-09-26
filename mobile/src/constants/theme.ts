/**
 * Voice Journal visual identity (PRD `docs/PRD.md` §6): warm cream, serif
 * titles, the brand pink accent, and a deep-plum dark mode instead of pure
 * black.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2B211C',
    background: '#FAF6F0',
    backgroundElement: '#F1E9DE',
    backgroundSelected: '#E7D9CB',
    textSecondary: '#6B5F55',
    accent: '#D9557A',
    accentSoft: '#FFC9DA',
  },
  dark: {
    text: '#F5EDF0',
    background: '#241620',
    backgroundElement: '#31212C',
    backgroundSelected: '#402C39',
    textSecondary: '#B9A8B3',
    accent: '#FF9DB8',
    accentSoft: '#4A2C3B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
