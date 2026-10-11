import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntryRow } from '@/components/entry-row';
import { StreakRow } from '@/components/streak-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Toast } from '@/components/toast';
import { WELCOME_PALETTE } from '@/components/welcome/scene-data';
import { QUOTES } from '@/content/quotes';
import { WelcomeBanner } from '@/components/welcome/welcome-banner';
import { BottomTabInset, Spacing } from '@/constants/theme';
import {
  computeStreak,
  deleteEntry,
  deleteEntryFiles,
  fetchWeather,
  getProfileName,
  getWelcomeChoice,
  listEntries,
  nextWelcomeQuote,
  retryTranscription,
  timeOfDayFor,
  onEntryChanged,
  onEntrySaved,
  type Entry,
  type Streak,
  type Weather,
  type WelcomeChoice,
} from '@/data';
import { ThemeOverrideContext } from '@/hooks/theme-override';
import { useTheme } from '@/hooks/use-theme';
import { localDayString } from '@/lib/date';

type HomeContentProps = {
  choice: WelcomeChoice | null;
  weather: Weather | null;
  onNextQuote: () => void;
  onDevPreview?: () => void;
  onDevWeather?: () => void;
};

function HomeContent({ choice, weather, onNextQuote, onDevPreview, onDevWeather }: HomeContentProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [name, setName] = useState<string | null>(null);
  const [todayEntries, setTodayEntries] = useState<Entry[]>([]);
  const [streak, setStreak] = useState<Streak>({ current: 0, record: 0, daysWithEntries: new Set() });
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [entries, streakResult, profileName] = await Promise.all([
      listEntries(db, { day: localDayString(), sort: 'newest' }),
      computeStreak(db),
      getProfileName(db),
    ]);
    setTodayEntries(entries);
    setStreak(streakResult);
    setName(profileName);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => onEntrySaved(() => setToast('Saved ✓')), [])
  );

  useFocusEffect(useCallback(() => onEntryChanged(() => void load()), [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onDeleteEntry = async (entry: Entry) => {
    deleteEntryFiles(entry);
    await deleteEntry(db, entry.id);
    await load();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
          <StreakRow current={streak.current} daysWithEntries={streak.daysWithEntries} />

          {choice && <WelcomeBanner name={name} choice={choice} weather={weather} onNextQuote={onNextQuote} onDevPreview={onDevPreview} onDevWeather={onDevWeather} />}

          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push('/recorder')}
              style={[styles.recordButton, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                🎙  Record
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push('/composer')}
              style={[styles.writeButton, { borderColor: theme.accent }]}>
              <ThemedText type="smallBold" themeColor="accent">
                Write
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.todaySection}>
            <ThemedText type="label" themeColor="textSecondary">
              Today
            </ThemedText>
            {todayEntries.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyState}>
                Nothing yet today. Speak or write your first thought.
              </ThemedText>
            ) : (
              <View style={styles.entryList}>
                {todayEntries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onPress={() => router.push({ pathname: '/composer', params: { id: entry.id } })}
                    onEdit={() => router.push({ pathname: '/composer', params: { id: entry.id } })}
                    onDelete={() => onDeleteEntry(entry)}
                    onRetry={() => void retryTranscription(db, entry.id)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <Toast message={toast} onHide={() => setToast(null)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.five,
  },
  actions: { flexDirection: 'row', gap: Spacing.three },
  recordButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  writeButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todaySection: { gap: Spacing.three },
  entryList: { gap: Spacing.two },
  emptyState: { paddingVertical: Spacing.three },
});

/** Owns the time-of-day choice so the whole page (background and text) can follow it, then renders the content. */
export default function HomeScreen() {
  const db = useSQLiteContext();
  const [choice, setChoice] = useState<WelcomeChoice | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  // Development only: step through all 40 looks and each weather to check them on the device.
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewWeather, setPreviewWeather] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      getWelcomeChoice(db).then(setChoice);
      fetchWeather().then(setWeather);
    }, [db])
  );

  const TIMES = ['morning', 'afternoon', 'sunset', 'night'] as const;
  const KINDS = ['clear', 'partly', 'cloudy', 'rain', 'storm', 'snow', 'fog'] as const;
  const shownChoice: WelcomeChoice | null =
    __DEV__ && previewIndex !== null
      ? { window: 'preview', timeOfDay: TIMES[previewIndex % 4], look: Math.floor(previewIndex / 4) % 10, quoteId: QUOTES[TIMES[previewIndex % 4]][0].id }
      : choice;
  const shownWeather: Weather | null =
    __DEV__ && previewWeather !== null ? { kind: KINDS[previewWeather % KINDS.length], temperatureC: 14 } : weather;

  const palette = WELCOME_PALETTE[shownChoice?.timeOfDay ?? timeOfDayFor()];
  const override = {
    background: palette.background,
    backgroundElement: palette.backgroundElement,
    backgroundSelected: palette.backgroundSelected,
    text: palette.text,
    textSecondary: palette.textSecondary,
    ...(palette.dark ? { accent: '#FF9DB8', accentSoft: '#4A2C3B' } : {}),
  };

  return (
    <ThemeOverrideContext.Provider value={override}>
      <StatusBar style={palette.dark ? 'light' : 'dark'} />
      <HomeContent
        choice={shownChoice}
        weather={shownWeather}
        onDevPreview={__DEV__ ? () => setPreviewIndex((i) => ((i ?? -1) + 1) % 40) : undefined}
        onDevWeather={__DEV__ ? () => setPreviewWeather((i) => ((i ?? -1) + 1) % 7) : undefined}
        onNextQuote={() => choice && void nextWelcomeQuote(db, choice).then(setChoice)}
      />
    </ThemeOverrideContext.Provider>
  );
}
