# ARIA — Personal AI Console

A Jarvis-style single-page assistant: Chat, Image generation, Digest (summaries), and Research — built with plain HTML, CSS, and JS. No build step, no server required.

## Features

- **Chat** — conversational assistant powered by the Claude API
- **Imaging** — text-to-image generation (free, no key needed, via Pollinations.ai)
- **Digest** — paste any text and get a brief / standard / deep summary
- **Research** — structured research reports; optionally grounded with live web search (Brave Search API)

## 1. Get an API key

You need your own Anthropic API key:
1. Go to https://console.anthropic.com
2. Create an account and generate an API key (starts with `sk-ant-`)
3. Anthropic API usage is billed per token — check current pricing in the console

Optional, for live web-grounded research: get a free key at https://api.search.brave.com.

**Important:** this app calls the Anthropic API directly from your browser using your key. That means:
- Your key is stored only in your browser's local storage, never sent anywhere but Anthropic's API
- Anyone with access to your browser/device could read it from local storage
- Don't publish a version of this site with your key baked into the code — always enter it live in Settings on your own device

This design is meant for **personal use**, not a public multi-user product. For a real product, put the API key on a backend server instead.

## 2. Run it locally

Just open `index.html` in a browser — no build tools needed. Or serve it locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

Click the **Settings** icon in the left rail, paste your Anthropic API key, pick a model, and save.

## 3. Publish to GitHub Pages

1. Create a new repository on GitHub (e.g. `aria-console`)
2. Upload these three files to the repo root: `index.html`, `style.css`, `app.js`
   - Via the GitHub web UI: **Add file → Upload files**
   - Or via git:
     ```bash
     git init
     git add index.html style.css app.js README.md
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/aria-console.git
     git push -u origin main
     ```
3. In the repo, go to **Settings → Pages**
4. Under **Source**, select **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**
5. GitHub gives you a URL like `https://YOUR_USERNAME.github.io/aria-console/` — that's your live site

Each visitor (including you) enters their own API key locally in Settings — it's never stored in the repo or on any server.

## Files

```
index.html   — structure and layout
style.css    — HUD-style dark theme
app.js       — mode switching, API calls, animation
README.md    — this file
```

## Customizing

- Swap the model in Settings → Model (Sonnet 5 / Opus 4.8 / Haiku 4.5)
- Colors and type are defined as CSS variables at the top of `style.css`
- Chat system prompt, summary instructions, and research prompt are editable in `app.js`
- 
