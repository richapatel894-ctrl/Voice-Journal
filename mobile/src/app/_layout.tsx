import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DATABASE_NAME, ensureDataDirectories, migrateDbIfNeeded, resumePendingTranscriptions } from '@/data';
import { AppearanceProvider, useAppearance } from '@/hooks/use-appearance';

SplashScreen.preventAutoHideAsync();
ensureDataDirectories();

/** Inside SQLiteProvider + AppearanceProvider so it can read the Settings > Appearance override. */
function AppContent() {
  const db = useSQLiteContext();
  const { effectiveScheme } = useAppearance();

  // Finish any voice entries left pending (e.g. iOS suspended the app mid-upload).
  useEffect(() => {
    void resumePendingTranscriptions(db);
  }, [db]);

  return (
    <ThemeProvider value={effectiveScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
