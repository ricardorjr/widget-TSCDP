/**
 * widget.js — Assistente CDP | tudosobrecdp.com.br
 *
 * INSTALAÇÃO NO WORDPRESS (via plugin WPCode):
 * 1. Instale o plugin "WPCode" no painel WordPress
 * 2. Vá em Code Snippets → Add Snippet → HTML Snippet
 * 3. Cole este script inteiro
 * 4. Defina Location: "Footer — Site Wide"
 * 5. Ative e salve
 *
 * CONFIGURAÇÃO:
 * Altere API_BASE_URL abaixo para a URL do seu deploy no Vercel.
 */

(function () {
  'use strict';

  // ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────
  const API_BASE_URL = 'https://widget-tscdp.vercel.app'; // URL do deploy no Vercel
  const PORTAL_NAME = 'Tudo Sobre CDP';
  const ACCENT_COLOR = '#2563eb';
  const DARK_COLOR = '#1e3a5f';

  // ─── ESTADO ────────────────────────────────────────────────────────────────
  let isOpen = false;
  let activeTab = 'briefing';
  let isPlaying = false;
  let audioEl = null;
  let audioBlob = null;
  let messages = [];
  let briefingData = null;
  let isLoadingBriefing = false;
  let isLoadingChat = false;

  // ─── INJEÇÃO DE ESTILOS ────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cdpw-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #cdpw-btn {
      position: fixed; bottom: 24px; right: 24px; width: 58px; height: 58px;
      background: linear-gradient(135deg, ${DARK_COLOR}, ${ACCENT_COLOR});
      border-radius: 50%; cursor: pointer; border: none; outline: none;
      box-shadow: 0 4px 20px rgba(37,99,235,.45); z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    #cdpw-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(37,99,235,.55); }
    #cdpw-btn svg { width: 24px; height: 24px; }
    #cdpw-badge {
      position: absolute; top: -2px; right: -2px; width: 17px; height: 17px;
      background: #ef4444; border-radius: 50%; border: 2px solid #fff;
      font-size: 9px; font-weight: 700; color: #fff;
      display: flex; align-items: center; justify-content: center;
    }
    #cdpw-panel {
      position: fixed; bottom: 94px; right: 24px; width: 360px; max-height: 570px;
      background: #fff; border-radius: 18px;
      box-shadow: 0 12px 60px rgba(0,0,0,.18);
      display: flex; flex-direction: column; z-index: 999998; overflow: hidden;
      transform: scale(.9) translateY(16px); opacity: 0; pointer-events: none;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s;
      transform-origin: bottom right;
    }
    #cdpw-panel.cdpw-open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    .cdpw-header {
      background: linear-gradient(135deg, ${DARK_COLOR}, ${ACCENT_COLOR});
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    .cdpw-avatar {
      width: 34px; height: 34px; background: rgba(255,255,255,.2);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
    }
    .cdpw-hname { font-size: 13px; font-weight: 700; color: #fff; }
    .cdpw-hsub { font-size: 11px; color: rgba(255,255,255,.75); display: flex; align-items: center; gap: 4px; }
    .cdpw-dot { width: 6px; height: 6px; background: #4ade80; border-radius: 50%; animation: cdpw-blink 2s infinite; }
    @keyframes cdpw-blink { 0%,100%{opacity:1} 50%{opacity:.4} }
    .cdpw-close {
      margin-left: auto; background: rgba(255,255,255,.15); border: none;
      border-radius: 7px; width: 28px; height: 28px; color: #fff; font-size: 15px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .cdpw-close:hover { background: rgba(255,255,255,.25); }
    .cdpw-tabs { display: flex; border-bottom: 1px solid #e5e7eb; background: #fafafa; flex-shrink: 0; }
    .cdpw-tab {
      flex: 1; padding: 9px 4px; font-size: 11px; font-weight: 600; color: #9ca3af;
      border: none; background: none; cursor: pointer;
      border-bottom: 2px solid transparent; transition: color .15s, border-color .15s;
    }
    .cdpw-tab.cdpw-active { color: ${ACCENT_COLOR}; border-bottom-color: ${ACCENT_COLOR}; background: #fff; }
    .cdpw-body { flex: 1; overflow: hidden; min-height: 0; }
    .cdpw-pane { display: none; height: 100%; flex-direction: column; overflow-y: auto; }
    .cdpw-pane.cdpw-active { display: flex; }
    .cdpw-pane::-webkit-scrollbar { width: 4px; }
    .cdpw-pane::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }

    /* Flash Briefing */
    .cdpw-fb-header { padding: 12px 14px 6px; display: flex; justify-content: space-between; align-items: center; }
    .cdpw-fb-title { font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .5px; }
    .cdpw-fb-date { font-size: 10px; color: #9ca3af; }
    .cdpw-audio {
      margin: 0 14px 10px; padding: 10px 12px;
      background: linear-gradient(135deg, #ede9fe, #dbeafe);
      border: 1px solid #c4b5fd; border-radius: 11px;
      display: flex; align-items: center; gap: 10px; cursor: pointer;
    }
    .cdpw-play-btn {
      width: 30px; height: 30px; background: linear-gradient(135deg, #7c3aed, ${ACCENT_COLOR});
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; box-shadow: 0 2px 8px rgba(124,58,237,.35); border: none; cursor: pointer;
    }
    .cdpw-play-btn svg { width: 13px; height: 13px; }
    .cdpw-audio-info { flex: 1; }
    .cdpw-audio-title { font-size: 11px; font-weight: 700; color: #5b21b6; }
    .cdpw-audio-sub { font-size: 10px; color: #7c3aed; opacity: .8; }
    .cdpw-waveform { display: flex; align-items: center; gap: 2px; height: 18px; }
    .cdpw-waveform span { width: 3px; border-radius: 2px; background: #7c3aed; opacity: .5; }
    .cdpw-waveform span:nth-child(1){height:5px} .cdpw-waveform span:nth-child(2){height:12px}
    .cdpw-waveform span:nth-child(3){height:8px} .cdpw-waveform span:nth-child(4){height:16px}
    .cdpw-waveform span:nth-child(5){height:7px} .cdpw-waveform span:nth-child(6){height:11px}
    .cdpw-waveform.cdpw-playing span { animation: cdpw-wave .8s ease-in-out infinite alternate; opacity: 1; }
    .cdpw-waveform.cdpw-playing span:nth-child(2){animation-delay:.1s}
    .cdpw-waveform.cdpw-playing span:nth-child(3){animation-delay:.2s}
    .cdpw-waveform.cdpw-playing span:nth-child(4){animation-delay:.05s}
    .cdpw-waveform.cdpw-playing span:nth-child(5){animation-delay:.15s}
    .cdpw-waveform.cdpw-playing span:nth-child(6){animation-delay:.25s}
    @keyframes cdpw-wave { from{transform:scaleY(.4)} to{transform:scaleY(1)} }
    .cdpw-articles { padding: 8px 14px 14px; display: flex; flex-direction: column; gap: 10px; }
    .cdpw-card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 12px 14px; cursor: pointer; text-decoration: none; display: block;
      transition: border-color .15s, box-shadow .15s, transform .15s;
    }
    .cdpw-card:hover { border-color: #93c5fd; box-shadow: 0 3px 14px rgba(37,99,235,.12); transform: translateY(-2px); }
    .cdpw-card-tag { font-size: 10px; font-weight: 700; color: ${ACCENT_COLOR}; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 5px; }
    .cdpw-card-title { font-size: 12.5px; font-weight: 700; color: #111827; line-height: 1.4; margin-bottom: 5px; }
    .cdpw-card-summary { font-size: 11.5px; color: #6b7280; line-height: 1.55; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .cdpw-card-meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: #9ca3af; padding-top: 6px; border-top: 1px solid #f3f4f6; }
    .cdpw-skeleton { background: linear-gradient(90deg, #f3f4f6 25%, #e9ecef 50%, #f3f4f6 75%); background-size: 200% 100%; animation: cdpw-shimmer 1.4s infinite; border-radius: 6px; }
    @keyframes cdpw-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* Chat */
    .cdpw-messages { flex: 1; overflow-y: auto; padding: 12px 12px 6px; display: flex; flex-direction: column; gap: 9px; min-height: 0; }
    .cdpw-messages::-webkit-scrollbar { width: 4px; }
    .cdpw-messages::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
    .cdpw-msg { display: flex; gap: 7px; align-items: flex-end; }
    .cdpw-msg.cdpw-user { flex-direction: row-reverse; }
    .cdpw-bubble { max-width: 80%; padding: 8px 11px; border-radius: 13px; font-size: 12.5px; line-height: 1.5; }
    .cdpw-msg.cdpw-bot .cdpw-bubble { background: #f3f4f6; color: #111827; border-bottom-left-radius: 3px; }
    .cdpw-msg.cdpw-user .cdpw-bubble { background: linear-gradient(135deg, ${DARK_COLOR}, ${ACCENT_COLOR}); color: #fff; border-bottom-right-radius: 3px; }
    .cdpw-bavatar { width: 24px; height: 24px; background: linear-gradient(135deg,${DARK_COLOR},${ACCENT_COLOR}); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
    .cdpw-typing { display: flex; gap: 4px; padding: 9px 12px; background: #f3f4f6; border-radius: 13px; border-bottom-left-radius: 3px; }
    .cdpw-typing span { width: 5px; height: 5px; background: #9ca3af; border-radius: 50%; animation: cdpw-bounce 1.2s ease-in-out infinite; }
    .cdpw-typing span:nth-child(2){animation-delay:.2s} .cdpw-typing span:nth-child(3){animation-delay:.4s}
    @keyframes cdpw-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
    .cdpw-chips { padding: 0 12px 8px; display: flex; flex-wrap: wrap; gap: 5px; flex-shrink: 0; }
    .cdpw-chip {
      font-size: 10.5px; font-weight: 600; padding: 4px 9px; border-radius: 20px;
      border: 1.5px solid #e0e7ff; color: #4338ca; background: #eef2ff;
      cursor: pointer; white-space: nowrap; transition: background .15s;
    }
    .cdpw-chip:hover { background: #e0e7ff; }
    .cdpw-chip:disabled { opacity: .4; pointer-events: none; }
    .cdpw-input-area {
      border-top: 1px solid #e5e7eb; padding: 9px 11px;
      display: flex; gap: 7px; align-items: center; flex-shrink: 0; background: #fafafa;
    }
    .cdpw-input {
      flex: 1; border: 1.5px solid #e5e7eb; border-radius: 18px;
      padding: 7px 13px; font-size: 12.5px; color: #111827; outline: none;
      transition: border-color .15s; background: #fff;
    }
    .cdpw-input:focus { border-color: #93c5fd; }
    .cdpw-input::placeholder { color: #9ca3af; }
    .cdpw-send {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, ${DARK_COLOR}, ${ACCENT_COLOR});
      border: none; border-radius: 50%; cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s;
    }
    .cdpw-send:hover { transform: scale(1.08); }
    .cdpw-send svg { width: 13px; height: 13px; }
    .cdpw-footer {
      padding: 6px 14px; text-align: center; font-size: 10px; color: #9ca3af;
      border-top: 1px solid #f3f4f6; background: #fafafa; flex-shrink: 0;
    }
    .cdpw-footer a { color: ${ACCENT_COLOR}; text-decoration: none; font-weight: 600; }
    @media (max-width: 420px) {
      #cdpw-panel { width: calc(100vw - 20px); right: 10px; bottom: 84px; }
      #cdpw-btn { right: 16px; bottom: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ─── HTML DO WIDGET ────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'cdpw-root';
  root.innerHTML = `
    <button id="cdpw-btn" aria-label="Abrir Assistente CDP">
      <div id="cdpw-badge">3</div>
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <circle cx="9" cy="11" r="1" fill="white" stroke="none"/>
        <circle cx="12" cy="11" r="1" fill="white" stroke="none"/>
        <circle cx="15" cy="11" r="1" fill="white" stroke="none"/>
      </svg>
    </button>

    <div id="cdpw-panel" role="dialog" aria-label="Assistente CDP">
      <div class="cdpw-header">
        <div class="cdpw-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
        </div>
        <div style="flex:1">
          <div class="cdpw-hname">Assistente CDP</div>
          <div class="cdpw-hsub"><span class="cdpw-dot"></span> Online · ${PORTAL_NAME}</div>
        </div>
        <button class="cdpw-close" id="cdpw-close-btn" aria-label="Fechar">✕</button>
      </div>

      <div class="cdpw-tabs">
        <button class="cdpw-tab cdpw-active" data-tab="briefing">⚡ Flash Briefing</button>
        <button class="cdpw-tab" data-tab="chat">💬 Chat CDP</button>
        <button class="cdpw-tab" data-tab="relacionados">🔗 Ver mais</button>
      </div>

      <div class="cdpw-body">

        <!-- ── BRIEFING ── -->
        <div class="cdpw-pane cdpw-active" id="cdpw-pane-briefing">
          <div class="cdpw-fb-header">
            <span class="cdpw-fb-title">📡 Esta semana em CDP</span>
            <span class="cdpw-fb-date" id="cdpw-week-label">Carregando...</span>
          </div>
          <div class="cdpw-audio" id="cdpw-audio-bar">
            <button class="cdpw-play-btn" id="cdpw-play-btn" aria-label="Play/Pause">
              <svg id="cdpw-icon-play" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              <svg id="cdpw-icon-pause" viewBox="0 0 24 24" fill="white" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            </button>
            <div class="cdpw-audio-info">
              <div class="cdpw-audio-title">🎧 Ouvir resumo da semana</div>
              <div class="cdpw-audio-sub" id="cdpw-audio-sub">~1 min · gerado por IA</div>
            </div>
            <div class="cdpw-waveform" id="cdpw-waveform">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
          <div class="cdpw-articles" id="cdpw-articles">
            <!-- Skeletons enquanto carrega -->
            <div style="height:70px;border-radius:9px" class="cdpw-skeleton"></div>
            <div style="height:70px;border-radius:9px" class="cdpw-skeleton"></div>
            <div style="height:70px;border-radius:9px" class="cdpw-skeleton"></div>
          </div>
        </div>

        <!-- ── CHAT ── -->
        <div class="cdpw-pane" id="cdpw-pane-chat" style="height:430px">
          <div class="cdpw-messages" id="cdpw-messages">
            <div class="cdpw-msg cdpw-bot">
              <div class="cdpw-bavatar">🤖</div>
              <div class="cdpw-bubble">
                Olá! Sou o assistente do <strong>Tudo Sobre CDP</strong> 👋<br><br>Posso explicar os artigos do portal, resumir conteúdos, indicar leituras relacionadas ou tirar dúvidas sobre CDP. O que você quer explorar?
              </div>
            </div>
          </div>
          <div class="cdpw-chips" id="cdpw-chips">
            <button class="cdpw-chip" data-q="Quais os artigos mais recentes do portal?">📰 Últimas notícias</button>
            <button class="cdpw-chip" data-q="Me explica o artigo que estou lendo">📄 Explicar artigo</button>
            <button class="cdpw-chip" data-q="O que é CDP? Explique de forma simples">O que é CDP?</button>
            <button class="cdpw-chip" data-q="Quais temas o portal aborda?">🗂️ Temas do portal</button>
          </div>
          <div class="cdpw-input-area">
            <input class="cdpw-input" id="cdpw-input" type="text" placeholder="Pergunte sobre CDP..." maxlength="400">
            <button class="cdpw-send" id="cdpw-send" aria-label="Enviar">
              <svg viewBox="0 0 24 24" fill="white"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
            </button>
          </div>
        </div>

        <!-- ── RELACIONADOS ── -->
        <div class="cdpw-pane" id="cdpw-pane-relacionados">
          <div class="cdpw-fb-header">
            <span class="cdpw-fb-title">🔗 Conteúdos relacionados</span>
          </div>
          <div class="cdpw-articles" id="cdpw-related-articles">
            <div style="height:70px;border-radius:9px" class="cdpw-skeleton"></div>
            <div style="height:70px;border-radius:9px" class="cdpw-skeleton"></div>
            <div style="height:70px;border-radius:9px" class="cdpw-skeleton"></div>
          </div>
        </div>
      </div>

      <div class="cdpw-footer">
        Assistente movido por IA · <a href="https://www.tudosobrecdp.com.br" target="_blank">${PORTAL_NAME}</a>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ─── REFERÊNCIAS DOM ───────────────────────────────────────────────────────
  const btn       = document.getElementById('cdpw-btn');
  const panel     = document.getElementById('cdpw-panel');
  const closeBtn  = document.getElementById('cdpw-close-btn');
  const tabs      = document.querySelectorAll('.cdpw-tab');
  const playBtn   = document.getElementById('cdpw-play-btn');
  const waveform  = document.getElementById('cdpw-waveform');
  const iconPlay  = document.getElementById('cdpw-icon-play');
  const iconPause = document.getElementById('cdpw-icon-pause');
  const audioSub  = document.getElementById('cdpw-audio-sub');
  const chatInput = document.getElementById('cdpw-input');
  const sendBtn   = document.getElementById('cdpw-send');
  const msgArea   = document.getElementById('cdpw-messages');
  const chips     = document.querySelectorAll('.cdpw-chip');

  // ─── TOGGLE PANEL ─────────────────────────────────────────────────────────
  function toggle() {
    isOpen = !isOpen;
    panel.classList.toggle('cdpw-open', isOpen);
    if (isOpen && !briefingData && !isLoadingBriefing) loadBriefing();
  }
  btn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', toggle);

  // ─── TABS ─────────────────────────────────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('cdpw-active', t === tab));
      document.querySelectorAll('.cdpw-pane').forEach(p => p.classList.remove('cdpw-active'));
      document.getElementById('cdpw-pane-' + name).classList.add('cdpw-active');
      activeTab = name;
    });
  });

  // ─── BRIEFING ─────────────────────────────────────────────────────────────
  // 1. Busca artigos direto do WordPress (mesmo domínio, sem bloqueio)
  // 2. Envia para o Vercel apenas para processamento com IA
  async function loadBriefing() {
    isLoadingBriefing = true;
    try {
      // Passo 1: busca artigos via WP REST API (cliente → WordPress, sem CORS)
      const wpRes = await fetch('/wp-json/wp/v2/posts?per_page=5&_embed=true', {
        headers: { 'Accept': 'application/json' }
      });

      if (!wpRes.ok) throw new Error('WP API falhou: ' + wpRes.status);
      const posts = await wpRes.json();

      const articles = posts.map(p => ({
        title: decodeEntities(p.title?.rendered || ''),
        link: p.link || '',
        date: p.date || '',
        summary: stripTags(p.excerpt?.rendered || '').slice(0, 300),
        categories: p._embedded?.['wp:term']?.[0]?.map(t => t.name) || [],
      }));

      // Passo 2: envia artigos para o Vercel gerar o resumo com IA
      const briefingRes = await fetch(`${API_BASE_URL}/api/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles })
      });

      const aiData = await briefingRes.json();

      briefingData = { articles, aiSummary: aiData.aiSummary, weekLabel: aiData.weekLabel };

      const weekEl = document.getElementById('cdpw-week-label');
      if (weekEl) weekEl.textContent = briefingData.weekLabel || '';

      renderArticles(articles, 'cdpw-articles');
      renderArticles(articles, 'cdpw-related-articles');

      const badge = document.getElementById('cdpw-badge');
      if (badge) badge.style.display = 'none';

    } catch (err) {
      console.error('[CDP Widget] Erro:', err);
      document.getElementById('cdpw-articles').innerHTML =
        '<div style="padding:16px;font-size:12px;color:#6b7280;text-align:center">Não foi possível carregar os artigos.<br>Visite o portal diretamente.</div>';
    } finally {
      isLoadingBriefing = false;
    }
  }

  function stripTags(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function decodeEntities(str) {
    return str.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#8230;/g,'...').replace(/&#8216;|&#8217;/g,"'").replace(/&#8220;|&#8221;/g,'"');
  }

  function renderArticles(articles, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const TAGS = ['🔥 Destaque', '📊 Análise', '🤖 IA + CDP', '📘 Guia', '🎙️ Entrevista'];
    container.innerHTML = articles.map((a, i) => `
      <a class="cdpw-card" href="${a.link}" target="_blank" rel="noopener">
        <div class="cdpw-card-tag">${TAGS[i % TAGS.length]}</div>
        <div class="cdpw-card-title">${a.title}</div>
        <div class="cdpw-card-summary">${a.summary}</div>
        <div class="cdpw-card-meta">
          <span>${formatDate(a.date)}</span>
          <span style="color:#93c5fd">Ler →</span>
        </div>
      </a>
    `).join('');
  }

  function formatDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return ''; }
  }

  // ─── ÁUDIO (Web Speech API — 100% gratuito, nativo do browser) ───────────
  playBtn.addEventListener('click', () => {
    if (!briefingData?.aiSummary) return;

    // Pausa se já está tocando
    if (isPlaying) {
      speechSynthesis.cancel();
      isPlaying = false;
      waveform.classList.remove('cdpw-playing');
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
      audioSub.textContent = '~1 min · gerado por IA';
      return;
    }

    // Verifica suporte
    if (!('speechSynthesis' in window)) {
      audioSub.textContent = 'Áudio não suportado neste browser';
      return;
    }

    const utterance = new SpeechSynthesisUtterance(briefingData.aiSummary);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    // Seleciona voz em português se disponível
    const voices = speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onstart = () => {
      isPlaying = true;
      waveform.classList.add('cdpw-playing');
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
      audioSub.textContent = 'Reproduzindo...';
    };

    utterance.onend = () => {
      isPlaying = false;
      waveform.classList.remove('cdpw-playing');
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
      audioSub.textContent = '~1 min · gerado por IA';
    };

    utterance.onerror = () => {
      isPlaying = false;
      waveform.classList.remove('cdpw-playing');
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
      audioSub.textContent = 'Erro ao reproduzir áudio';
    };

    speechSynthesis.speak(utterance);
  });

  // ─── CHAT ─────────────────────────────────────────────────────────────────
  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `cdpw-msg cdpw-${role}`;

    if (role === 'bot') {
      div.innerHTML = `
        <div class="cdpw-bavatar">🤖</div>
        <div class="cdpw-bubble">${text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/📄 \[(.*?)\]\((.*?)\)/g,'<a href="$2" target="_blank" style="color:${ACCENT_COLOR};font-weight:600">📄 $1</a>').replace(/\n/g,'<br>')}</div>
      `;
    } else {
      div.innerHTML = `<div class="cdpw-bubble">${text}</div>`;
    }

    // Insere antes do typing indicator se existir
    const typingEl = document.getElementById('cdpw-typing');
    if (typingEl) msgArea.insertBefore(div, typingEl);
    else msgArea.appendChild(div);

    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.id = 'cdpw-typing';
    div.className = 'cdpw-msg cdpw-bot';
    div.innerHTML = '<div class="cdpw-bavatar">🤖</div><div class="cdpw-typing"><span></span><span></span><span></span></div>';
    msgArea.appendChild(div);
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('cdpw-typing');
    if (el) el.remove();
  }

  async function sendMessage(text) {
    if (!text.trim() || isLoadingChat) return;

    // Muda para aba de chat
    tabs.forEach(t => t.classList.toggle('cdpw-active', t.dataset.tab === 'chat'));
    document.querySelectorAll('.cdpw-pane').forEach(p => p.classList.remove('cdpw-active'));
    document.getElementById('cdpw-pane-chat').classList.add('cdpw-active');

    addMessage(text, 'user');
    chatInput.value = '';
    isLoadingChat = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          articles: briefingData?.articles || [],
          pageTitle: document.title || '',
          pageUrl: window.location.href || '',
        })
      });

      const data = await res.json();
      hideTyping();
      addMessage(data.reply || 'Não consegui processar sua pergunta. Tente novamente!', 'bot');

    } catch (err) {
      hideTyping();
      addMessage('Estou com uma instabilidade momentânea. Tente novamente em instantes! 🔄', 'bot');
    } finally {
      isLoadingChat = false;
      sendBtn.disabled = false;
    }
  }

  // Events: chips
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.disabled = true;
      chip.style.opacity = '.4';
      sendMessage(chip.dataset.q);
    });
  });

  // Events: input + send
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(chatInput.value); });
  sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

})();
