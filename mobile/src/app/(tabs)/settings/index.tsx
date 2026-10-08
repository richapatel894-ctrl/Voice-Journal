import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { computeStreak, entriesSummary, getProfileName, setProfileName } from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthYear } from '@/lib/date';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [summary, setSummary] = useState<{ total: number; streak: number; since: string | null }>({
    total: 0,
    streak: 0,
    since: null,
  });

  useFocusEffect(
    useCallback(() => {
      getProfileName(db).then((n) => setName(n ?? ''));
      Promise.all([entriesSummary(db), computeStreak(db)]).then(([entries, streak]) => {
        setSummary({ total: entries.total, streak: streak.current, since: entries.earliestDay });
      });
    }, [db])
  );

  const saveName = () => {
    const trimmed = name.trim();
    setProfileName(db, trimmed);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="title" style={styles.title}>
          Settings
        </ThemedText>

        <View style={styles.content}>
          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Profile
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="Your name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              onBlur={saveName}
              onSubmitEditing={saveName}
              returnKeyType="done"
            />
            <ThemedText type="small" themeColor="textSecondary">
              {summary.total} {summary.total === 1 ? 'entry' : 'entries'} · {summary.streak}-day streak
              {summary.since ? ` · journaling since ${formatMonthYear(summary.since)}` : ''}
            </ThemedText>
          </View>

          <Pressable onPress={() => router.push('/settings/media')} style={styles.row}>
            <ThemedText>Media</ThemedText>
            <ThemedText themeColor="textSecondary">›</ThemedText>
          </Pressable>

          <View style={styles.row}>
            <ThemedText themeColor="textSecondary">About</ThemedText>
            <ThemedText themeColor="textSecondary">
              Version {Constants.expoConfig?.version ?? '1.0.0'}
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  title: { paddingHorizontal: Spacing.four },
  content: { padding: Spacing.four, gap: Spacing.five },
  section: { gap: Spacing.two },
  input: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
});
