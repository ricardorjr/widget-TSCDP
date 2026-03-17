// lib/rss.js — Busca e parseia o RSS do tudosobrecdp.com.br
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['content:encoded', 'dc:creator']
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; TudoSobreCDP-Bot/1.0; +https://www.tudosobrecdp.com.br)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  timeout: 10000,
});

const RSS_URL = process.env.PORTAL_RSS_URL || 'https://www.tudosobrecdp.com.br/feed';

/**
 * Busca os últimos N artigos do RSS do portal
 * @param {number} limit - Quantidade de artigos (padrão: 10)
 * @returns {Array} Lista de artigos formatados
 */
export async function fetchArticles(limit = 10) {
  try {
    const feed = await parser.parseURL(RSS_URL);

    return feed.items.slice(0, limit).map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || '',
      author: item['dc:creator'] || item.creator || 'Redação',
      summary: stripHtml(item.contentSnippet || item.summary || '').slice(0, 400),
      fullContent: stripHtml(item['content:encoded'] || item.content || '').slice(0, 2000),
      categories: item.categories || [],
    }));
  } catch (err) {
    console.error('[RSS] Erro ao buscar feed:', err.message);
    return [];
  }
}

/**
 * Formata artigos como contexto de texto para o LLM
 */
export function articlesToContext(articles) {
  return articles.map((a, i) =>
    `[Artigo ${i + 1}]
Título: ${a.title}
Data: ${a.pubDate}
URL: ${a.link}
Categorias: ${a.categories.join(', ')}
Resumo: ${a.summary}
---`
  ).join('\n\n');
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
