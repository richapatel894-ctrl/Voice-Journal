import assert from 'node:assert/strict';
import { test } from 'node:test';

import worker, { CHAT_MODEL, TRANSCRIBE_MODEL, sanitizeChat, sanitizeTranscribe } from '../src/index.js';

const env = { APP_TOKEN: 'secret-token', OPENROUTER_API_KEY: 'sk-test' };
const post = (path, body, token = 'secret-token') =>
  new Request(`https://proxy.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-token': token },
    body: JSON.stringify(body),
  });

test('chat: allowed model passes and max_tokens is capped', () => {
  const clean = sanitizeChat({ model: CHAT_MODEL, messages: [{ role: 'user', content: 'hi' }], max_tokens: 999999 });
  assert.equal(clean.max_tokens, 1500);
  assert.equal(clean.model, CHAT_MODEL);
});

test('chat: other models and odd fields are refused or dropped', () => {
  assert.equal(sanitizeChat({ model: 'anthropic/claude-opus', messages: [{ role: 'user', content: 'hi' }] }), null);
  const clean = sanitizeChat({ model: CHAT_MODEL, messages: [{ role: 'user', content: 'hi', extra: 1 }], tools: [{}], stream: true });
  assert.deepEqual(Object.keys(clean).sort(), ['max_tokens', 'messages', 'model']);
  assert.deepEqual(Object.keys(clean.messages[0]).sort(), ['content', 'role']);
});

test('chat: too many or malformed messages are refused', () => {
  const many = Array.from({ length: 7 }, () => ({ role: 'user', content: 'x' }));
  assert.equal(sanitizeChat({ model: CHAT_MODEL, messages: many }), null);
  assert.equal(sanitizeChat({ model: CHAT_MODEL, messages: [{ role: 'tool', content: 'x' }] }), null);
  assert.equal(sanitizeChat({ model: CHAT_MODEL, messages: [] }), null);
});

test('transcribe: only whisper with a known audio format', () => {
  const ok = sanitizeTranscribe({ model: TRANSCRIBE_MODEL, input_audio: { data: 'AAAA', format: 'm4a' }, response_format: 'verbose_json' });
  assert.equal(ok.response_format, 'verbose_json');
  assert.equal(sanitizeTranscribe({ model: 'other', input_audio: { data: 'AAAA', format: 'm4a' } }), null);
  assert.equal(sanitizeTranscribe({ model: TRANSCRIBE_MODEL, input_audio: { data: 'AAAA', format: 'exe' } }), null);
});

test('requests without the right token get 401 and never reach OpenRouter', async () => {
  const res = await worker.fetch(post('/chat', { model: CHAT_MODEL, messages: [{ role: 'user', content: 'hi' }] }, 'wrong'), env);
  assert.equal(res.status, 401);
});

test('unknown paths and methods get 404; health needs no token', async () => {
  assert.equal((await worker.fetch(post('/models', {}), env)).status, 404);
  assert.equal((await worker.fetch(new Request('https://proxy.test/chat'), env)).status, 404);
  assert.equal((await worker.fetch(new Request('https://proxy.test/health'), env)).status, 200);
});

test('a disallowed request with a valid token is refused with 400', async () => {
  const res = await worker.fetch(post('/chat', { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] }), env);
  assert.equal(res.status, 400);
});

test('a missing secret means the server says it is not set up', async () => {
  const res = await worker.fetch(post('/chat', {}), {});
  assert.equal(res.status, 500);
});
