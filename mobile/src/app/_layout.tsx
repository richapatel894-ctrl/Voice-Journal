import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DATABASE_NAME, ensureDataDirectories, migrateDbIfNeeded } from '@/data';
import { Colors } from '@/constants/theme';
import { AppearanceProvider, useAppearance } from '@/hooks/use-appearance';

SplashScreen.preventAutoHideAsync();
ensureDataDirectories();

/** Inside SQLiteProvider + AppearanceProvider so it can read the Settings > Appearance override. */
function AppContent() {
  const { effectiveScheme } = useAppearance();
  const palette = Colors[effectiveScheme];
  const base = effectiveScheme === 'dark' ? DarkTheme : DefaultTheme;
  // Navigation chrome (headers, back buttons, sheets) uses our palette instead of the stock white/blue.
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      primary: palette.accentText,
      border: palette.backgroundSelected,
    },
  };
  return (
    <ThemeProvider value={navigationTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="recorder"
          options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="composer" options={{ presentation: 'formSheet', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Suspense fallback={null}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded} useSuspense>
          <AppearanceProvider>
            <AppContent />
          </AppearanceProvider>
        </SQLiteProvider>
      </Suspense>
    </GestureHandlerRootView>
  );
}
