import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { AttachmentType } from '@/data';
import { useTheme } from '@/hooks/use-theme';

const ICON_BY_TYPE: Record<AttachmentType, string> = {
  photo: '',
  video: '🎬',
  file: '📄',
  link: '🔗',
};

export type AttachmentItem = {
  key: string;
  type: AttachmentType;
  label: string;
  thumbnailUri?: string | null;
  onRemove: () => void;
};

type AttachmentStripProps = {
  items: AttachmentItem[];
};

export function AttachmentStrip({ items }: AttachmentStripProps) {
  const theme = useTheme();
  if (items.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => (
        <ThemedView key={item.key} type="backgroundElement" style={styles.item}>
          {item.type === 'photo' && item.thumbnailUri ? (
            <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <View style={styles.iconWrap}>
              <ThemedText>{ICON_BY_TYPE[item.type]}</ThemedText>
              <ThemedText type="small" numberOfLines={1} style={styles.label}>
                {item.label}
              </ThemedText>
            </View>
          )}
          <Pressable
            onPress={item.onRemove}
            hitSlop={8}
            style={[styles.removeButton, { backgroundColor: theme.text }]}>
            <ThemedText type="label" style={{ color: theme.background }}>
              ✕
            </ThemedText>
          </Pressable>
        </ThemedView>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two },
  item: {
    width: 84,
    height: 84,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  thumbnail: { width: '100%', height: '100%' },
  iconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.one, gap: Spacing.half },
  label: { textAlign: 'center' },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
