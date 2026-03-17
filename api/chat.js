// api/chat.js — Chat com RAG usando artigos enviados pelo widget
// POST /api/chat
// Body: { message, articles?, pageTitle?, pageUrl? }

import { model, SYSTEM_PROMPT } from '../lib/gemini.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { message, articles, pageTitle, pageUrl } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Mensagem inválida' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: 'Mensagem muito longa (máx. 500 caracteres)' });
  }

  try {
    // Contexto dos artigos (enviados pelo widget)
    const context = articles?.length
      ? articles.slice(0, 10).map((a, i) =>
          `[Artigo ${i + 1}]\nTítulo: ${a.title}\nURL: ${a.link}\nData: ${a.date}\nResumo: ${a.summary}\n---`
        ).join('\n\n')
      : 'Nenhum artigo disponível no momento.';

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

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[chat] Erro:', err.message);

    if (err.message?.includes('API_KEY') || err.status === 401) {
      return res.status(500).json({ reply: 'Erro de configuração. Contate o administrador.' });
    }
    if (err.status === 429 || err.message?.includes('quota')) {
      return res.status(429).json({ reply: 'Muitas perguntas em pouco tempo. Tente em alguns segundos! 🔄' });
    }
    return res.status(500).json({ reply: 'Estou com uma instabilidade momentânea. Tente novamente em instantes! 🔄' });
  }
}
