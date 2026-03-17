// api/briefing.js — Flash Briefing semanal com resumo gerado por Gemini
// GET /api/briefing

import { fetchArticles } from '../lib/rss.js';
import { model, SYSTEM_PROMPT } from '../lib/gemini.js';

// Cache do briefing (TTL: 6 horas)
let briefingCache = null;
let briefingCacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const now = Date.now();

    if (briefingCache && (now - briefingCacheTime) < CACHE_TTL) {
      return res.status(200).json(briefingCache);
    }

    const articles = await fetchArticles(5);

    if (articles.length === 0) {
      return res.status(200).json({
        articles: [],
        aiSummary: 'Não foi possível carregar os artigos no momento.',
        generatedAt: new Date().toISOString(),
      });
    }

    const articleList = articles
      .map((a, i) => `${i + 1}. "${a.title}" — ${a.summary}`)
      .join('\n');

    const prompt = `${SYSTEM_PROMPT}

Crie um resumo de rádio/podcast de exatamente 3 parágrafos curtos sobre os artigos desta semana.

Regras:
- Linguagem fluida, como se estivesse narrando para um podcast de 1 minuto
- Mencione 2-3 artigos naturalmente no texto
- Termine com uma frase de engajamento convidando o ouvinte a explorar o portal
- SEMPRE em português brasileiro
- Sem marcadores, listas ou emojis — texto corrido apenas

Artigos desta semana:
${articleList}`;

    const result = await model.generateContent(prompt);
    const aiSummary = result.response.text() || '';

    const response = {
      articles: articles.map(a => ({
        title: a.title,
        link: a.link,
        summary: a.summary.slice(0, 150) + (a.summary.length > 150 ? '...' : ''),
        date: a.pubDate,
        categories: a.categories,
        author: a.author,
      })),
      aiSummary,
      weekLabel: getWeekLabel(),
      generatedAt: new Date().toISOString(),
    };

    briefingCache = response;
    briefingCacheTime = now;

    return res.status(200).json(response);

  } catch (err) {
    console.error('[briefing] Erro:', err.message, err.stack);

    if (err.message?.includes('API_KEY') || err.status === 401 || err.message?.includes('API key')) {
      return res.status(500).json({
        error: 'Chave do Gemini inválida ou ausente.',
        hint: 'Verifique a variável GEMINI_API_KEY nas configurações do Vercel e faça um redeploy.',
        step: 'env_vars'
      });
    }

    if (err.message?.includes('fetch') || err.message?.includes('ENOTFOUND') || err.message?.includes('RSS')) {
      return res.status(500).json({
        error: 'Não foi possível acessar o RSS do portal.',
        hint: 'Verifique se https://www.tudosobrecdp.com.br/feed está acessível.',
        step: 'rss'
      });
    }

    if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('rate')) {
      return res.status(429).json({
        error: 'Limite de requisições do Gemini atingido.',
        hint: 'Aguarde alguns segundos e tente novamente.',
        step: 'rate_limit'
      });
    }

    return res.status(500).json({
      error: 'Erro interno ao gerar briefing.',
      detail: err.message || 'Erro desconhecido',
      step: 'unknown'
    });
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
