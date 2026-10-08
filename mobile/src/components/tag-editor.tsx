import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { TagChip } from '@/components/tag-chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { EMOTION_NAMES, MAX_EMOTIONS_PER_ENTRY, type TagCount } from '@/data';
import { useTheme } from '@/hooks/use-theme';

type TagEditorProps = {
  themes: string[];
  onThemesChange: (themes: string[]) => void;
  suggestedThemes: TagCount[];
  emotions: string[];
  onEmotionsChange: (emotions: string[]) => void;
};

export function TagEditor({
  themes,
  onThemesChange,
  suggestedThemes,
  emotions,
  onEmotionsChange,
}: TagEditorProps) {
  const theme = useTheme();
  const [newTheme, setNewTheme] = useState('');

  const addTheme = () => {
    const value = newTheme.trim();
    if (value && !themes.includes(value)) onThemesChange([...themes, value]);
    setNewTheme('');
  };
  const removeTheme = (t: string) => onThemesChange(themes.filter((x) => x !== t));

  const toggleEmotion = (name: string) => {
    if (emotions.includes(name)) {
      onEmotionsChange(emotions.filter((e) => e !== name));
    } else if (emotions.length < MAX_EMOTIONS_PER_ENTRY) {
      onEmotionsChange([...emotions, name]);
    }
  };

  const unusedSuggestions = suggestedThemes.filter((s) => !themes.includes(s.tag)).slice(0, 8);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <ThemedText type="label" themeColor="textSecondary">
          Themes
        </ThemedText>
        <View style={styles.chipRow}>
          {themes.map((t) => (
            <TagChip key={t} label={t} selected onPress={() => removeTheme(t)} />
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Add a theme"
            placeholderTextColor={theme.textSecondary}
            value={newTheme}
            onChangeText={setNewTheme}
            onSubmitEditing={addTheme}
            returnKeyType="done"
          />
          <Pressable onPress={addTheme} hitSlop={12}>
            <ThemedText type="smallBold" themeColor="accentText">
              Add
            </ThemedText>
          </Pressable>
        </View>
        {unusedSuggestions.length > 0 && (
          <View style={styles.chipRow}>
            {unusedSuggestions.map((s) => (
              <TagChip
                key={s.tag}
                label={s.tag}
                selected={false}
                onPress={() => onThemesChange([...themes, s.tag])}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="label" themeColor="textSecondary">
          Emotions (up to {MAX_EMOTIONS_PER_ENTRY})
        </ThemedText>
        <View style={styles.chipRow}>
          {EMOTION_NAMES.map((name) => {
            const selected = emotions.includes(name);
            const disabled = !selected && emotions.length >= MAX_EMOTIONS_PER_ENTRY;
            return (
              <View key={name} style={disabled && styles.disabledChip}>
                <TagChip label={name} variant="emotion" selected={selected} onPress={() => toggleEmotion(name)} />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  section: { gap: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  input: { flex: 1, borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  disabledChip: { opacity: 0.4 },
});
