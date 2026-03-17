// api/audio.js — Geração de áudio TTS via OpenAI
// POST /api/audio  — Body: { text: string }
// GET  /api/audio  — Retorna áudio do briefing semanal pré-gerado (armazenado em cache)

import { openai, MODELS } from '../lib/openai.js';

// Cache do áudio semanal (buffer em memória)
// Em produção com escala: salvar no Vercel Blob Storage ou S3
let audioCache = null;
let audioCacheTime = 0;
let audioCacheText = '';
const CACHE_TTL = 48 * 60 * 60 * 1000; // 48 horas

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: serve áudio semanal em cache ─────────────────────────────────────
  if (req.method === 'GET') {
    if (!audioCache) {
      return res.status(404).json({ error: 'Áudio ainda não gerado. Use POST para gerar.' });
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioCache.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).end(audioCache);
  }

  // ── POST: gera áudio a partir de texto ────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { text, forceRegenerate } = req.body || {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Texto inválido' });
  }

  if (text.length > 4000) {
    return res.status(400).json({ error: 'Texto muito longo (máx. 4000 caracteres)' });
  }

  const now = Date.now();

  // Serve cache se o texto não mudou e ainda está válido
  if (
    !forceRegenerate &&
    audioCache &&
    audioCacheText === text &&
    (now - audioCacheTime) < CACHE_TTL
  ) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).end(audioCache);
  }

  try {
    // Chama OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: MODELS.tts,
      voice: 'nova',        // nova = voz feminina, fluida em PT-BR
      input: text.trim(),
      speed: 1.0,
    });

    // Converte para Buffer
    const buffer = Buffer.from(await mp3Response.arrayBuffer());

    // Atualiza cache
    audioCache = buffer;
    audioCacheTime = now;
    audioCacheText = text;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).end(buffer);

  } catch (err) {
    console.error('[audio] Erro TTS:', err.message);
    return res.status(500).json({ error: 'Erro ao gerar áudio. Tente novamente.' });
  }
}
