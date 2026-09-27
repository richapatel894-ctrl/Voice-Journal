import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntryRow } from '@/components/entry-row';
import { StreakRow } from '@/components/streak-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Toast } from '@/components/toast';
import { BottomTabInset, Spacing } from '@/constants/theme';
import {
  computeStreak,
  deleteEntry,
  deleteEntryFiles,
  getProfileName,
  listEntries,
  onEntrySaved,
  type Entry,
  type Streak,
} from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { localDayString, timeOfDayGreeting } from '@/lib/date';

export default function HomeScreen() {
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

  const greeting = name ? `${timeOfDayGreeting()}, ${name}` : timeOfDayGreeting();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
          <StreakRow current={streak.current} daysWithEntries={streak.daysWithEntries} />

          <View style={styles.greetingBlock}>
            <ThemedText type="title">{greeting}</ThemedText>
            <ThemedText themeColor="textSecondary">How are you feeling today?</ThemedText>
          </View>

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
  greetingBlock: { gap: Spacing.one },
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
