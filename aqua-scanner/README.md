# 🐠 AquaScan — Aquarium Intelligence Scanner

Upload a photo of an **aquatic plant, fish, driftwood, or substrate/sand** and instantly get expert aquarium insights — powered by **Groq + Llama 4 Scout** (free & fast!).

## Features

- 🌿 **Plant Scanner** — Name, CO₂ requirements, lighting, growth rate, care level, water parameters
- 🐟 **Fish Scanner** — Species, tank size, diet, behavior, compatibility, water parameters
- 🪵 **Driftwood Scanner** — Type identification, pH effects, tannin info, preparation tips
- 🪨 **Sand/Substrate Scanner** — Composition, suitability, effects on water chemistry

## AI Model

Uses **Groq** (free tier) with **Llama 4 Scout 17B** — a powerful vision model that's:
- ✅ **Free** — Groq free tier is generous
- ⚡ **Fast** — Groq's LPU inference is extremely quick
- 🖼️ **Vision capable** — Analyzes images accurately

## Deploy to Vercel

### 1. Get a free Groq API key
Go to [console.groq.com](https://console.groq.com) → Sign up → API Keys → Create key

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/aqua-scanner.git
git push -u origin main
```

### 3. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Add Environment Variable:
   - **Name:** `GROQ_API_KEY`
   - **Value:** Your Groq API key
4. Click **Deploy**

## Local Development

```bash
npm install
echo "GROQ_API_KEY=your_key_here" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 15** (App Router)
- **Groq API** — meta-llama/llama-4-scout-17b-16e-instruct (free vision model)
- **Deployed on Vercel**
