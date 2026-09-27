import { Button, Host, Menu } from '@expo/ui/swift-ui';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttachmentStrip, type AttachmentItem } from '@/components/attachment-strip';
import { TagEditor } from '@/components/tag-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  EMOTION_CATALOG,
  addAttachment,
  computeStreak,
  createEntry,
  deleteAttachment,
  deleteIfExists,
  emitEntrySaved,
  getEntry,
  newId,
  persistPendingAttachment,
  processNewEntry,
  setEntryEmotions,
  setEntryTags,
  tagCounts,
  updateEntryText,
  type Attachment,
  type PendingAttachment,
  type TagCount,
} from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { localDayString } from '@/lib/date';

export default function ComposerScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(!isEditing);
  const [saving, setSaving] = useState(false);

  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const [themes, setThemes] = useState<string[]>([]);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [suggestedThemes, setSuggestedThemes] = useState<TagCount[]>([]);

  useEffect(() => {
    if (!id) return;
    getEntry(db, id).then((entry) => {
      setText(entry?.text ?? '');
      setExistingAttachments(entry?.attachments ?? []);
      setThemes(entry?.tags.map((t) => t.tag) ?? []);
      setEmotions(entry?.emotions.map((e) => e.emotion) ?? []);
      setLoaded(true);
    });
    tagCounts(db).then(setSuggestedThemes);
  }, [db, id]);

  const addPending = (attachment: PendingAttachment) => setPendingAttachments((prev) => [...prev, attachment]);

  const pickPhotoOrVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Enable photo access in Settings to attach photos or videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.type === 'video') {
      addPending({ kind: 'video', uri: asset.uri, durationMs: asset.duration ?? null, fileSize: asset.fileSize ?? null });
    } else {
      addPending({ kind: 'photo', uri: asset.uri, fileSize: asset.fileSize ?? null });
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    addPending({ kind: 'file', uri: asset.uri, name: asset.name, fileSize: asset.size ?? null });
  };

  const submitLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    addPending({ kind: 'link', url, title: url });
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const removeExistingAttachment = async (attachment: Attachment) => {
    if (attachment.filePath) deleteIfExists(new File(attachment.filePath));
    if (attachment.thumbnailPath) deleteIfExists(new File(attachment.thumbnailPath));
    await deleteAttachment(db, attachment.id);
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
  };

  const removePendingAttachment = (index: number) =>
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));

  const attachmentItems: AttachmentItem[] = [
    ...existingAttachments.map((a) => ({
      key: a.id,
      type: a.type,
      label: a.title ?? a.type,
      thumbnailUri: a.thumbnailPath ?? a.filePath,
      onRemove: () => removeExistingAttachment(a),
    })),
    ...pendingAttachments.map((p, i) => ({
      key: `pending-${i}`,
      type: p.kind,
      label: p.kind === 'file' ? p.name : p.kind === 'link' ? p.title : p.kind,
      thumbnailUri: p.kind === 'photo' || p.kind === 'video' ? p.uri : undefined,
      onRemove: () => removePendingAttachment(i),
    })),
  ];

  const save = async () => {
    if (saving || text.trim().length === 0) return;
    setSaving(true);

    const entryId = id ?? newId();

    if (id) {
      await updateEntryText(db, id, text.trim());
      await setEntryTags(
        db,
        id,
        themes.map((t) => ({ tag: t, source: 'user' as const, confidence: null }))
      );
      await setEntryEmotions(
        db,
        id,
        emotions.map((name) => ({ emotion: name, ...EMOTION_CATALOG[name] }))
      );
    } else {
      const streakBefore = await computeStreak(db);
      const isFirstEntryToday = !streakBefore.daysWithEntries.has(localDayString());
      await createEntry(db, {
        id: entryId,
        kind: 'text',
        createdAt: new Date().toISOString(),
        text: text.trim(),
        transcriptionStatus: 'done',
      });
      if (isFirstEntryToday) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    for (const pending of pendingAttachments) {
      const attachment = await persistPendingAttachment(entryId, pending);
      await addAttachment(db, attachment);
    }

    const entry = await getEntry(db, entryId);
    if (entry) {
      emitEntrySaved(entry);
      if (!id) processNewEntry(db, entry);
    }

    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.toolbar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
          <Pressable onPress={save} hitSlop={12} disabled={saving || text.trim().length === 0}>
            <ThemedText type="smallBold" themeColor={text.trim().length === 0 ? 'textSecondary' : 'accent'}>
              Save
            </ThemedText>
          </Pressable>
        </View>

        {loaded && (
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <TextInput
              style={[styles.input, { color: theme.text }]}
              multiline
              autoFocus={!isEditing}
              placeholder="What's on your mind?"
              placeholderTextColor={theme.textSecondary}
              value={text}
              onChangeText={setText}
            />

            <AttachmentStrip items={attachmentItems} />

            {showLinkInput && (
              <View style={styles.linkRow}>
                <TextInput
                  style={[styles.input, styles.linkInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                  placeholder="Paste a link"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  onSubmitEditing={submitLink}
                  returnKeyType="done"
                />
                <Pressable onPress={submitLink} hitSlop={12}>
                  <ThemedText type="smallBold" themeColor="accent">
                    Add
                  </ThemedText>
                </Pressable>
              </View>
            )}

            <Host matchContents seedColor={theme.accent}>
              <Menu label="Attach">
                <Button label="Photo or Video" onPress={pickPhotoOrVideo} />
                <Button label="File" onPress={pickFile} />
                <Button label="Link" onPress={() => setShowLinkInput(true)} />
              </Menu>
            </Host>

            {isEditing && (
              <TagEditor
                themes={themes}
                onThemesChange={setThemes}
                suggestedThemes={suggestedThemes}
                emotions={emotions}
                onEmotionsChange={setEmotions}
              />
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  body: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four },
  input: { fontSize: 16, lineHeight: 24, minHeight: 120, textAlignVertical: 'top' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  linkInput: { flex: 1, minHeight: undefined, borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
