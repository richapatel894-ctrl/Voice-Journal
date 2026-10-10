import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  audioDirectory,
  computeStreak,
  createEntry,
  emitEntrySaved,
  getEntry,
  newFile,
  newId,
  processNewEntry,
  setEntryAudio,
} from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { localDayString } from '@/lib/date';

const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
const MAX_WAVEFORM_SAMPLES = 40;
/**
 * Whisper invents words ("thanks for watching") when it is given silence or hiss, so recordings
 * without speech are not sent. Metering is polled every 100ms; speech is read as at least this many
 * readings above the level of room noise (about 0.8s of sound in total). Brief clicks don't count.
 */
const SPEECH_LEVEL = 0.45;
const MIN_SPEECH_SAMPLES = 8;

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Metering is dBFS, roughly -160 (silence) to 0 (loudest) — normalize to a 0-1 bar height. */
function normalizeMetering(db: number): number {
  const clamped = Math.max(-60, Math.min(0, db));
  return (clamped + 60) / 60;
}

export default function RecorderScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  // Explicit insets: SafeAreaView did not apply them reliably inside this full-screen modal.
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  // Polls the recorder (expo-audio has no metering event, only this poll) —
  // accumulating that into a waveform history is exactly the "subscribe to
  // an external system's changing value" case the set-state-in-effect rule
  // means to allow, even though the linter can't tell the difference here
  // (see the same unavoidable pattern already in use-color-scheme.web.ts).
  const state = useAudioRecorderState(recorder, 100);
  const [waveform, setWaveform] = useState<number[]>([]);
  // Whole-recording sound tally (the waveform above only keeps the last few bars for display).
  const meteredSamples = useRef(0);
  const speechSamples = useRef(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPermissionDenied(true);
        return;
      }
      // iOS refuses to record until the audio session is switched into recording mode.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    })();
  }, [recorder]);

  useEffect(() => {
    if (state.isRecording && typeof state.metering === 'number') {
      const level = normalizeMetering(state.metering);
      meteredSamples.current += 1;
      if (level >= SPEECH_LEVEL) speechSamples.current += 1;
      setWaveform((prev) => [...prev.slice(-(MAX_WAVEFORM_SAMPLES - 1)), level]);
    }
  }, [state.isRecording, state.metering]);

  // Recording mode routes audio to the earpiece; switch back so playback uses the speaker.
  const leaveRecordingMode = () => setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const discard = async () => {
    if (recorder.isRecording) await recorder.stop();
    await leaveRecordingMode();
    router.back();
  };

  const togglePause = () => {
    if (state.isRecording) recorder.pause();
    else recorder.record();
  };

  const stopAndSave = async () => {
    if (saving) return;
    setSaving(true);

    const streakBefore = await computeStreak(db);
    const isFirstEntryToday = !streakBefore.daysWithEntries.has(localDayString());

    await recorder.stop();
    await leaveRecordingMode();
    const sourceUri = recorder.uri;
    if (!sourceUri) {
      setSaving(false);
      return;
    }

    const hasSpeech = meteredSamples.current === 0 || speechSamples.current >= MIN_SPEECH_SAMPLES;

    const file = newFile(audioDirectory, 'm4a');
    await new File(sourceUri).move(file);

    const id = newId();
    await createEntry(db, {
      id,
      kind: 'voice',
      createdAt: new Date().toISOString(),
      text: '',
      // No metering readings at all means we can't tell, so assume speech rather than drop the audio.
      transcriptionStatus: !hasSpeech ? 'done' : 'pending',
    });
    await setEntryAudio(db, {
      entryId: id,
      filePath: file.uri,
      durationMs: state.durationMillis,
      waveform,
    });

    const entry = await getEntry(db, id);
    if (entry) {
      if (isFirstEntryToday) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      emitEntrySaved(entry);
      processNewEntry(db, entry);
    }

    router.back();
  };

  if (permissionDenied) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ThemedText type="subtitle" style={styles.centerText}>
            Microphone access needed
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Voice Journal cannot record without microphone access. Enable it in Settings to record
            a voice entry.
          </ThemedText>
          <Pressable onPress={() => router.back()} style={[styles.closeButton, { backgroundColor: theme.accent }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Close
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={styles.header}>
          <Pressable onPress={discard} hitSlop={12}>
            <ThemedText themeColor="textSecondary">Discard</ThemedText>
          </Pressable>
        </View>

        <View style={styles.center}>
          <ThemedText type="title">{formatDuration(state.durationMillis)}</ThemedText>

          <View style={styles.waveform}>
            {waveform.length === 0 ? (
              <ThemedText themeColor="textSecondary">
                {state.isRecording ? 'Listening…' : 'Paused'}
              </ThemedText>
            ) : (
              waveform.map((amplitude, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    { height: 4 + amplitude * 64, backgroundColor: theme.accent },
                  ]}
                />
              ))
            )}
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={togglePause} style={[styles.pauseButton, { borderColor: theme.accent }]}>
            <ThemedText type="smallBold" themeColor="accent">
              {state.isRecording ? 'Pause' : 'Resume'}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={stopAndSave}
            disabled={saving}
            style={[styles.stopButton, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Stop
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: Spacing.four },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  centerText: { textAlign: 'center' },
  closeButton: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  header: { alignItems: 'flex-end' },
  center: { alignItems: 'center', gap: Spacing.five },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 68,
    minWidth: 240,
    justifyContent: 'center',
  },
  waveformBar: { width: 4, borderRadius: 2 },
  controls: { flexDirection: 'row', gap: Spacing.three, justifyContent: 'center' },
  pauseButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    borderWidth: 1.5,
  },
  stopButton: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
});
