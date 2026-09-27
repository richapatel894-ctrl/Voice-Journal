import { Host, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listAllAttachments, type Attachment, type AttachmentType } from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthYear, localDayString } from '@/lib/date';

type FilterValue = 'all' | AttachmentType;

const ICON_BY_TYPE: Record<AttachmentType, string> = { photo: '', video: '🎬', file: '📄', link: '🔗' };

type Section = { title: string; data: Attachment[] };

function groupByMonth(items: Attachment[]): Section[] {
  const order: string[] = [];
  const byMonth = new Map<string, Attachment[]>();
  for (const item of items) {
    const day = localDayString(new Date(item.createdAt));
    const monthKey = day.slice(0, 7);
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, []);
      order.push(monthKey);
    }
    byMonth.get(monthKey)!.push(item);
  }
  return order.map((monthKey) => ({
    title: formatMonthYear(`${monthKey}-01`),
    data: byMonth.get(monthKey)!,
  }));
}

export default function MediaScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [items, setItems] = useState<Attachment[]>([]);
  const [selected, setSelected] = useState<Attachment | null>(null);

  useFocusEffect(
    useCallback(() => {
      listAllAttachments(db, filter === 'all' ? undefined : filter).then(setItems);
    }, [db, filter])
  );

  const sections = useMemo(() => groupByMonth(items), [items]);

  const goToEntry = (attachment: Attachment) => {
    setSelected(null);
    router.push(`/entries/${attachment.entryId}`);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.filterRow}>
          <Host matchContents seedColor={theme.accent}>
            <Picker
              modifiers={[pickerStyle('segmented')]}
              selection={filter}
              onSelectionChange={(v) => setFilter(v as FilterValue)}>
              <UIText modifiers={[tag('all')]}>All</UIText>
              <UIText modifiers={[tag('photo')]}>Photos</UIText>
              <UIText modifiers={[tag('video')]}>Videos</UIText>
              <UIText modifiers={[tag('file')]}>Files</UIText>
              <UIText modifiers={[tag('link')]}>Links</UIText>
            </Picker>
          </Host>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {sections.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyState}>
              Nothing attached yet. Add photos, videos, files or links when you write an entry.
            </ThemedText>
          ) : (
            sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <ThemedText type="label" themeColor="textSecondary">
                  {section.title}
                </ThemedText>
                <View style={styles.grid}>
                  {section.data.map((item) => (
                    <Pressable key={item.id} onPress={() => setSelected(item)}>
                      <ThemedView type="backgroundElement" style={styles.tile}>
                        {item.type === 'photo' && item.thumbnailPath ? (
                          <Image source={{ uri: item.thumbnailPath }} style={styles.tileImage} contentFit="cover" />
                        ) : (
                          <View style={styles.tileIconWrap}>
                            <ThemedText>{ICON_BY_TYPE[item.type]}</ThemedText>
                            <ThemedText type="small" numberOfLines={1}>
                              {item.type === 'link' ? item.title ?? item.url : item.title ?? item.type}
                            </ThemedText>
                          </View>
                        )}
                      </ThemedView>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={selected !== null} animationType="fade" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.viewerBackdrop}>
          <SafeAreaView style={styles.viewerContent}>
            {selected?.type === 'photo' && selected.filePath && (
              <Image source={{ uri: selected.filePath }} style={styles.viewerImage} contentFit="contain" />
            )}
            {selected && selected.type !== 'photo' && (
              <ThemedView type="backgroundElement" style={styles.viewerCard}>
                <ThemedText>{ICON_BY_TYPE[selected.type]}</ThemedText>
                <ThemedText>{selected.type === 'link' ? selected.url : selected.title ?? selected.type}</ThemedText>
              </ThemedView>
            )}
            <View style={styles.viewerActions}>
              <Pressable onPress={() => setSelected(null)} hitSlop={12}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                  Close
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => selected && goToEntry(selected)} hitSlop={12}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                  Go to entry
                </ThemedText>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  filterRow: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.five },
  section: { gap: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { width: 108, height: 108, borderRadius: Spacing.three, overflow: 'hidden' },
  tileImage: { width: '100%', height: '100%' },
  tileIconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.two, gap: Spacing.one },
  emptyState: { textAlign: 'center', paddingVertical: Spacing.six },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
  viewerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.four },
  viewerImage: { width: '100%', height: '70%' },
  viewerCard: { padding: Spacing.five, borderRadius: Spacing.three, alignItems: 'center', gap: Spacing.two },
  viewerActions: { flexDirection: 'row', gap: Spacing.six, position: 'absolute', bottom: Spacing.six },
});
