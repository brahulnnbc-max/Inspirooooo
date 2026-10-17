# 🚀 Vercel Deployment & Key Configuration Guide

This repository is **100% Vercel-ready** for **1-Click Deployment** with **zero build or log errors**.

---

## ⚡ Quick 1-Click Deployment Steps

### Step 1: Push / Import to GitHub
1. Push this project to your GitHub repository (or GitLab / Bitbucket).
2. Go to [https://vercel.com/new](https://vercel.com/new).
3. Select your repository and click **Import**.

---

### Step 2: Configure Project on Vercel
Vercel will automatically detect `vercel.json` and configure everything:
- **Framework Preset**: `Vite`
- **Root Directory**: `./`
- **Build Command**: `vite build` (or `npm run build`)
- **Output Directory**: `dist`
- **Install Command**: `npm install`

*(You don't need to change any of the build commands — `vercel.json` handles all rewrites and serverless routing automatically!)*

---

### Step 3: Add Your Gemini API Key (Key Arrangement)
In the **Environment Variables** section on the Vercel deployment screen (or under **Settings > Environment Variables**):

| Key | Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIzaSy...` (your key) | Required for question extraction, test scheduling & remedial questions |

> **Where to get a free key:**  
> Go to [Google AI Studio API Keys](https://aistudio.google.com/app/apikey) and click **Create API Key**. It takes 10 seconds and is completely free with generous quotas.  
> *(Note: The backend also automatically recognizes `VITE_GEMINI_API_KEY` if you prefer that variable name).*

---

### Step 4: Click "Deploy"
Click the blue **Deploy** button.  
Vercel will compile the Vite frontend into `dist/` and automatically bind the `/api` serverless functions via `api/index.ts`.

---

## 🩺 Instant Health Check

Once deployed, visit your live Vercel URL at:
```
https://<your-project-name>.vercel.app/api/health
```

You should see a clean JSON response:
```json
{
  "status": "ok",
  "appName": "inspiro LIVE • JEE Test & Module Practice",
  "hasGeminiKey": true,
  "environment": "production",
  "platform": "vercel"
}
```
If `hasGeminiKey` is `true`, all AI features (CBT PDF conversion, Daily Routine Director, Roadmap Generator, and Master Academic Mentor) are working smoothly.

---

## 🏗️ How the Architecture Works on Vercel

1. **Frontend**: Vite compiles high-performance React 19 + Tailwind CSS single-page app into `dist/`.
2. **Serverless AI Backend**: `api/index.ts` automatically runs on Vercel's Edge/Node Serverless Functions.
3. **API Routing**: `vercel.json` rewrites all `/api/*` traffic to the serverless handler, and all page navigation to `index.html`.
4. **Resilient AI Pipeline**: Includes automatic multi-model fallback (`gemini-3.8-flash` → `gemini-flash-latest` → `gemini-3.1-flash-lite`) with backoff retries to eliminate 503 high-demand errors.

---

## 📋 Common Questions & Troubleshooting

- **What if I get a 500 error on PDF upload?**  
  Check if `GEMINI_API_KEY` was added in Vercel. After adding an environment variable in Vercel, remember to **Redeploy** so the new key takes effect.
- **Upload File Size**:  
  Vercel Hobby accounts have a 4.5MB request body limit. Keep PDF uploads under 4MB, or test with typical 5–20 page question papers for optimal speed.
- **Local Development**:  
  Locally, simply run `npm run dev` to launch the full Express + Vite server at `http://localhost:3000`.
