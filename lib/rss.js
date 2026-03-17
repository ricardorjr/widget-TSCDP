// lib/rss.js — Busca artigos via WordPress REST API (mais confiável que RSS)
const BASE_URL = process.env.PORTAL_BASE_URL || 'https://www.tudosobrecdp.com.br';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; TudoSobreCDP-Bot/1.0)',
  'Accept': 'application/json',
};

/**
 * Busca os últimos N artigos via WP REST API
 */
export async function fetchArticles(limit = 10) {
  try {
    const url = `${BASE_URL}/wp-json/wp/v2/posts?per_page=${limit}&_embed=true&status=publish`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const posts = await res.json();

    return posts.map(post => ({
      title: decodeHtml(post.title?.rendered || ''),
      link: post.link || '',
      pubDate: post.date || '',
      author: post._embedded?.['author']?.[0]?.name || 'Redação',
      summary: stripHtml(post.excerpt?.rendered || '').slice(0, 400),
      fullContent: stripHtml(post.content?.rendered || '').slice(0, 2000),
      categories: post._embedded?.['wp:term']?.[0]?.map(t => t.name) || [],
    }));

  } catch (err) {
    console.error('[RSS] Erro WP API:', err.message);
    // Fallback: tenta o RSS tradicional
    return fetchFromRSS(limit);
  }
}

/**
 * Fallback via RSS caso a REST API falhe
 */
async function fetchFromRSS(limit = 10) {
  try {
    const { default: Parser } = await import('rss-parser');
    const parser = new Parser({
      customFields: { item: ['content:encoded', 'dc:creator'] },
      headers: HEADERS,
      timeout: 10000,
    });

    const RSS_URL = process.env.PORTAL_RSS_URL || `${BASE_URL}/feed`;
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
    console.error('[RSS] Fallback também falhou:', err.message);
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
    .replace(/&#8230;/g, '...')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .trim();
}
