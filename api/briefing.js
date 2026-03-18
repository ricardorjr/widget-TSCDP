// api/briefing.js — Gera resumo IA a partir de artigos enviados pelo widget
// POST /api/briefing
// Body: { articles: Array<{title, link, summary, date}> }

import { openai, MODELS, SYSTEM_PROMPT } from '../lib/openai.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { articles } = req.body || {};

  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return res.status(400).json({ error: 'Nenhum artigo enviado.' });
  }

  try {
    const articleList = articles
      .slice(0, 5)
      .map((a, i) => `${i + 1}. "${a.title}" — ${a.summary || ''}`)
      .join('\n');

    const prompt = `${SYSTEM_PROMPT}

Crie um resumo de rádio/podcast de exatamente 3 parágrafos curtos sobre os artigos desta semana.

Regras:
- Linguagem fluida, como se estivesse narrando para um podcast de 1 minuto
- Mencione 2-3 artigos naturalmente no texto
- Termine com frase de engajamento convidando o ouvinte a explorar o portal
- SEMPRE em português brasileiro
- Sem marcadores, listas ou emojis — texto corrido apenas

Artigos desta semana:
${articleList}`;

    const completion = await openai.chat.completions.create({
      model: MODELS.chat,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.8,
    });
    const aiSummary = completion.choices[0]?.message?.content || '';

    return res.status(200).json({ aiSummary, weekLabel: getWeekLabel() });

  } catch (err) {
    console.error('[briefing] Erro:', err.message);

    if (err.message?.includes('API_KEY') || err.status === 401) {
      return res.status(500).json({ error: 'Chave do Gemini inválida.', step: 'env_vars' });
    }
    if (err.status === 429 || err.message?.includes('quota')) {
      return res.status(429).json({ error: 'Rate limit atingido. Tente em instantes.', step: 'rate_limit' });
    }
    return res.status(500).json({ error: 'Erro ao gerar resumo.', detail: err.message });
  }
}

function getWeekLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}, ${now.getFullYear()}`;
}
