import { Host, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { EntryRow } from '@/components/entry-row';
import { TagChip } from '@/components/tag-chip';
import { TagPickerSheet } from '@/components/tag-picker-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import {
  deleteEntry,
  deleteEntryFiles,
  emotionCounts,
  listEntries,
  tagCounts,
  type Entry,
  type SortOrder,
  type TagCount,
} from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { formatDayHeader, localDayString } from '@/lib/date';

const VISIBLE_CHIP_COUNT = 6;
const ALL_EMOTIONS = 'All';

type Section = { title: string; data: Entry[] };

function groupByDay(entries: Entry[]): Section[] {
  const order: string[] = [];
  const byDay = new Map<string, Entry[]>();
  for (const entry of entries) {
    const day = localDayString(new Date(entry.createdAt));
    if (!byDay.has(day)) {
      byDay.set(day, []);
      order.push(day);
    }
    byDay.get(day)!.push(entry);
  }
  return order.map((day) => ({ title: formatDayHeader(day), data: byDay.get(day)! }));
}

export default function EntriesScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [themeCounts, setThemeCounts] = useState<TagCount[]>([]);
  const [emotionOptions, setEmotionOptions] = useState<TagCount[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOrder>('newest');
  const [search, setSearch] = useState('');
  const [showMoreThemes, setShowMoreThemes] = useState(false);

  const load = useCallback(async () => {
    const [entryResults, themeCountResults, emotionCountResults] = await Promise.all([
      listEntries(db, {
        themes: selectedThemes,
        emotions: selectedEmotion ? [selectedEmotion] : [],
        search,
        sort,
      }),
      tagCounts(db),
      emotionCounts(db),
    ]);
    setEntries(entryResults);
    setThemeCounts(themeCountResults);
    setEmotionOptions(emotionCountResults);
  }, [db, selectedThemes, selectedEmotion, search, sort]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = useMemo(() => groupByDay(entries), [entries]);

  const visibleChips = useMemo(() => {
    const sorted = [...themeCounts].sort((a, b) => {
      const aSelected = selectedThemes.includes(a.tag);
      const bSelected = selectedThemes.includes(b.tag);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return b.count - a.count;
    });
    return sorted.slice(0, VISIBLE_CHIP_COUNT);
  }, [themeCounts, selectedThemes]);

  const toggleTheme = (tagName: string) => {
    setSelectedThemes((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const onDeleteEntry = async (entry: Entry) => {
    deleteEntryFiles(entry);
    await deleteEntry(db, entry.id);
    await load();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Entries
          </ThemedText>
          <TextInput
            style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Search text, theme or emotion"
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <TagChip label="All" selected={selectedThemes.length === 0} onPress={() => setSelectedThemes([])} />
            {visibleChips.map((c) => (
              <TagChip
                key={c.tag}
                label={c.tag}
                count={c.count}
                selected={selectedThemes.includes(c.tag)}
                onPress={() => toggleTheme(c.tag)}
              />
            ))}
            {themeCounts.length > VISIBLE_CHIP_COUNT && (
              <TagChip label="More…" selected={false} onPress={() => setShowMoreThemes(true)} />
            )}
          </ScrollView>

          <View style={styles.filterRow}>
            <Host matchContents seedColor={theme.accent}>
              <Picker
                label="Emotion"
                modifiers={[pickerStyle('menu')]}
                selection={selectedEmotion ?? ALL_EMOTIONS}
                onSelectionChange={(v) => setSelectedEmotion(v === ALL_EMOTIONS ? null : v)}>
                <UIText modifiers={[tag(ALL_EMOTIONS)]}>All emotions</UIText>
                {emotionOptions.map((e) => (
                  <UIText key={e.tag} modifiers={[tag(e.tag)]}>
                    {e.tag} ({e.count})
                  </UIText>
                ))}
              </Picker>
            </Host>
            <Host matchContents seedColor={theme.accent}>
              <Picker
                label="Sort"
                modifiers={[pickerStyle('menu')]}
                selection={sort}
                onSelectionChange={(v) => setSort(v as SortOrder)}>
                <UIText modifiers={[tag('newest')]}>Newest first</UIText>
                <UIText modifiers={[tag('oldest')]}>Oldest first</UIText>
              </Picker>
            </Host>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {sections.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyState}>
              No entries yet. Go record one!
            </ThemedText>
          ) : (
            sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <ThemedText type="label" themeColor="textSecondary">
                  {section.title}
                </ThemedText>
                <View style={styles.entryList}>
                  {section.data.map((entry) => (
                    <Swipeable
                      key={entry.id}
                      renderRightActions={() => (
                        <Pressable
                          onPress={() => onDeleteEntry(entry)}
                          style={[styles.deleteAction, { backgroundColor: theme.accent }]}>
                          <ThemedText type="smallBold" style={{ color: theme.background }}>
                            Delete
                          </ThemedText>
                        </Pressable>
                      )}>
                      <EntryRow
                        entry={entry}
                        onPress={() => router.push(`/entries/${entry.id}`)}
                        onEdit={() => router.push({ pathname: '/composer', params: { id: entry.id } })}
                        onDelete={() => onDeleteEntry(entry)}
                      />
                    </Swipeable>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <TagPickerSheet
        visible={showMoreThemes}
        tags={themeCounts}
        selected={selectedThemes}
        onToggle={toggleTheme}
        onClose={() => setShowMoreThemes(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  title: { fontSize: 32, lineHeight: 40 },
  search: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  chipRow: { gap: Spacing.two, paddingRight: Spacing.four },
  filterRow: { flexDirection: 'row', gap: Spacing.three },
  list: { padding: Spacing.four, paddingTop: Spacing.three, paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.four },
  section: { gap: Spacing.two },
  entryList: { gap: Spacing.two },
  emptyState: { paddingVertical: Spacing.six, textAlign: 'center' },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
});
