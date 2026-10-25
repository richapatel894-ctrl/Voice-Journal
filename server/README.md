# Voice Journal key server

A tiny Cloudflare Worker that holds the OpenRouter key so it never ships inside the app.

```text
app ──(X-App-Token)──▶ Worker ──(OpenRouter key)──▶ OpenRouter
        /chat       →  /chat/completions   (tagging, summaries; model openai/gpt-5.6-luna only)
        /transcribe →  /audio/transcriptions (openai/whisper-1 only)
        /health     →  { ok: true }
```

What the Worker enforces: a shared token, the two allowed models, a cap on `max_tokens`, size limits, and a
best-effort per-IP rate limit. The key and token live only in Cloudflare's secret store.

## Set up (one time)

```bash
bash server/setup.sh
```

The wizard installs the tools, logs you in to Cloudflare, deploys, stores the secrets, writes
`EXPO_PUBLIC_PROXY_URL` and `EXPO_PUBLIC_APP_TOKEN` into `mobile/.env.local`, and sends one test message.
Restart Metro afterwards so the app picks the values up.

## Develop

```bash
cd server && npm test      # proxy rules, no network
cd server && npm run deploy
```

Honest limit: the app still carries the shared token, so someone who takes it out of the app can use the
helper within these limits. Your OpenRouter spending cap bounds that cost.
