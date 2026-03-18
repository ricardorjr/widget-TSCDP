/**
 * widget.js — Radar CDP | tudosobrecdp.com.br · by aunica
 *
 * INSTALAÇÃO NO WORDPRESS (via plugin WPCode):
 * 1. Instale o plugin "WPCode" no painel WordPress
 * 2. Vá em Code Snippets → Add Snippet → HTML Snippet
 * 3. Cole este script inteiro
 * 4. Defina Location: "Footer — Site Wide"
 * 5. Ative e salve
 */

(function () {
  'use strict';

  // Para qualquer áudio em andamento se a página recarregar
  if ('speechSynthesis' in window) speechSynthesis.cancel();

  // ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────
  const API_BASE_URL  = 'https://widget-tscdp.vercel.app';
  const WIDGET_NAME   = 'Radar CDP';
  const WIDGET_SUB    = 'by aunica · Tudo Sobre CDP';
  const ACCENT_COLOR  = '#2563eb';
  const DARK_COLOR    = '#1e3a5f';

  // ─── DETECÇÃO DE PÁGINA ────────────────────────────────────────────────────
  // single-post  = artigo individual  → "Este artigo"
  // home/archive = home, categoria    → "Flash Briefing"
  const isSinglePost = document.body.classList.contains('single-post') ||
                       document.body.classList.contains('single') ||
                       document.body.classList.contains('postid') ||
                       /^\/[^/]+\/[^/]+\/[^/]+\/$/.test(window.location.pathname); // /cat/subcat/slug/

  // ─── ESTADO ────────────────────────────────────────────────────────────────
  let isOpen            = false;
  let isPlaying         = false;
  let briefingData      = null;
  let relatedData       = null;
  let isLoadingBriefing = false;
  let isLoadingChat     = false;
  let isLoadingArticle  = false;
  let currentArticleIdx = 0;

  // ─── ESTILOS ───────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* Reset blindado contra o tema WordPress */
    #cdpw-root, #cdpw-root * {
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: normal !important;
      text-transform: none !important;
      letter-spacing: normal !important;
      word-spacing: normal !important;
      text-shadow: none !important;
      -webkit-font-smoothing: antialiased !important;
    }
    #cdpw-root { display: block !important; position: relative !important; }

    /* Botão flutuante */
    #cdpw-btn {
      position: fixed !important; bottom: 24px !important; right: 24px !important;
      width: 56px !important; height: 56px !important;
      background: linear-gradient(135deg, ${DARK_COLOR}, ${ACCENT_COLOR}) !important;
      border-radius: 50% !important; cursor: pointer !important; border: none !important;
      outline: none !important; box-shadow: 0 4px 20px rgba(37,99,235,.4) !important;
      z-index: 999999 !important; display: flex !important;
      align-items: center !important; justify-content: center !important;
      transition: transform .2s, box-shadow .2s !important;
      padding: 0 !important; margin: 0 !important; opacity: 1 !important;
      visibility: visible !important;
    }
    #cdpw-btn:hover { transform: scale(1.08) !important; }
    #cdpw-btn svg { width: 22px !important; height: 22px !important; display: block !important; }
    #cdpw-badge {
      position: absolute !important; top: -2px !important; right: -2px !important;
      width: 16px !important; height: 16px !important;
      background: #ef4444 !important; border-radius: 50% !important;
      border: 2px solid #fff !important; font-size: 8px !important;
      font-weight: 700 !important; color: #fff !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
    }

    /* Painel principal */
    #cdpw-panel {
      position: fixed !important; bottom: 90px !important; right: 24px !important;
      width: 360px !important; max-height: 580px !important;
      background: #ffffff !important; border-radius: 18px !important;
      box-shadow: 0 12px 60px rgba(0,0,0,.18) !important;
      display: flex !important; flex-direction: column !important;
      z-index: 999998 !important; overflow: hidden !important;
      transform: scale(.92) translateY(14px) !important; opacity: 0 !important;
      pointer-events: none !important;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s !important;
      transform-origin: bottom right !important;
      margin: 0 !important; padding: 0 !important;
    }
    #cdpw-panel.cdpw-open {
      transform: scale(1) translateY(0) !important;
      opacity: 1 !important;
      pointer-events: all !important;
    }

    /* Header */
    .cdpw-header {
      background: linear-gradient(135deg, ${DARK_COLOR}, ${ACCENT_COLOR}) !important;
      padding: 13px 16px !important; display: flex !important;
      align-items: center !important; gap: 10px !important; flex-shrink: 0 !important;
    }
    .cdpw-avatar {
      width: 36px !important; height: 36px !important;
      background: rgba(255,255,255,.18) !important; border-radius: 50% !important;
      display: flex !important; align-items: center !important;
      justify-content: center !important; flex-shrink: 0 !important;
    }
    .cdpw-hname { font-size: 14px !important; font-weight: 800 !important; color: #fff !important; }
    .cdpw-hsub {
      font-size: 10.5px !important; color: rgba(255,255,255,.75) !important;
      display: flex !important; align-items: center !important; gap: 5px !important; margin-top: 2px !important;
    }
    .cdpw-dot {
      width: 6px !important; height: 6px !important; background: #4ade80 !important;
      border-radius: 50% !important; animation: cdpw-blink 2s infinite !important; flex-shrink: 0 !important;
    }
    @keyframes cdpw-blink { 0%,100%{opacity:1} 50%{opacity:.35} }
    .cdpw-close {
      margin-left: auto !important; background: rgba(255,255,255,.15) !important;
      border: none !important; border-radius: 7px !important;
      width: 28px !important; height: 28px !important;
      color: #fff !important; font-size: 14px !important; cursor: pointer !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
    }
    .cdpw-close:hover { background: rgba(255,255,255,.28) !important; }

    /* Tabs */
    .cdpw-tabs {
      display: flex !important; border-bottom: 2px solid #f1f5f9 !important;
      background: #ffffff !important; flex-shrink: 0 !important;
    }
    .cdpw-tab {
      flex: 1 !important; padding: 11px 6px !important; font-size: 12px !important;
      font-weight: 600 !important; color: #9ca3af !important;
      border: none !important; background: none !important; cursor: pointer !important;
      border-bottom: 2px solid transparent !important; margin-bottom: -2px !important;
      transition: color .15s, border-color .15s !important;
    }
    .cdpw-tab.cdpw-active { color: ${ACCENT_COLOR} !important; border-bottom-color: ${ACCENT_COLOR} !important; }

    /* Panes */
    .cdpw-body { flex: 1 !important; overflow: hidden !important; min-height: 0 !important; }
    .cdpw-pane { display: none !important; height: 100% !important; flex-direction: column !important; overflow-y: auto !important; overflow-x: hidden !important; }
    .cdpw-pane.cdpw-active { display: flex !important; }
    .cdpw-pane::-webkit-scrollbar { width: 4px !important; }
    .cdpw-pane::-webkit-scrollbar-thumb { background: #e2e8f0 !important; border-radius: 4px !important; }

    /* Flash Briefing */
    .cdpw-fb-header {
      padding: 14px 16px 8px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .cdpw-fb-title { font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .6px; }
    .cdpw-fb-date  { font-size: 10px; color: #9ca3af; }

    /* Player de áudio */
    .cdpw-audio {
      margin: 0 14px 14px; padding: 11px 13px;
      background: linear-gradient(135deg, #eef2ff, #ede9fe);
      border: 1px solid #c7d2fe; border-radius: 12px;
      display: flex; align-items: center; gap: 10px;
    }
    .cdpw-play-btn {
      width: 32px; height: 32px; min-width: 32px;
      background: linear-gradient(135deg, #4f46e5, ${ACCENT_COLOR});
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(79,70,229,.3); border: none; cursor: pointer;
    }
    .cdpw-play-btn svg { width: 13px; height: 13px; }
    .cdpw-audio-info { flex: 1; min-width: 0; }
    .cdpw-audio-title { font-size: 11px; font-weight: 700; color: #3730a3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cdpw-audio-sub   { font-size: 10px; color: #6366f1; margin-top: 1px; }

    /* Navegação de artigos no briefing */
    .cdpw-nav { display: flex; gap: 4px; flex-shrink: 0; }
    .cdpw-nav-btn {
      width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid #c7d2fe;
      background: rgba(255,255,255,.7); color: #4f46e5; font-size: 11px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .cdpw-nav-btn:hover { background: #e0e7ff; }
    .cdpw-nav-btn:disabled { opacity: .35; pointer-events: none; }

    /* Cards de artigo */
    .cdpw-articles { padding: 4px 12px 14px; display: flex; flex-direction: column; gap: 8px; }
    .cdpw-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 11px 13px 11px 14px; cursor: pointer; text-decoration: none; display: block;
      transition: border-color .2s, box-shadow .2s, transform .18s;
      border-left: 4px solid ${ACCENT_COLOR};
    }
    .cdpw-card:hover { border-color: #bfdbfe; box-shadow: 0 4px 18px rgba(37,99,235,.1); transform: translateY(-2px); }
    .cdpw-card[data-cat="destaque"]   { border-left-color: #f97316; }
    .cdpw-card[data-cat="analise"]    { border-left-color: ${ACCENT_COLOR}; }
    .cdpw-card[data-cat="ia"]         { border-left-color: #7c3aed; }
    .cdpw-card[data-cat="guia"]       { border-left-color: #0d9488; }
    .cdpw-card[data-cat="entrevista"] { border-left-color: #db2777; }
    .cdpw-card-tag {
      display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: .6px;
      text-transform: uppercase; padding: 2px 7px; border-radius: 20px; margin-bottom: 6px;
      background: #eff6ff; color: ${ACCENT_COLOR};
    }
    .cdpw-card[data-cat="destaque"]   .cdpw-card-tag { background: #fff7ed; color: #c2410c; }
    .cdpw-card[data-cat="ia"]         .cdpw-card-tag { background: #f5f3ff; color: #6d28d9; }
    .cdpw-card[data-cat="guia"]       .cdpw-card-tag { background: #f0fdfa; color: #0f766e; }
    .cdpw-card[data-cat="entrevista"] .cdpw-card-tag { background: #fdf2f8; color: #be185d; }
    .cdpw-card-title   { font-size: 12.5px !important; font-weight: 700 !important; color: #0f172a !important; line-height: 1.4 !important; margin-bottom: 5px !important; }
    .cdpw-card-summary { font-size: 11.5px !important; color: #64748b !important; line-height: 1.5 !important; overflow: hidden !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; }
    .cdpw-card-meta {
      display: flex !important; justify-content: space-between !important; align-items: center !important;
      margin-top: 8px !important; padding-top: 7px !important; border-top: 1px solid #f1f5f9 !important;
      font-size: 10px !important; color: #94a3b8 !important;
    }
    .cdpw-card-read {
      font-size: 10.5px !important; font-weight: 700 !important; color: ${ACCENT_COLOR} !important;
      background: #eff6ff !important; padding: 2px 9px !important; border-radius: 20px !important;
      text-decoration: none !important;
    }
    .cdpw-skeleton {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%; animation: cdpw-shimmer 1.4s infinite; border-radius: 10px;
    }
    @keyframes cdpw-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* Chat */
    .cdpw-messages { flex: 1; overflow-y: auto; padding: 14px 13px 8px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
    .cdpw-messages::-webkit-scrollbar { width: 4px; }
    .cdpw-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
    .cdpw-msg { display: flex; gap: 7px; align-items: flex-end; }
    .cdpw-msg.cdpw-user { flex-direction: row-reverse; }
    .cdpw-bubble {
      max-width: 82% !important; padding: 9px 13px !important; border-radius: 14px !important;
      font-size: 13px !important; line-height: 1.55 !important;
    }
    .cdpw-msg.cdpw-bot  .cdpw-bubble { background: #f1f5f9 !important; color: #0f172a !important; border-bottom-left-radius: 3px !important; }
    .cdpw-msg.cdpw-user .cdpw-bubble { background: linear-gradient(135deg, ${DARK_COLOR}, ${ACCENT_COLOR}) !important; color: #fff !important; border-bottom-right-radius: 3px !important; }
    .cdpw-bavatar {
      width: 26px; height: 26px; min-width: 26px;
      background: linear-gradient(135deg, ${DARK_COLOR}, ${ACCENT_COLOR});
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 12px;
    }
    .cdpw-typing { display: flex; gap: 4px; padding: 10px 13px; background: #f1f5f9; border-radius: 14px; border-bottom-left-radius: 3px; }
    .cdpw-typing span { width: 5px; height: 5px; background: #94a3b8; border-radius: 50%; animation: cdpw-bounce 1.2s ease-in-out infinite; }
    .cdpw-typing span:nth-child(2){animation-delay:.2s} .cdpw-typing span:nth-child(3){animation-delay:.4s}
    @keyframes cdpw-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }

    .cdpw-chips { padding: 0 13px 9px; display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0; }
    .cdpw-chip {
      font-size: 11px; font-weight: 600; padding: 5px 11px; border-radius: 20px;
      border: 1.5px solid #e0e7ff; color: #4338ca; background: #eef2ff;
      cursor: pointer; white-space: nowrap; transition: background .15s;
    }
    .cdpw-chip:hover { background: #e0e7ff; }
    .cdpw-chip:disabled { opacity: .4; pointer-events: none; }

    .cdpw-input-area {
      border-top: 1px solid #f1f5f9; padding: 10px 12px;
      display: flex; gap: 8px; align-items: center; flex-shrink: 0; background: #fafafa;
    }
    .cdpw-input {
      flex: 1; border: 1.5px solid #e2e8f0; border-radius: 20px;
      padding: 8px 14px; font-size: 13px; color: #0f172a; outline: none;
      transition: border-color .15s; background: #fff;
    }
    .cdpw-input:focus { border-color: #93c5fd; }
    .cdpw-input::placeholder { color: #94a3b8; }
    .cdpw-send {
      width: 34px; height: 34px; min-width: 34px;
      background: linear-gradient(135deg, ${DARK_COLOR}, ${ACCENT_COLOR});
      border: none; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s;
    }
    .cdpw-send:hover { transform: scale(1.08); }
    .cdpw-send svg { width: 14px; height: 14px; }

    /* Footer */
    .cdpw-footer {
      padding: 7px 14px; text-align: center; font-size: 10px; color: #94a3b8;
      border-top: 1px solid #f1f5f9; background: #fafafa; flex-shrink: 0;
    }
    .cdpw-footer a { color: ${ACCENT_COLOR}; text-decoration: none; font-weight: 700; }

    /* Relacionados — header */
    .cdpw-rel-header { padding: 14px 16px 10px; }
    .cdpw-rel-title { font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .6px; }
    .cdpw-rel-sub { font-size: 11px; color: #64748b; margin-top: 3px; }

    /* Artigo atual */
    .cdpw-art-title { font-size: 13px !important; font-weight: 700 !important; color: #0f172a !important; line-height: 1.4 !important; }
    .cdpw-art-body { padding: 0 14px 14px !important; }
    .cdpw-art-summary {
      font-size: 12px !important; color: #374151 !important; line-height: 1.6 !important;
      background: #f8fafc !important; border-radius: 10px !important; padding: 12px 14px !important;
      border-left: 3px solid ${ACCENT_COLOR} !important; margin-bottom: 12px !important;
    }
    .cdpw-art-ask { padding-top: 2px !important; }
    .cdpw-art-chips { display: flex !important; flex-wrap: wrap !important; gap: 7px !important; }

    /* Waveform */
    .cdpw-waveform { display: flex; align-items: center; gap: 2px; height: 18px; flex-shrink: 0; }
    .cdpw-waveform span { width: 3px; border-radius: 2px; background: #6366f1; opacity: .45; }
    .cdpw-waveform span:nth-child(1){height:4px} .cdpw-waveform span:nth-child(2){height:11px}
    .cdpw-waveform span:nth-child(3){height:7px}  .cdpw-waveform span:nth-child(4){height:15px}
    .cdpw-waveform span:nth-child(5){height:6px}  .cdpw-waveform span:nth-child(6){height:10px}
    .cdpw-waveform.cdpw-playing span { animation: cdpw-wave .8s ease-in-out infinite alternate; opacity: 1; }
    .cdpw-waveform.cdpw-playing span:nth-child(2){animation-delay:.1s}
    .cdpw-waveform.cdpw-playing span:nth-child(3){animation-delay:.2s}
    .cdpw-waveform.cdpw-playing span:nth-child(4){animation-delay:.05s}
    .cdpw-waveform.cdpw-playing span:nth-child(5){animation-delay:.15s}
    .cdpw-waveform.cdpw-playing span:nth-child(6){animation-delay:.25s}
    @keyframes cdpw-wave { from{transform:scaleY(.35)} to{transform:scaleY(1)} }

    @media (max-width: 420px) {
      #cdpw-panel { width: calc(100vw - 20px); right: 10px; bottom: 82px; }
      #cdpw-btn   { right: 16px; bottom: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ─── HTML DO WIDGET ────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'cdpw-root';
  root.innerHTML = `
    <button id="cdpw-btn" aria-label="Abrir ${WIDGET_NAME}">
      <div id="cdpw-badge">3</div>
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <circle cx="9" cy="11" r="1" fill="white" stroke="none"/>
        <circle cx="12" cy="11" r="1" fill="white" stroke="none"/>
        <circle cx="15" cy="11" r="1" fill="white" stroke="none"/>
      </svg>
    </button>

    <div id="cdpw-panel" role="dialog" aria-label="${WIDGET_NAME}">
      <div class="cdpw-header">
        <div class="cdpw-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
        </div>
        <div style="flex:1;min-width:0">
          <div class="cdpw-hname">${WIDGET_NAME}</div>
          <div class="cdpw-hsub"><span class="cdpw-dot"></span>${WIDGET_SUB}</div>
        </div>
        <button class="cdpw-close" id="cdpw-close-btn" aria-label="Fechar">✕</button>
      </div>

      <div class="cdpw-tabs">
        <button class="cdpw-tab cdpw-active" data-tab="briefing" id="cdpw-tab-briefing">Esta semana</button>
        <button class="cdpw-tab" data-tab="chat">Perguntar</button>
        <button class="cdpw-tab" data-tab="relacionados">Ver mais</button>
      </div>

      <div class="cdpw-body">

        <!-- ARTIGO ATUAL (visível só em single-post) -->
        <div class="cdpw-pane" id="cdpw-pane-artigo" style="display:none;flex-direction:column">
          <div class="cdpw-fb-header">
            <span class="cdpw-fb-title">Voce esta lendo</span>
          </div>

          <!-- Player de áudio igual ao Flash Briefing -->
          <div class="cdpw-audio" id="cdpw-art-audio-bar">
            <button class="cdpw-play-btn" id="cdpw-art-play-btn" aria-label="Ouvir resumo">
              <svg id="cdpw-art-icon-play" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              <svg id="cdpw-art-icon-pause" viewBox="0 0 24 24" fill="white" style="display:none">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <div class="cdpw-audio-info">
              <div class="cdpw-audio-title" id="cdpw-art-audio-title">Ouvir resumo deste artigo</div>
              <div class="cdpw-audio-sub" id="cdpw-art-audio-sub">resumo gerado por IA</div>
            </div>
            <div class="cdpw-waveform" id="cdpw-art-waveform">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>

          <!-- Título + resumo curto -->
          <div class="cdpw-art-body" id="cdpw-art-body">
            <div class="cdpw-art-title" id="cdpw-art-title" style="margin-bottom:10px">Carregando...</div>
            <div class="cdpw-art-summary" id="cdpw-art-summary">
              <div style="height:12px;border-radius:6px;margin-bottom:8px" class="cdpw-skeleton"></div>
              <div style="height:12px;border-radius:6px;margin-bottom:8px;width:88%" class="cdpw-skeleton"></div>
              <div style="height:12px;border-radius:6px;width:70%" class="cdpw-skeleton"></div>
            </div>
            <div class="cdpw-art-ask" id="cdpw-art-ask" style="display:none">
              <div class="cdpw-art-chips" id="cdpw-art-chips"></div>
            </div>
          </div>
        </div>

        <!-- BRIEFING -->
        <div class="cdpw-pane cdpw-active" id="cdpw-pane-briefing">
          <div class="cdpw-fb-header">
            <span class="cdpw-fb-title">Esta semana em CDP</span>
            <span class="cdpw-fb-date" id="cdpw-week-label">Carregando...</span>
          </div>

          <div class="cdpw-audio" id="cdpw-audio-bar">
            <button class="cdpw-play-btn" id="cdpw-play-btn" aria-label="Play/Pause">
              <svg id="cdpw-icon-play" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              <svg id="cdpw-icon-pause" viewBox="0 0 24 24" fill="white" style="display:none">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <div class="cdpw-audio-info">
              <div class="cdpw-audio-title" id="cdpw-audio-title">Ouvir resumo da semana</div>
              <div class="cdpw-audio-sub" id="cdpw-audio-sub">resumo gerado por IA</div>
            </div>
            <div class="cdpw-waveform" id="cdpw-waveform">
              <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="cdpw-nav">
              <button class="cdpw-nav-btn" id="cdpw-prev-btn" title="Artigo anterior" disabled>&#8249;</button>
              <button class="cdpw-nav-btn" id="cdpw-next-btn" title="Proximo artigo" disabled>&#8250;</button>
            </div>
          </div>

          <div class="cdpw-articles" id="cdpw-articles">
            <div style="height:78px;border-radius:10px" class="cdpw-skeleton"></div>
            <div style="height:78px;border-radius:10px" class="cdpw-skeleton"></div>
            <div style="height:78px;border-radius:10px" class="cdpw-skeleton"></div>
          </div>
        </div>

        <!-- CHAT -->
        <div class="cdpw-pane" id="cdpw-pane-chat" style="height:440px">
          <div class="cdpw-messages" id="cdpw-messages">
            <div class="cdpw-msg cdpw-bot">
              <div class="cdpw-bavatar">A</div>
              <div class="cdpw-bubble">
                Olá! Sou o <strong>${WIDGET_NAME}</strong>, assistente do portal Tudo Sobre CDP.<br><br>
                Posso explicar artigos, indicar leituras e responder suas dúvidas sobre o conteúdo do portal.
              </div>
            </div>
          </div>
          <div class="cdpw-chips" id="cdpw-chips">
            <button class="cdpw-chip" data-q="Quais os artigos mais recentes do portal?">Ultimas publicacoes</button>
            <button class="cdpw-chip" data-q="Me explica o artigo que estou lendo agora">Explicar este artigo</button>
            <button class="cdpw-chip" data-q="Quais os temas mais abordados neste portal?">Temas do portal</button>
          </div>
          <div class="cdpw-input-area">
            <input class="cdpw-input" id="cdpw-input" type="text" placeholder="Pergunte sobre o portal..." maxlength="400">
            <button class="cdpw-send" id="cdpw-send" aria-label="Enviar">
              <svg viewBox="0 0 24 24" fill="white"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
            </button>
          </div>
        </div>

        <!-- RELACIONADOS -->
        <div class="cdpw-pane" id="cdpw-pane-relacionados">
          <div class="cdpw-rel-header">
            <div class="cdpw-rel-title">Mais para voce ler</div>
            <div class="cdpw-rel-sub">Outras publicacoes do portal</div>
          </div>
          <div class="cdpw-articles" id="cdpw-related-articles">
            <div style="height:78px;border-radius:10px" class="cdpw-skeleton"></div>
            <div style="height:78px;border-radius:10px" class="cdpw-skeleton"></div>
            <div style="height:78px;border-radius:10px" class="cdpw-skeleton"></div>
          </div>
        </div>

      </div>

      <div class="cdpw-footer">
        Inteligencia artificial por <a href="https://www.aunica.com" target="_blank">aunica</a>
        &nbsp;·&nbsp;
        <a href="https://www.tudosobrecdp.com.br" target="_blank">Tudo Sobre CDP</a>
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
  const prevBtn   = document.getElementById('cdpw-prev-btn');
  const nextBtn   = document.getElementById('cdpw-next-btn');
  const waveform  = document.getElementById('cdpw-waveform');
  const iconPlay  = document.getElementById('cdpw-icon-play');
  const iconPause = document.getElementById('cdpw-icon-pause');
  const audioSub  = document.getElementById('cdpw-audio-sub');
  const audioTitle = document.getElementById('cdpw-audio-title');
  const chatInput = document.getElementById('cdpw-input');
  const sendBtn   = document.getElementById('cdpw-send');
  const msgArea   = document.getElementById('cdpw-messages');
  const chips        = document.querySelectorAll('.cdpw-chip');
  const artPlayBtn   = document.getElementById('cdpw-art-play-btn');
  const artIconPlay  = document.getElementById('cdpw-art-icon-play');
  const artIconPause = document.getElementById('cdpw-art-icon-pause');
  const artWaveform  = document.getElementById('cdpw-art-waveform');
  const artAudioSub  = document.getElementById('cdpw-art-audio-sub');
  let   artSummaryText = '';   // texto completo para TTS do artigo
  let   artIsPlaying   = false;

  // ─── SETUP INICIAL BASEADO EM PÁGINA ─────────────────────────────────────
  if (isSinglePost) {
    // Troca a tab 1 para "Este artigo"
    const tabBriefing = document.getElementById('cdpw-tab-briefing');
    if (tabBriefing) {
      tabBriefing.textContent = 'Este artigo';
      tabBriefing.dataset.tab = 'artigo';
    }
    // Ativa o painel correto
    document.getElementById('cdpw-pane-artigo').classList.add('cdpw-active');
    document.getElementById('cdpw-pane-artigo').style.display = '';
    document.getElementById('cdpw-pane-briefing').classList.remove('cdpw-active');

    // Título da matéria
    const h1 = document.querySelector('h1.entry-title, h1.post-title, h1');
    const artTitleEl = document.getElementById('cdpw-art-title');
    if (h1 && artTitleEl) artTitleEl.textContent = h1.textContent.trim();
  }

  // ─── TOGGLE PANEL ─────────────────────────────────────────────────────────
  function toggle() {
    isOpen = !isOpen;
    panel.classList.toggle('cdpw-open', isOpen);
    if (isOpen) {
      if (isSinglePost && !isLoadingArticle) loadArticleSummary();
      else if (!isSinglePost && !briefingData && !isLoadingBriefing) loadBriefing();
      // "Ver mais" carrega os artigos do portal em ambos os casos
      if (!relatedData && !isLoadingBriefing) loadRelated();
    }
  }
  btn.addEventListener('click', toggle);
  closeBtn.addEventListener('click', toggle);

  // ─── TABS ─────────────────────────────────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.toggle('cdpw-active', t === tab));
      document.querySelectorAll('.cdpw-pane').forEach(p => p.classList.remove('cdpw-active'));
      document.getElementById('cdpw-pane-' + tab.dataset.tab).classList.add('cdpw-active');
    });
  });

  // ─── ARTIGO ATUAL (single-post) ───────────────────────────────────────────
  async function loadArticleSummary() {
    if (isLoadingArticle) return;
    isLoadingArticle = true;

    const summaryEl = document.getElementById('cdpw-art-summary');
    const askEl     = document.getElementById('cdpw-art-ask');
    const chipsEl   = document.getElementById('cdpw-art-chips');

    try {
      const title = document.querySelector('h1.entry-title, h1.post-title, h1.jeg_post_title, h1.tdb-title-text, h1')
        ?.textContent.trim() || document.title;

      // Passo 1: tenta extrair do DOM
      const CONTENT_SELECTORS = [
        '.entry-content', '.post-content', '.article-content', '.post-body',
        '.single-content', '[itemprop="articleBody"]', '.wp-block-post-content',
        '.td-post-content', '.jeg_inner_content', '.tdb-block-inner',
        '[class*="entry-content"]', '[class*="post-content"]', '[class*="article-body"]',
        'article .content', 'main article', 'article', 'main',
      ];
      let articleText = '';
      for (const sel of CONTENT_SELECTORS) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 200) {
          articleText = el.innerText.replace(/\s+/g, ' ').trim().slice(0, 3000);
          break;
        }
      }

      // Passo 2: fallback via WP REST API (usa o slug da URL atual)
      if (!articleText) {
        const slug = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop();
        if (slug) {
          // Tenta posts e pages
          for (const endpoint of ['posts', 'pages']) {
            try {
              const wpRes = await fetch(`/wp-json/wp/v2/${endpoint}?slug=${slug}&_fields=content,excerpt,title`, {
                headers: { 'Accept': 'application/json' }
              });
              const items = await wpRes.json();
              if (Array.isArray(items) && items.length > 0) {
                const raw = items[0].content?.rendered || items[0].excerpt?.rendered || '';
                articleText = stripTags(raw).replace(/\s+/g, ' ').trim().slice(0, 3000);
                if (articleText.length > 100) break;
              }
            } catch { /* tenta proximo */ }
          }
        }
      }

      if (!articleText) {
        summaryEl.textContent = 'Nao foi possivel ler o conteudo desta pagina. Use o chat para perguntar sobre CDP.';
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Faca um resumo claro e objetivo deste artigo em 3 paragrafos curtos. Destaque os pontos principais para o leitor.`,
          articles: [{ title, link: window.location.href, summary: articleText }],
          pageTitle: title,
          pageUrl: window.location.href,
        })
      });
      const data = await res.json();

      artSummaryText = data.reply || '';
      // Exibe só as 2 primeiras frases no bloco de texto
      const sentences = artSummaryText.split(/(?<=[.!?])\s+/);
      summaryEl.textContent = sentences.slice(0, 2).join(' ');

      // Chips de perguntas contextuais sobre o artigo
      const questions = [
        'Quais os pontos principais desta materia?',
        'Tem outros artigos relacionados no portal?',
        'Me explica de forma mais simples',
      ];
      chipsEl.innerHTML = questions.map(q =>
        `<button class="cdpw-chip cdpw-art-chip" data-q="${q}">${q}</button>`
      ).join('');

      chipsEl.querySelectorAll('.cdpw-art-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          chip.disabled = true;
          sendMessage(chip.dataset.q);
        });
      });

      askEl.style.display = 'block';

    } catch (err) {
      console.error('[Radar CDP] Erro ao resumir artigo:', err);
      summaryEl.textContent = 'Nao foi possivel gerar o resumo. Tente usar o chat abaixo.';
    } finally {
      isLoadingArticle = false;
    }
  }

  // ─── RELACIONADOS (Ver mais — busca artigos do portal) ────────────────────
  async function loadRelated() {
    try {
      const wpRes = await fetch('/wp-json/wp/v2/posts?per_page=5&_embed=true', {
        headers: { 'Accept': 'application/json' }
      });
      if (!wpRes.ok) return;
      const posts = await wpRes.json();
      relatedData = posts.map(p => ({
        title:   decodeEntities(p.title?.rendered || ''),
        link:    p.link || '',
        date:    p.date || '',
        summary: stripTags(p.excerpt?.rendered || '').slice(0, 300),
      }));
      renderArticles(relatedData, 'cdpw-related-articles');
    } catch (err) {
      console.error('[Radar CDP] Erro ao carregar relacionados:', err);
    }
  }

  // ─── BRIEFING ─────────────────────────────────────────────────────────────
  async function loadBriefing() {
    isLoadingBriefing = true;
    try {
      // Busca 10 artigos: 5 para o briefing, 5 para "Ver mais"
      const wpRes = await fetch('/wp-json/wp/v2/posts?per_page=10&_embed=true', {
        headers: { 'Accept': 'application/json' }
      });
      if (!wpRes.ok) throw new Error('WP API falhou: ' + wpRes.status);
      const posts = await wpRes.json();

      const allArticles = posts.map(p => ({
        title:   decodeEntities(p.title?.rendered || ''),
        link:    p.link || '',
        date:    p.date || '',
        summary: stripTags(p.excerpt?.rendered || '').slice(0, 300),
        categories: p._embedded?.['wp:term']?.[0]?.map(t => t.name) || [],
      }));

      const briefingArticles = allArticles.slice(0, 5);
      relatedData = allArticles.slice(5);

      // Gera resumo com IA usando os 5 primeiros
      const briefingRes = await fetch(`${API_BASE_URL}/api/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: briefingArticles })
      });
      const aiData = await briefingRes.json();

      briefingData = {
        articles:  briefingArticles,
        aiSummary: aiData.aiSummary,
        weekLabel: aiData.weekLabel,
      };

      const weekEl = document.getElementById('cdpw-week-label');
      if (weekEl) weekEl.textContent = briefingData.weekLabel || '';

      renderArticles(briefingArticles, 'cdpw-articles');
      // Ver mais: artigos 6-10 ou, se não houver, inverte os do briefing
      const forRelated = relatedData?.length ? relatedData : briefingArticles.slice().reverse();
      renderArticles(forRelated, 'cdpw-related-articles');

      // Ativa botões de navegação
      updateNavButtons();

      const badge = document.getElementById('cdpw-badge');
      if (badge) badge.style.display = 'none';

    } catch (err) {
      console.error('[Radar CDP] Erro:', err);
      document.getElementById('cdpw-articles').innerHTML =
        '<div style="padding:20px 16px;font-size:12.5px;color:#64748b;text-align:center">Nao foi possivel carregar os artigos.<br>Acesse o portal diretamente.</div>';
    } finally {
      isLoadingBriefing = false;
    }
  }

  // ─── NAVEGACAO DE ARTIGOS ─────────────────────────────────────────────────
  function updateNavButtons() {
    if (!briefingData?.articles) return;
    prevBtn.disabled = currentArticleIdx <= 0;
    nextBtn.disabled = currentArticleIdx >= briefingData.articles.length - 1;
  }

  function goToArticle(idx) {
    if (!briefingData?.articles) return;
    currentArticleIdx = idx;
    const art = briefingData.articles[idx];
    audioTitle.textContent = art.title.length > 44 ? art.title.slice(0, 44) + '...' : art.title;
    audioSub.textContent = `Artigo ${idx + 1} de ${briefingData.articles.length}`;
    updateNavButtons();

    // Para o áudio atual e lê o título + resumo do artigo selecionado
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setPlayState(false);
    }
  }

  prevBtn.addEventListener('click', () => goToArticle(currentArticleIdx - 1));
  nextBtn.addEventListener('click', () => goToArticle(currentArticleIdx + 1));

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  function stripTags(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function decodeEntities(str) {
    return str
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#8230;/g, '...').replace(/&#8216;|&#8217;/g, "'")
      .replace(/&#8220;|&#8221;/g, '"');
  }
  function formatDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return ''; }
  }

  function renderArticles(articles, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const TAGS = [
      { label: 'Destaque',    cat: 'destaque'   },
      { label: 'Analise',     cat: 'analise'    },
      { label: 'IA + CDP',    cat: 'ia'         },
      { label: 'Guia',        cat: 'guia'       },
      { label: 'Entrevista',  cat: 'entrevista' },
    ];
    container.innerHTML = articles.map((a, i) => {
      const tag = TAGS[i % TAGS.length];
      return `
        <a class="cdpw-card" href="${a.link}" target="_blank" rel="noopener" data-cat="${tag.cat}">
          <div class="cdpw-card-tag">${tag.label}</div>
          <div class="cdpw-card-title">${a.title}</div>
          <div class="cdpw-card-summary">${a.summary}</div>
          <div class="cdpw-card-meta">
            <span>${formatDate(a.date)}</span>
            <span class="cdpw-card-read">Ler</span>
          </div>
        </a>`;
    }).join('');
  }

  // ─── TTS (Web Speech API) ─────────────────────────────────────────────────
  function setPlayState(playing) {
    isPlaying = playing;
    waveform.classList.toggle('cdpw-playing', playing);
    iconPlay.style.display  = playing ? 'none'  : 'block';
    iconPause.style.display = playing ? 'block' : 'none';
    if (!playing) audioSub.textContent = briefingData?.articles
      ? `Artigo ${currentArticleIdx + 1} de ${briefingData.articles.length}`
      : 'resumo gerado por IA';
  }

  playBtn.addEventListener('click', () => {
    if (!briefingData?.aiSummary) {
      audioSub.textContent = 'Aguardando carregamento...';
      return;
    }
    if (!('speechSynthesis' in window)) {
      audioSub.textContent = 'Audio nao suportado neste browser';
      return;
    }
    if (isPlaying) {
      speechSynthesis.cancel();
      setPlayState(false);
      return;
    }

    // Decide o que ler: se um artigo estiver selecionado, lê título + resumo; senão, lê o resumo geral
    let textToRead = briefingData.aiSummary;
    if (currentArticleIdx > 0 && briefingData.articles[currentArticleIdx]) {
      const art = briefingData.articles[currentArticleIdx];
      textToRead = `${art.title}. ${art.summary}`;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang  = 'pt-BR';
    utterance.rate  = 0.88;   // levemente mais devagar para clareza
    utterance.pitch = 1.0;

    // Prefere voz feminina em pt-BR se disponível
    const tryVoice = () => {
      const voices = speechSynthesis.getVoices();
      const ptVoice =
        voices.find(v => v.lang === 'pt-BR' && v.name.toLowerCase().includes('female')) ||
        voices.find(v => v.lang === 'pt-BR') ||
        voices.find(v => v.lang.startsWith('pt'));
      if (ptVoice) utterance.voice = ptVoice;
    };
    if (speechSynthesis.getVoices().length > 0) tryVoice();
    else speechSynthesis.addEventListener('voiceschanged', tryVoice, { once: true });

    utterance.onstart = () => {
      setPlayState(true);
      audioSub.textContent = 'Reproduzindo...';
    };
    utterance.onend   = () => setPlayState(false);
    utterance.onerror = () => {
      setPlayState(false);
      audioSub.textContent = 'Erro ao reproduzir';
    };

    speechSynthesis.speak(utterance);
  });

  // ─── PLAYER DO ARTIGO ─────────────────────────────────────────────────────
  function setArtPlayState(playing) {
    artIsPlaying = playing;
    if (artWaveform)  artWaveform.classList.toggle('cdpw-playing', playing);
    if (artIconPlay)  artIconPlay.style.display  = playing ? 'none'  : 'block';
    if (artIconPause) artIconPause.style.display = playing ? 'block' : 'none';
    if (artAudioSub)  artAudioSub.textContent    = playing ? 'Reproduzindo...' : 'resumo gerado por IA';
  }

  if (artPlayBtn) {
    artPlayBtn.addEventListener('click', () => {
      if (!artSummaryText) { if (artAudioSub) artAudioSub.textContent = 'Aguardando resumo...'; return; }
      if (!('speechSynthesis' in window)) return;
      if (artIsPlaying) { speechSynthesis.cancel(); setArtPlayState(false); return; }

      const utt = new SpeechSynthesisUtterance(artSummaryText);
      utt.lang = 'pt-BR'; utt.rate = 0.88; utt.pitch = 1.0;
      const tryVoice = () => {
        const v = speechSynthesis.getVoices();
        const pt = v.find(x => x.lang === 'pt-BR') || v.find(x => x.lang.startsWith('pt'));
        if (pt) utt.voice = pt;
      };
      if (speechSynthesis.getVoices().length > 0) tryVoice();
      else speechSynthesis.addEventListener('voiceschanged', tryVoice, { once: true });

      utt.onstart = () => setArtPlayState(true);
      utt.onend   = () => setArtPlayState(false);
      utt.onerror = () => setArtPlayState(false);
      speechSynthesis.speak(utt);
    });
  }

  // ─── CHAT ─────────────────────────────────────────────────────────────────
  function addMessage(text, role) {
    const div = document.createElement('div');
    div.className = `cdpw-msg cdpw-${role}`;
    const content = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]\((.*?)\)/g, `<a href="$2" target="_blank" style="color:${ACCENT_COLOR};font-weight:600">$1</a>`)
      .replace(/\n/g, '<br>');
    if (role === 'bot') {
      div.innerHTML = `<div class="cdpw-bavatar">A</div><div class="cdpw-bubble">${content}</div>`;
    } else {
      div.innerHTML = `<div class="cdpw-bubble">${content}</div>`;
    }
    const typingEl = document.getElementById('cdpw-typing');
    if (typingEl) msgArea.insertBefore(div, typingEl);
    else msgArea.appendChild(div);
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.id = 'cdpw-typing';
    div.className = 'cdpw-msg cdpw-bot';
    div.innerHTML = '<div class="cdpw-bavatar">A</div><div class="cdpw-typing"><span></span><span></span><span></span></div>';
    msgArea.appendChild(div);
    msgArea.scrollTop = msgArea.scrollHeight;
  }
  function hideTyping() {
    const el = document.getElementById('cdpw-typing');
    if (el) el.remove();
  }

  async function sendMessage(text) {
    if (!text.trim() || isLoadingChat) return;
    // Vai para aba de chat
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
          message:    text,
          articles:   briefingData?.articles || [],
          pageTitle:  document.title || '',
          pageUrl:    window.location.href || '',
        })
      });
      const data = await res.json();
      hideTyping();
      addMessage(data.reply || 'Nao consegui processar sua pergunta. Tente novamente.', 'bot');
    } catch {
      hideTyping();
      addMessage('Instabilidade momentanea. Tente em instantes.', 'bot');
    } finally {
      isLoadingChat = false;
      sendBtn.disabled = false;
    }
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.disabled = true;
      sendMessage(chip.dataset.q);
    });
  });
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(chatInput.value); });
  sendBtn.addEventListener('click',     () => sendMessage(chatInput.value));

})();
