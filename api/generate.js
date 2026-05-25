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

  const maxTokens = req.body?.max_tokens || 1000;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json(data);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  res.status(200).json({ content: [{ text }] });
}
