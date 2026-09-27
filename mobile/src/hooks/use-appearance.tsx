import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import { getAppearanceMode, setAppearanceMode, type AppearanceMode } from '@/data';

type AppearanceContextValue = {
  mode: AppearanceMode;
  effectiveScheme: 'light' | 'dark';
  setMode: (mode: AppearanceMode) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/**
 * v1 is light-mode only (PRD §6, decided 2026-09-27): dark mode is deprioritized
 * because of an open NativeTabs bug that corrupts tab label glyphs in dark mode
 * (see the comment in src/components/app-tabs.tsx). This forces light everywhere,
 * including overriding the OS via Appearance.setColorScheme so a device set to
 * system dark mode doesn't hit the bug either. The mode/setMode plumbing and the
 * `settings` table's stored value are kept intact so re-enabling dark mode later
 * (once the bug is fixed) is a small, contained change: drop the two forced
 * overrides below and restore `effectiveScheme` to follow `mode`/the system.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [mode, setModeState] = useState<AppearanceMode>('system');

  useEffect(() => {
    Appearance.setColorScheme('light');
    getAppearanceMode(db).then(setModeState);
  }, [db]);

  const setMode = (next: AppearanceMode) => {
    setModeState(next);
    setAppearanceMode(db, next);
  };

  const effectiveScheme = 'light';

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
