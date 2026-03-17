// api/chat.js — Endpoint do chat com RAG usando Gemini
// POST /api/chat
// Body: { message: string, pageTitle?: string, pageUrl?: string }

import { fetchArticles, articlesToContext } from '../lib/rss.js';
import { model, SYSTEM_PROMPT } from '../lib/gemini.js';

// Cache de artigos (TTL: 30 min)
let articlesCache = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000;

async function getArticlesCached() {
  const now = Date.now();
  if (articlesCache && (now - cacheTime) < CACHE_TTL) return articlesCache;
  articlesCache = await fetchArticles(12);
  cacheTime = now;
  return articlesCache;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { message, pageTitle, pageUrl } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Mensagem inválida' });
  }

  if (message.length > 500) {
    return res.status(400).json({ error: 'Mensagem muito longa (máx. 500 caracteres)' });
  }

  try {
    const articles = await getArticlesCached();
    const context = articlesToContext(articles);

    const pageContext = pageTitle
      ? `\nO usuário está lendo: "${pageTitle}"${pageUrl ? ` (${pageUrl})` : ''}`
      : '';

    const prompt = `${SYSTEM_PROMPT}${pageContext}

--- ARTIGOS DISPONÍVEIS NO PORTAL ---
${context}

--- PERGUNTA DO USUÁRIO ---
${message.trim()}`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text() || 'Desculpe, não consegui processar sua pergunta.';

    const relatedArticles = articles.slice(0, 3).map(a => ({
      title: a.title,
      link: a.link,
      summary: a.summary.slice(0, 120) + '...',
      date: a.pubDate,
    }));

    return res.status(200).json({ reply, relatedArticles });

  } catch (err) {
    console.error('[chat] Erro:', err.message);

    if (err.message?.includes('API_KEY') || err.status === 401) {
      return res.status(500).json({ error: 'Chave do Gemini inválida.', reply: 'Erro de configuração. Contate o administrador.' });
    }

    if (err.status === 429 || err.message?.includes('quota')) {
      return res.status(429).json({ error: 'Rate limit atingido.', reply: 'Muitas perguntas em pouco tempo. Tente em alguns segundos! 🔄' });
    }

    return res.status(500).json({
      error: 'Erro interno.',
      reply: 'Estou com uma instabilidade momentânea. Tente novamente em instantes! 🔄'
    });
  }
}
