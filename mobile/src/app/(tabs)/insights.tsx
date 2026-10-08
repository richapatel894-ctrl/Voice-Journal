import { Chart, Host, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmotionMap } from '@/components/emotion-map';
import { HeatmapSummary, JournalingHeatmap } from '@/components/journaling-heatmap';
import { StatTiles } from '@/components/stat-tiles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  EMOTION_GUIDANCE,
  PERIOD_LABELS,
  computeStreak,
  emotionMapStats,
  heatmapData,
  insightsSnapshot,
  moodOverTime,
  periodStartDay,
  type HeatmapDay,
  type InsightsSnapshot,
  type MoodPoint,
  type Period,
} from '@/data';
import { useTheme } from '@/hooks/use-theme';

type EmotionPoint = { emotion: string; count: number; valence: number; arousal: number };

const PERIODS: Period[] = ['3M', '6M', '12M', 'YEAR', 'ALL'];

/** One point per day (average valence) labelled "Oct 8", so the chart's x-axis shows dates, not entry indices. */
function moodByDay(points: MoodPoint[]): { x: string; y: number }[] {
  const byDay = new Map<string, number[]>();
  for (const p of points) byDay.set(p.day, [...(byDay.get(p.day) ?? []), p.valence]);
  const days = [...byDay.keys()].sort();
  const multiYear = days.length > 0 && days[0].slice(0, 4) !== days[days.length - 1].slice(0, 4);
  return days.map((day) => {
    const [y, m, d] = day.split('-').map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(multiYear ? { year: '2-digit' } : {}),
    });
    const values = byDay.get(day)!;
    return { x: label, y: values.reduce((a, b) => a + b, 0) / values.length };
  });
}

export default function InsightsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>('3M');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);

  const [emotionPoints, setEmotionPoints] = useState<EmotionPoint[]>([]);
  const [snapshot, setSnapshot] = useState<InsightsSnapshot>({ entryCount: 0, topTheme: null, topEmotion: null });
  const [mood, setMood] = useState<MoodPoint[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const heatmapScroll = useRef<ScrollView>(null);
  const [streak, setStreak] = useState({ current: 0, record: 0 });

  const sinceDay = useMemo(() => periodStartDay(period), [period]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        emotionMapStats(db, sinceDay),
        insightsSnapshot(db, sinceDay),
        moodOverTime(db, sinceDay),
        heatmapData(db, sinceDay),
        computeStreak(db),
      ]).then(([emotions, snap, moodPoints, heat, streakResult]) => {
        setEmotionPoints(emotions);
        setSnapshot(snap);
        setMood(moodPoints);
        setHeatmap(heat);
        setStreak({ current: streakResult.current, record: streakResult.record });
        if (selectedEmotion && !emotions.some((e) => e.emotion === selectedEmotion)) {
          setSelectedEmotion(null);
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, sinceDay])
  );

  const guidanceEmotion = selectedEmotion ?? snapshot.topEmotion;
  const guidance = guidanceEmotion ? EMOTION_GUIDANCE[guidanceEmotion] : null;

  const chartData = moodByDay(mood);
  const daysJournaling = heatmap.filter((d) => d.count > 0).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="title" style={styles.title}>
          Insights
        </ThemedText>

        <ScrollView contentContainerStyle={styles.content}>
          <Host matchContents seedColor={theme.accent}>
            <Picker
              modifiers={[pickerStyle('segmented')]}
              selection={period}
              onSelectionChange={(v) => setPeriod(v as Period)}>
              {PERIODS.map((p) => (
                <UIText key={p} modifiers={[tag(p)]}>
                  {PERIOD_LABELS[p]}
                </UIText>
              ))}
            </Picker>
          </Host>

          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Summary
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText themeColor="textSecondary">
                A written summary needs the AI connection, which is not set up yet.
              </ThemedText>
            </ThemedView>
          </View>

          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Emotional map
            </ThemedText>
            {emotionPoints.length === 0 ? (
              <ThemedText themeColor="textSecondary">No tagged entries in this period yet.</ThemedText>
            ) : (
              <EmotionMap
                points={emotionPoints}
                selected={selectedEmotion}
                onSelect={(emotion) => {
                  setSelectedEmotion(emotion);
                  router.push({ pathname: '/entries', params: { emotion } });
                }}
              />
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Your snapshot
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText>
                {snapshot.entryCount} {snapshot.entryCount === 1 ? 'entry' : 'entries'}
                {snapshot.topTheme ? ` · mostly about ${snapshot.topTheme}` : ''}
                {snapshot.topEmotion ? ` · feeling mostly ${snapshot.topEmotion}` : ''}
              </ThemedText>
              {guidance && (
                <View style={styles.guidance}>
                  <ThemedText type="smallBold">{guidance.what}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {guidance.why}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {guidance.how}
                  </ThemedText>
                </View>
              )}
            </ThemedView>
          </View>

          <StatTiles
            currentStreak={streak.current}
            recordStreak={streak.record}
            totalEntries={snapshot.entryCount}
            daysJournaling={daysJournaling}
          />

          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Mood over time
            </ThemedText>
            {chartData.length < 2 ? (
              <ThemedText themeColor="textSecondary">Not enough entries yet to chart a trend.</ThemedText>
            ) : (
              <Host style={styles.chartHost}>
                <Chart type="area" data={chartData} areaStyle={{ color: theme.accent }} showGrid />
              </Host>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              Journaling heatmap
            </ThemedText>
            <HeatmapSummary days={heatmap} sinceDay={sinceDay} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              ref={heatmapScroll}
              onContentSizeChange={() => heatmapScroll.current?.scrollToEnd({ animated: false })}>
              <JournalingHeatmap
                days={heatmap}
                sinceDay={sinceDay}
                onSelectDay={(day) => router.push({ pathname: '/entries', params: { day } })}
              />
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  title: { fontSize: 32, lineHeight: 40, paddingHorizontal: Spacing.four },
  content: { padding: Spacing.four, gap: Spacing.five },
  section: { gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  guidance: { gap: Spacing.one, marginTop: Spacing.one },
  chartHost: { height: 160 },
});
