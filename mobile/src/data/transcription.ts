import { File } from 'expo-file-system';

const TRANSCRIPTION_URL = 'https://openrouter.ai/api/v1/audio/transcriptions';
/** Whisper through OpenRouter: one key for transcription, tagging and summaries (PRD §11). */
const TRANSCRIPTION_MODEL = 'openai/whisper-1';

/** Read at build time from the git-ignored `mobile/.env.local`; there is no in-app key screen. */
export function hasTranscriptionKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_OPENROUTER_API_KEY);
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

/** Thrown when the request reached OpenRouter but failed, so callers can mark the entry `failed` and offer a retry. */
export class TranscriptionError extends Error {}

/**
 * Sends a recorded m4a file to Whisper via OpenRouter's `/audio/transcriptions` and returns the text.
 * The audio is uploaded to OpenRouter (PRD §9 privacy note). OpenRouter has a ~60s upstream limit,
 * which is far above what Whisper needs for typical journal entries.
 */
export async function transcribeAudio(fileUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) throw new TranscriptionError('No OpenRouter key configured');

  const audio = toBase64(await new File(fileUri).arrayBuffer());
  let response: Response;
  try {
    response = await fetch(TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: TRANSCRIPTION_MODEL, input_audio: { data: audio, format: 'm4a' } }),
    });
  } catch {
    throw new TranscriptionError('Network request failed');
  }
  if (!response.ok) throw new TranscriptionError(`Transcription failed (${response.status})`);
  const body = (await response.json()) as { text?: string };
  return (body.text ?? '').trim();
}
