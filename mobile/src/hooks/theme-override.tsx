import { createContext } from 'react';

import type { Colors } from '@/constants/theme';

type Palette = { [K in keyof (typeof Colors)['light']]: string };

/**
 * Lets one screen (Home) re-colour everything inside it, for example the dark navy night page of the
 * welcome banner, without switching the app's light/dark mode. `useTheme` merges this over the palette.
 */
export const ThemeOverrideContext = createContext<Partial<Palette> | null>(null);
