import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import { getAppearanceMode, setAppearanceMode, type AppearanceMode } from '@/data';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AppearanceContextValue = {
  mode: AppearanceMode;
  effectiveScheme: 'light' | 'dark';
  setMode: (mode: AppearanceMode) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/**
 * Wraps the app inside SQLiteProvider so Settings' Appearance choice
 * (system/light/dark) can override the system scheme everywhere `useTheme()`
 * is used. Calls `Appearance.setColorScheme` (not just our own color lookup)
 * so native-bridge components like `NativeTabs` also get the real native
 * trait-collection switch — without it, native controls kept rendering with
 * light-mode text metrics while we painted dark colors on top, which
 * corrupted the tab bar's label glyphs (found via on-device verification,
 * 2026-09-27).
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>('system');

  useEffect(() => {
    getAppearanceMode(db).then((saved) => {
      setModeState(saved);
      Appearance.setColorScheme(saved === 'system' ? 'unspecified' : saved);
    });
  }, [db]);

  const setMode = (next: AppearanceMode) => {
    setModeState(next);
    setAppearanceMode(db, next);
    Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
  };

  const effectiveScheme = systemScheme === 'dark' ? 'dark' : 'light';

  return (
    <AppearanceContext.Provider value={{ mode, effectiveScheme, setMode }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider');
  return ctx;
}
