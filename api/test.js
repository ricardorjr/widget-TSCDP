// api/test.js — Diagnóstico do Gemini (remover após resolver)
// GET /api/test

export default async function handler(req, res) {
  const diagnostics = {
    geminiKeyPresent: !!process.env.GEMINI_API_KEY,
    geminiKeyPrefix: process.env.GEMINI_API_KEY?.slice(0, 8) + '...',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent('Responda apenas: OK');
    const text = result.response.text();

    return res.status(200).json({
      ...diagnostics,
      status: 'SUCCESS',
      geminiResponse: text,
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
