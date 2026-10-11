const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
/** One model for tagging and summaries (PRD §11). */
export const LLM_MODEL = 'openai/gpt-5.6-luna';

export class LlmError extends Error {}

export function hasLlmKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_OPENROUTER_API_KEY);
}

/** Sends one prompt to the LLM through OpenRouter and returns the reply text. Throws `LlmError` on any failure. */
export async function callLlm(options: { prompt: string; json?: boolean; maxTokens: number }): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) throw new LlmError('No OpenRouter key configured');

  let response: Response;
  try {
    response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: options.prompt }],
        max_tokens: options.maxTokens,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
  } catch {
    throw new LlmError('Network request failed');
  }
  if (!response.ok) {
    if (__DEV__) console.warn(`[llm] HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    throw new LlmError(`LLM request failed (${response.status})`);
  }
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) throw new LlmError('Empty LLM response');
  return content;
}
