import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Scene } from '@/components/welcome/scene';
import { GREETING } from '@/components/welcome/scene-data';
import { Fonts, Spacing } from '@/constants/theme';
import { findQuote } from '@/content/quotes';
import type { Weather } from '@/data/weather';
import type { WelcomeChoice } from '@/data/welcome';

const BANNER_HEIGHT = 290;
const WEATHER_ICON = { clear: '☀️', partly: '⛅', cloudy: '☁️', rain: '🌧️', storm: '⛈️', snow: '❄️', fog: '🌫️' } as const;

type WelcomeBannerProps = {
  name: string | null;
  choice: WelcomeChoice;
  weather: Weather | null;
  onNextQuote: () => void;
  /** Development only: long-press the banner to step through every look, tap the chip to cycle weather. */
  onDevPreview?: () => void;
  onDevWeather?: () => void;
};

/**
 * The Home welcome banner (PRD §8.1): greeting, animated time-of-day scene, a quote on a translucent
 * plate, and a weather chip. The ground in the scene rises above the quote so scenery stays visible.
 */
export function WelcomeBanner({ name, choice, weather, onNextQuote, onDevPreview, onDevWeather }: WelcomeBannerProps) {
  const [width, setWidth] = useState(0);
  // Tabs stay mounted behind each other; drawing the animated scene only while Home is showing keeps the other tabs smooth.
  const focused = useIsFocused();
  const night = choice.timeOfDay === 'night';
  const quote = findQuote(choice.timeOfDay, choice.quoteId);
  const copy = GREETING[choice.timeOfDay];
  const ink = night ? '#F2EEE6' : '#2A1F1C';
  const soft = night ? '#C9C6DE' : '#6B5F55';
  const icon = night && (!weather || weather.kind === 'clear') ? '🌙' : WEATHER_ICON[weather?.kind ?? 'clear'];

  return (
    <Pressable style={styles.card} onLongPress={onDevPreview} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && focused && (
        <Scene
          key={`${choice.timeOfDay}-${choice.look}`}
          time={choice.timeOfDay}
          lookIndex={choice.look}
          weather={weather?.kind ?? null}
          width={width}
          height={BANNER_HEIGHT}
        />
      )}

      <View style={styles.greeting} pointerEvents="none">
        <Text style={[styles.hello, { color: ink }]}>{name ? `${copy.hello}, ${name}` : copy.hello}</Text>
        <Text style={[styles.sub, { color: soft }]}>{copy.sub}</Text>
      </View>

      {weather && (
        <Pressable onPress={onDevWeather} style={[styles.chip, night ? styles.chipNight : styles.chipDay]}>
          <Text style={[styles.chipText, { color: ink }]}>
            {icon} {weather.temperatureC}°C
          </Text>
        </Pressable>
      )}

      {quote && (
        <Pressable
          onPress={onNextQuote}
          accessibilityLabel="Quote. Tap for another."
          style={[styles.quote, night ? styles.quoteNight : styles.quoteDay]}>
          <Text style={[styles.quoteText, { color: ink }]}>“{quote.text}”</Text>
          <Text style={[styles.quoteBy, { color: ink }]}>— {quote.author}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { height: BANNER_HEIGHT, borderRadius: 28, overflow: 'hidden' },
  greeting: { position: 'absolute', top: Spacing.three, left: Spacing.three + 2, maxWidth: 180 },
  hello: { fontFamily: Fonts.serif, fontSize: 27, lineHeight: 30, fontWeight: '600' },
  sub: { marginTop: 4, fontSize: 14 },
  chip: { position: 'absolute', top: Spacing.three, right: Spacing.three, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  chipDay: { backgroundColor: 'rgba(255,255,255,0.62)' },
  chipNight: { backgroundColor: 'rgba(20,23,51,0.55)' },
  chipText: { fontSize: 12, fontWeight: '700' },
  quote: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  quoteDay: { backgroundColor: 'rgba(255,255,255,0.66)' },
  quoteNight: { backgroundColor: 'rgba(20,23,51,0.6)' },
  quoteText: { fontFamily: Fonts.serif, fontStyle: 'italic', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  quoteBy: { marginTop: 3, fontSize: 11, opacity: 0.7 },
});
