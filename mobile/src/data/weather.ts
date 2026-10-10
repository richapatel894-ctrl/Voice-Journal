import * as Location from 'expo-location';

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
export type Weather = { kind: WeatherKind; temperatureC: number };

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 6000;

let cache: { at: number; weather: Weather } | null = null;

/** WMO weather codes as used by Open-Meteo. */
function kindForCode(code: number): WeatherKind {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'cloudy';
}

async function currentCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status === 'undetermined') permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return null; // denied: the banner just shows the plain scene

  const position =
    (await Location.getLastKnownPositionAsync()) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  return position ? position.coords : null;
}

/**
 * Current weather from Open-Meteo (free, no key). Uses coarse location and sends it rounded to two
 * decimals (about 1 km). Returns null if location is off, the phone is offline, or the request is slow;
 * the banner then shows the normal scene without weather.
 */
export async function fetchWeather(): Promise<Weather | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.weather;
  try {
    const coords = await currentCoordinates();
    if (!coords) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const url = `${FORECAST_URL}?latitude=${coords.latitude.toFixed(2)}&longitude=${coords.longitude.toFixed(2)}&current=temperature_2m,weather_code`;
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!response.ok) return null;
    const body = (await response.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    if (typeof body.current?.temperature_2m !== 'number' || typeof body.current.weather_code !== 'number') return null;
    const weather = { kind: kindForCode(body.current.weather_code), temperatureC: Math.round(body.current.temperature_2m) };
    cache = { at: Date.now(), weather };
    return weather;
  } catch {
    return null;
  }
}
