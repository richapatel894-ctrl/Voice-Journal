'use strict';
const fs   = require('fs');
const path = require('path');
const OpenAI = require('openai');

async function transcribe(audioBuffer, filename) {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI();
  const tmpPath = path.join(require('os').tmpdir(), filename || 'audio.webm');

  try {
    fs.writeFileSync(tmpPath, audioBuffer);
    const response = await client.audio.transcriptions.create({
      file:  fs.createReadStream(tmpPath),
      model: 'whisper-1',
    });
    return response.text || null;
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}

module.exports = { transcribe };
