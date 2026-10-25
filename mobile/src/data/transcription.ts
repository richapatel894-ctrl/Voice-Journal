import { File } from 'expo-file-system';

import { aiEndpoint, hasAiBackend } from '@/data/backend';

/** Whisper through OpenRouter: one key for transcription, tagging and summaries (PRD §11). */
const TRANSCRIPTION_MODEL = 'openai/whisper-1';

/** True when the app can reach an AI backend (our proxy, or a development key); there is no in-app key screen. */
export function hasTranscriptionKey(): boolean {
  return hasAiBackend();
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

type Segment = { text?: string; no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number };

/**
 * Whisper makes up text ("thanks for watching", gibberish, a phrase repeated over and over) when it is
 * given silence or noise. Measured on real recordings: spoken phrases score no_speech 0.01-0.08 with
 * avg_logprob about -0.3; invented ones scored no_speech 0.25-0.60, or avg_logprob -2.0 for gibberish.
 * Tuned on a handful of samples: loosen `noSpeech` if real speech in noisy rooms is being dropped.
 */
function isLikelyHallucination(seg: Segment): boolean {
  const noSpeech = seg.no_speech_prob ?? 0;
  const logprob = seg.avg_logprob ?? 0;
  const repetitive = (seg.compression_ratio ?? 0) > 2.4; // Whisper's own repetition cutoff
  // Very unsure (Whisper's own cutoff is -1), or it thinks this was probably not speech at all.
  return repetitive || logprob < -1 || noSpeech > 0.2;
}

/** Thrown when the request reached OpenRouter but failed, so callers can mark the entry `failed` and offer a retry. */
export class TranscriptionError extends Error {}

/**
 * Sends a recorded m4a file to Whisper via OpenRouter's `/audio/transcriptions` and returns the text.
 * The audio is uploaded to OpenRouter (PRD §9 privacy note). OpenRouter has a ~60s upstream limit,
 * which is far above what Whisper needs for typical journal entries.
 */
export async function transcribeAudio(fileUri: string): Promise<string> {
  const endpoint = aiEndpoint('transcribe');
  if (!endpoint) throw new TranscriptionError('No AI backend configured');

  const audio = toBase64(await new File(fileUri).arrayBuffer());
  let response: Response;
  try {
    response = await fetch(endpoint.url, {
      method: 'POST',
      headers: endpoint.headers,
      // verbose_json adds per-phrase confidence so we can drop text Whisper invented from silence or noise.
      body: JSON.stringify({
        model: TRANSCRIPTION_MODEL,
        input_audio: { data: audio, format: 'm4a' },
        response_format: 'verbose_json',
      }),
    });
  } catch {
    throw new TranscriptionError('Network request failed');
  }
  if (!response.ok) throw new TranscriptionError(`Transcription failed (${response.status})`);
  const body = (await response.json()) as { text?: string; segments?: Segment[] };
  if (!Array.isArray(body.segments)) return (body.text ?? '').trim(); // provider gave no detail
  if (__DEV__) {
    for (const seg of body.segments) {
      console.log(`[transcribe] no_speech=${seg.no_speech_prob?.toFixed(2)} logprob=${seg.avg_logprob?.toFixed(2)} "${seg.text?.slice(0, 40)}"`);
    }
  }
  return body.segments
    .filter((seg) => !isLikelyHallucination(seg))
    .map((seg) => seg.text ?? '')
    .join('')
    .trim();
}
