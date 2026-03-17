// api/chat.js — Endpoint principal do chat com RAG
// POST /api/chat
// Body: { message: string, pageTitle?: string, pageUrl?: string }

import { fetchArticles, articlesToContext } from '../lib/rss.js';
import { openai, MODELS, SYSTEM_PROMPT } from '../lib/openai.js';

// Cache simples em memória (TTL: 30 min) para evitar RSS a cada request
let articlesCache = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

async function getArticlesCached() {
  const now = Date.now();
  if (articlesCache && (now - cacheTime) < CACHE_TTL) {
    return articlesCache;
  }
  articlesCache = await fetchArticles(12);
  cacheTime = now;
  return articlesCache;
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { message, pageTitle, pageUrl } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Mensagem inválida' });
  }

  if (message.length > 500) {
    return res.status(400).json({ error: 'Mensagem muito longa (máx. 500 caracteres)' });
  }

  try {
    // 1. Busca artigos do portal (com cache)
    const articles = await getArticlesCached();
    const context = articlesToContext(articles);

    // 2. Monta contexto da página atual (se disponível)
    const pageContext = pageTitle
      ? `\n\nO usuário está lendo atualmente: "${pageTitle}"${pageUrl ? ` (${pageUrl})` : ''}`
      : '';

    // 3. Chama GPT-4o-mini com contexto RAG
    const completion = await openai.chat.completions.create({
      model: MODELS.chat,
      max_tokens: 400,
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + pageContext + `\n\n--- ARTIGOS DISPONÍVEIS NO PORTAL ---\n${context}`
        },
        {
          role: 'user',
          content: message.trim()
        }
      ]
    });

    const reply = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';

    // 4. Retorna resposta + artigos relacionados (os 3 mais recentes do contexto)
    const relatedArticles = articles.slice(0, 3).map(a => ({
      title: a.title,
      link: a.link,
      summary: a.summary.slice(0, 120) + '...',
      date: a.pubDate,
    }));

    return res.status(200).json({
      reply,
      relatedArticles,
      usage: {
        tokens: completion.usage?.total_tokens || 0,
      }
    });

  } catch (err) {
    console.error('[chat] Erro:', err.message);

    if (err.status === 401) {
      return res.status(500).json({ error: 'Configuração da API inválida.' });
    }

    return res.status(500).json({
      error: 'Erro interno. Tente novamente em instantes.',
      reply: 'Estou com uma instabilidade momentânea. Tente novamente em alguns segundos! 🔄'
    });
  }
}
