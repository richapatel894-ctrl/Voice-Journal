/**
 * Voice Journal visual identity (PRD `docs/PRD.md` §6): a warm cream canvas,
 * beige cards, serif titles and an amber accent, with colors sampled from the
 * 5 Minute Journal reference screenshots. Dark values are kept but unused
 * while v1 is light-only.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#392E22',
    background: '#F3F1ED',
    backgroundElement: '#E9E5DF',
    backgroundSelected: '#DBD7CF',
    textSecondary: '#857F74',
    accent: '#FFB700',
    accentSoft: '#FBE3A0',
    /** Text/icons drawn on top of an `accent` fill. */
    onAccent: '#392E22',
    /** Darker amber for accent-coloured text links, which would be unreadable in `accent` on cream. */
    accentText: '#946100',
  },
  dark: {
    text: '#F5EDF0',
    background: '#241620',
    backgroundElement: '#31212C',
    backgroundSelected: '#402C39',
    textSecondary: '#B9A8B3',
    accent: '#FFB700',
    accentSoft: '#4A3A1A',
    onAccent: '#241620',
    accentText: '#FFC933',
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
