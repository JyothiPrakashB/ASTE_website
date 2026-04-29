# ASTE — Aspect Sentiment Triplet Extraction

A web app that extracts structured sentiment triplets **(aspect → opinion → polarity)** from any sentence using **Qwen3-235B** via DashScope.

## Features
- 🔍 Sentence highlighting — aspect and opinion terms are underlined in the original text
- 🟢🔴🟡 Color-coded polarity cards
- ⚡ Serverless API route (API key never exposed to browser)
- 📱 Responsive layout

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up your API key
cp .env.local.example .env.local
# Edit .env.local and paste your DashScope API key

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

---

## Deploy to Vercel (via GitHub)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/aste-website.git
git push -u origin main
```

### Step 2 — Import on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** → select your repo
3. Click **Deploy** (no build settings needed — Vercel detects Next.js automatically)

### Step 3 — Add your API key
1. In your Vercel project → **Settings → Environment Variables**
2. Add:
   - **Name:** `DASHSCOPE_API_KEY`
   - **Value:** your DashScope API key
   - **Environment:** Production (+ Preview if you want)
3. Click **Save**, then **Redeploy**

That's it — your site is live! 🎉

---

## Project Structure

```
aste-website/
├── pages/
│   ├── _app.js          # Global styles loader
│   ├── index.js         # Main UI page
│   └── api/
│       └── extract.js   # Serverless API route → DashScope
├── styles/
│   └── globals.css      # CSS variables & base styles
├── .env.local.example   # API key template
├── next.config.js
└── package.json
```

## API

**POST `/api/extract`**

Request body:
```json
{ "sentence": "The battery life is amazing but the screen is dim." }
```

Response:
```json
{
  "triplets": [
    { "aspect": "battery life", "opinion": "amazing",  "polarity": "positive" },
    { "aspect": "screen",       "opinion": "dim",       "polarity": "negative" }
  ]
}
```
