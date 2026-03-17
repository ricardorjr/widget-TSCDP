// api/cron-briefing.js — Cron job: roda 2x/semana (seg e qui às 8h)
// Pré-gera o áudio do Flash Briefing e invalida caches
// Configurado no vercel.json: "0 8 * * 1,4"

export default async function handler(req, res) {
  // Proteção: só aceita chamadas do Vercel Cron ou com token correto
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const BASE_URL = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    // 1. Busca o briefing (invalida cache e gera novo resumo)
    const briefingRes = await fetch(`${BASE_URL}/api/briefing?nocache=1`);
    const briefing = await briefingRes.json();

    if (!briefing.aiSummary) {
      return res.status(500).json({ error: 'Falha ao gerar briefing' });
    }

    // 2. Gera áudio do resumo
    const audioRes = await fetch(`${BASE_URL}/api/audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: briefing.aiSummary,
        forceRegenerate: true,
      }),
    });

    if (!audioRes.ok) {
      return res.status(500).json({ error: 'Falha ao gerar áudio' });
    }

    console.log(`[cron] Briefing e áudio gerados com sucesso — ${new Date().toISOString()}`);

    return res.status(200).json({
      success: true,
      articlesIndexed: briefing.articles?.length || 0,
      weekLabel: briefing.weekLabel,
      audioGenerated: true,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[cron] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
