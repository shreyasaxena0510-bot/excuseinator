const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

function extractJsonArray(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse excuses from model response');
  }
}

async function callGemini(apiKey, model, prompt, maxTokens) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: Math.max(maxTokens, 2048),
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  const data = await response.json();
  return { response, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const messages = req.body?.messages || [];
  const prompt = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n');

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const maxTokens = req.body?.max_tokens || 4096;
  let lastError = null;

  for (const model of MODELS) {
    try {
      const { response, data } = await callGemini(apiKey, model, prompt, maxTokens);

      if (!response.ok) {
        lastError = data?.error?.message || `Gemini request failed (${response.status})`;
        if (response.status === 429 || response.status === 503) continue;
        return res.status(response.status).json({ error: lastError });
      }

      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
      if (!text) {
        lastError = 'Model returned an empty response';
        continue;
      }

      const excuses = extractJsonArray(text);
      if (!Array.isArray(excuses) || excuses.length === 0) {
        lastError = 'Model did not return a valid excuses array';
        continue;
      }

      return res.status(200).json({ content: [{ text: JSON.stringify(excuses) }] });
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(503).json({
    error: lastError || 'All models are busy. Please try again in a moment.',
  });
}
