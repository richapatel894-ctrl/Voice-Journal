/**
 * Voice Journal proxy (Cloudflare Worker).
 *
 * The app sends its AI requests here instead of to OpenRouter. The Worker checks a shared token,
 * lets through only the two calls the app makes (tagging/summary chat and Whisper transcription),
 * caps their size and cost, adds the OpenRouter key, and passes the answer back. The key lives only
 * in Cloudflare's secret store, never in the app.
 */

const OPENROUTER = 'https://openrouter.ai/api/v1';

export const CHAT_MODEL = 'openai/gpt-5.6-luna';
export const TRANSCRIBE_MODEL = 'openai/whisper-1';

const MAX_TOKENS_CAP = 1500;
const MAX_MESSAGES = 6;
const MAX_MESSAGE_CHARS = 120_000;
const AUDIO_FORMATS = ['m4a', 'wav', 'mp3', 'aac', 'flac', 'ogg', 'webm'];

/** Best-effort per-IP limit (each Worker instance keeps its own count). */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
const hits = new Map();

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Returns the body that may be forwarded for a chat request, or null if it is not allowed. */
export function sanitizeChat(body) {
  if (!body || body.model !== CHAT_MODEL) return null;
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) return null;
  for (const m of body.messages) {
    if (!['system', 'user', 'assistant'].includes(m?.role)) return null;
    if (typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS) return null;
  }
  const requested = Number(body.max_tokens);
  return {
    model: CHAT_MODEL,
    messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: Math.min(Number.isFinite(requested) && requested > 0 ? requested : 800, MAX_TOKENS_CAP),
    ...(body.response_format?.type === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
  };
}

/** Returns the body that may be forwarded for a transcription request, or null. */
export function sanitizeTranscribe(body) {
  if (!body || body.model !== TRANSCRIBE_MODEL) return null;
  const audio = body.input_audio;
  if (!audio || typeof audio.data !== 'string' || audio.data.length === 0) return null;
  if (!AUDIO_FORMATS.includes(audio.format)) return null;
  return {
    model: TRANSCRIBE_MODEL,
    input_audio: { data: audio.data, format: audio.format },
    ...(['json', 'verbose_json'].includes(body.response_format) ? { response_format: body.response_format } : {}),
    ...(typeof body.language === 'string' && /^[a-z]{2}$/.test(body.language) ? { language: body.language } : {}),
  };
}

const ROUTES = {
  '/chat': { upstream: '/chat/completions', maxBytes: 400_000, sanitize: sanitizeChat },
  '/transcribe': { upstream: '/audio/transcriptions', maxBytes: 20_000_000, sanitize: sanitizeTranscribe },
};

/** Compares two strings without stopping at the first difference. */
function sameToken(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

function tooManyRequests(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/health') return json({ ok: true });

    const route = ROUTES[pathname];
    if (request.method !== 'POST' || !route) return json({ error: 'Not found' }, 404);

    if (!env.APP_TOKEN || !env.OPENROUTER_API_KEY) return json({ error: 'Server is not set up' }, 500);
    if (!sameToken(request.headers.get('x-app-token') ?? '', env.APP_TOKEN)) return json({ error: 'Unauthorized' }, 401);
    if (tooManyRequests(request.headers.get('cf-connecting-ip') ?? 'unknown')) return json({ error: 'Too many requests' }, 429);

    if (Number(request.headers.get('content-length') ?? 0) > route.maxBytes) return json({ error: 'Request too large' }, 413);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const clean = route.sanitize(body);
    if (!clean) return json({ error: 'Request not allowed' }, 400);

    const upstream = await fetch(OPENROUTER + route.upstream, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'Voice Journal',
      },
      body: JSON.stringify(clean),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  },
};
