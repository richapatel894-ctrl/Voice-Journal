import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TagCount } from '@/data';
import { useTheme } from '@/hooks/use-theme';

type TagPickerSheetProps = {
  visible: boolean;
  tags: TagCount[];
  selected: string[];
  onToggle: (tag: string) => void;
  onClose: () => void;
};

export function TagPickerSheet({ visible, tags, selected, onToggle, onClose }: TagPickerSheetProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => tags.filter((t) => t.tag.toLowerCase().includes(query.trim().toLowerCase())),
    [tags, query]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.toolbar}>
            <ThemedText type="subtitle">All themes</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <ThemedText type="smallBold" themeColor="accentText">
                Done
              </ThemedText>
            </Pressable>
          </View>
          <TextInput
            style={[styles.search, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Search themes"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.tag}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.tag);
              return (
                <Pressable onPress={() => onToggle(item.tag)} style={styles.row}>
                  <ThemedText>{item.tag}</ThemedText>
                  <ThemedText themeColor={isSelected ? 'accent' : 'textSecondary'}>
                    {isSelected ? '✓' : item.count}
                  </ThemedText>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  search: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  list: { gap: Spacing.one },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
});
