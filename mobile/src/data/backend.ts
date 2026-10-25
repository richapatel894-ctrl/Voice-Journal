/**
 * Where the app sends its AI requests (PRD §11).
 *
 * Preferred: our own proxy (a Cloudflare Worker, see /server) that holds the OpenRouter key, so the
 * key never ships inside the app. Set EXPO_PUBLIC_PROXY_URL and EXPO_PUBLIC_APP_TOKEN in the
 * git-ignored mobile/.env.local.
 *
 * Fallback for local development: call OpenRouter directly with EXPO_PUBLIC_OPENROUTER_API_KEY.
 * That key is baked into the app bundle, so it should not be used for builds you share.
 */

const OPENROUTER = 'https://openrouter.ai/api/v1';

export type AiRoute = 'chat' | 'transcribe';
export type AiEndpoint = { url: string; headers: Record<string, string> };

/** Where to send a request for `route`, or null when neither a proxy nor a key is configured. */
export function aiEndpoint(route: AiRoute): AiEndpoint | null {
  const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL;
  const appToken = process.env.EXPO_PUBLIC_APP_TOKEN;
  if (proxyUrl && appToken) {
    return {
      url: `${proxyUrl.replace(/\/$/, '')}/${route}`,
      headers: { 'x-app-token': appToken, 'Content-Type': 'application/json' },
    };
  }

  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return {
    url: `${OPENROUTER}${route === 'chat' ? '/chat/completions' : '/audio/transcriptions'}`,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  };
}

export function hasAiBackend(): boolean {
  return aiEndpoint('chat') !== null;
}
