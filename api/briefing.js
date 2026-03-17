// api/briefing.js — Flash Briefing semanal com resumo gerado por IA
// GET /api/briefing

import { fetchArticles } from '../lib/rss.js';
import { openai, MODELS } from '../lib/openai.js';

// Cache do briefing (TTL: 6 horas — atualiza com o RSS)
let briefingCache = null;
let briefingCacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const now = Date.now();

    // Serve cache se disponível
    if (briefingCache && (now - briefingCacheTime) < CACHE_TTL) {
      return res.status(200).json(briefingCache);
    }

    // Busca os 5 artigos mais recentes
    const articles = await fetchArticles(5);

    if (articles.length === 0) {
      return res.status(200).json({
        articles: [],
        aiSummary: 'Não foi possível carregar os artigos no momento.',
        generatedAt: new Date().toISOString(),
      });
    }

    // Gera resumo executivo da semana com IA
    const articleList = articles
      .map((a, i) => `${i + 1}. "${a.title}" — ${a.summary}`)
      .join('\n');

    const summaryCompletion = await openai.chat.completions.create({
      model: MODELS.chat,
      max_tokens: 300,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `Você é o editor do portal tudosobrecdp.com.br. Crie um resumo de rádio/podcast de exatamente 3 parágrafos curtos sobre os artigos desta semana.

Regras:
- Linguagem fluida, como se estivesse narrando para um podcast de 1 minuto
- Mencione 2-3 artigos naturalmente no texto
- Termine com uma frase de engajamento convidando o ouvinte a explorar o portal
- SEMPRE em português brasileiro
- Sem marcadores, listas ou emojis — texto corrido apenas`
        },
        {
          role: 'user',
          content: `Artigos desta semana:\n${articleList}`
        }
      ]
    });

    const aiSummary = summaryCompletion.choices[0]?.message?.content || '';

    // Formata resposta
    const result = {
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

    // Atualiza cache
    briefingCache = result;
    briefingCacheTime = now;

    return res.status(200).json(result);

  } catch (err) {
    console.error('[briefing] Erro:', err.message, err.stack);

    // Diagnóstico detalhado por tipo de erro
    if (err.message?.includes('OPENAI_API_KEY') || err.status === 401) {
      return res.status(500).json({
        error: 'Chave da OpenAI inválida ou ausente.',
        hint: 'Verifique a variável OPENAI_API_KEY nas configurações do Vercel e faça um redeploy.',
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

    if (err.status === 429) {
      return res.status(429).json({
        error: 'Limite de requisições da OpenAI atingido.',
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
  start.setDate(now.getDate() - now.getDay() + 1); // Segunda
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Domingo

  const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}, ${now.getFullYear()}`;
}
