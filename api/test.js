// api/test.js — Diagnóstico da OpenAI
// GET /api/test

export default async function handler(req, res) {
  const diagnostics = {
    openaiKeyPresent: !!process.env.OPENAI_API_KEY,
    openaiKeyPrefix: process.env.OPENAI_API_KEY?.slice(0, 8) + '...',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };

  try {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Responda apenas: OK' }],
      max_tokens: 5,
    });

    const text = completion.choices[0]?.message?.content;

    return res.status(200).json({
      ...diagnostics,
      status: 'SUCCESS',
      openaiResponse: text,
    });

  } catch (err) {
    return res.status(200).json({
      ...diagnostics,
      status: 'ERROR',
      errorMessage: err.message,
      errorStatus: err.status,
      errorStack: err.stack?.split('\n').slice(0, 5),
    });
  }
}
