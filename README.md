# Excuseinator 3000!! ⚡

> Comic book-styled excuse generator for people who take 3 days to reply to texts.

## Deploy to Vercel (3 steps)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "launch the excuseinator"
   gh repo create excuseinator --public --push
   ```

2. **Import on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repo
   - No build settings needed — it's a static site

3. **Add your API key (required for AI calls)**
   - In Vercel → Project Settings → Environment Variables
   - Add: `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
   - Then add a simple serverless proxy (see below)

## API Proxy (important!)

The current `index.html` calls the Anthropic API directly — this works locally
but exposes your key in production. Add this serverless function:

Create `/api/generate.js`:
```js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.status(response.status).json(data);
}
```

Then update `index.html` — change the fetch URL from:
```
https://api.anthropic.com/v1/messages
```
to:
```
/api/generate
```

## Local development

Just open `index.html` in a browser — no build step needed.
