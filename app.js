/* ---------------- Storage helpers ---------------- */
const store = {
  get(k, d = "") { return localStorage.getItem(k) ?? d; },
  set(k, v) { localStorage.setItem(k, v); }
};

const state = {
  apiKey: store.get("aria_api_key"),
  model: store.get("aria_model", "gemini-flash-latest"),
  imageModel: store.get("aria_image_model", "gemini-3.1-flash-image"),
  braveKey: store.get("aria_brave_key"),
  chatHistory: []
};

/* ---------------- Sound engine (synthesized — no audio files needed) ---------------- */
const SFX = (() => {
  let actx = null;
  let muted = store.get("aria_muted", "0") === "1";

  function ctx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    return actx;
  }

  function tone({ freq = 440, dur = 0.12, type = "sine", peak = 0.12, glideTo = null, delay = 0 }) {
    if (muted) return;
    try {
      const c = ctx();
      const t0 = c.currentTime + delay;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    } catch (e) { /* audio unavailable — fail silently */ }
  }

  return {
    click() { tone({ freq: 780, dur: 0.045, type: "sine", peak: 0.05 }); },
    send() { tone({ freq: 420, dur: 0.09, type: "sine", peak: 0.08, glideTo: 760 }); },
    receive() {
      tone({ freq: 660, dur: 0.1, type: "sine", peak: 0.07 });
      tone({ freq: 880, dur: 0.13, type: "sine", peak: 0.06, delay: 0.06 });
    },
    chime() {
      tone({ freq: 660, dur: 0.12, type: "sine", peak: 0.06 });
      tone({ freq: 990, dur: 0.16, type: "sine", peak: 0.055, delay: 0.07 });
      tone({ freq: 1320, dur: 0.2, type: "sine", peak: 0.045, delay: 0.14 });
    },
    error() { tone({ freq: 240, dur: 0.24, type: "sawtooth", peak: 0.06, glideTo: 110 }); },
    open() { tone({ freq: 340, dur: 0.09, type: "sine", peak: 0.06, glideTo: 580 }); },
    close() { tone({ freq: 560, dur: 0.09, type: "sine", peak: 0.05, glideTo: 300 }); },
    toggle() { tone({ freq: 520, dur: 0.07, type: "triangle", peak: 0.07 }); },
    setMuted(v) { muted = v; store.set("aria_muted", v ? "1" : "0"); },
    isMuted() { return muted; }
  };
})();

/* ---------------- Core canvas (signature HUD element) ---------------- */
const canvas = document.getElementById("coreCanvas");
const ctx = canvas.getContext("2d");
let busy = false, t = 0;

function drawCore() {
  const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  const speed = busy ? 0.09 : 0.025;
  t += speed;

  for (let i = 0; i < 3; i++) {
    const r = 10 + i * 7 + Math.sin(t + i) * 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, t * (i % 2 === 0 ? 1 : -1), t * (i % 2 === 0 ? 1 : -1) + 4.2);
    ctx.strokeStyle = i === 1 ? "rgba(240,180,41,0.8)" : "rgba(94,234,212,0.85)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 4 + (busy ? Math.sin(t * 4) * 1.5 : 0), 0, 7);
  ctx.fillStyle = "#5EEAD4";
  ctx.shadowColor = "#5EEAD4";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  requestAnimationFrame(drawCore);
}
drawCore();

/* ---------------- Clock ---------------- */
function tickClock() {
  document.getElementById("clock").textContent = new Date().toLocaleTimeString([], { hour12: false });
}
setInterval(tickClock, 1000); tickClock();

function setStatus(active) {
  busy = active;
  document.getElementById("statusText").textContent = active ? "PROCESSING" : "STANDBY";
}

/* ---------------- Mode switching ---------------- */
const modeTitles = { chat: "Chat", image: "Imaging", summary: "Digest", research: "Research" };
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    SFX.click();
    document.querySelectorAll(".mode-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
    btn.classList.add("active"); btn.setAttribute("aria-selected", "true");
    const mode = btn.dataset.mode;
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`panel-${mode}`).classList.add("active");
    document.getElementById("modeTitle").textContent = modeTitles[mode];
  });
});

/* ---------------- Settings drawer ---------------- */
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
function openDrawer() {
  SFX.open();
  document.getElementById("apiKey").value = state.apiKey;
  document.getElementById("modelSelect").value = state.model;
  document.getElementById("imageModelSelect").value = state.imageModel;
  document.getElementById("braveKey").value = state.braveKey;
  drawer.classList.add("open"); overlay.classList.add("open");
}
function closeDrawer() { SFX.close(); drawer.classList.remove("open"); overlay.classList.remove("open"); }
document.getElementById("openSettings").addEventListener("click", openDrawer);
document.getElementById("closeSettings").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);

const muteBtn = document.getElementById("muteBtn");
function updateMuteIcon() { muteBtn.textContent = SFX.isMuted() ? "🔇" : "🔊"; }
updateMuteIcon();
muteBtn.addEventListener("click", () => {
  const newMuted = !SFX.isMuted();
  SFX.setMuted(newMuted);
  updateMuteIcon();
  if (!newMuted) SFX.toggle();
});

document.getElementById("saveSettings").addEventListener("click", () => {
  SFX.chime();
  state.apiKey = document.getElementById("apiKey").value.trim();
  state.model = document.getElementById("modelSelect").value;
  state.imageModel = document.getElementById("imageModelSelect").value.trim() || "gemini-3.1-flash-image";
  state.braveKey = document.getElementById("braveKey").value.trim();
  store.set("aria_api_key", state.apiKey);
  store.set("aria_model", state.model);
  store.set("aria_image_model", state.imageModel);
  store.set("aria_brave_key", state.braveKey);
  const c = document.getElementById("saveConfirm");
  c.textContent = "Saved.";
  setTimeout(() => (c.textContent = ""), 2000);
});

/* auto-resize textareas */
document.querySelectorAll("textarea").forEach(ta => {
  if (ta.classList.contains("big-input")) return;
  ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; });
});

/* ---------------- Gemini API call ---------------- */
// messages: array of { role: "user" | "assistant", content: string }
async function callClaude(messages, system) {
  if (!state.apiKey) throw new Error("No API key set. Open Settings and add your free Gemini API key.");
  const model = state.model || "gemini-flash-latest";
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(state.apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined
      })
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`API error ${res.status}: ${errBody.slice(0, 300)}`);
  }
  const data = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate) {
    const reason = data.promptFeedback?.blockReason;
    throw new Error(reason ? `Blocked: ${reason}` : "No response from model.");
  }
  return (candidate.content?.parts || []).map(p => p.text || "").join("\n").trim();
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function mdLite(str) {
  let s = escapeHtml(str);
  s = s.replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return s;
}

/* ---------------- Chat ---------------- */
const chatLog = document.getElementById("chatLog");
function appendMsg(role, text, isError = false) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="msg-role">${role === "user" ? "You" : "ARIA"}</div><div class="msg-body${isError ? " error" : ""}">${mdLite(text)}</div>`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  return div;
}

document.getElementById("chatForm").addEventListener("submit", async e => {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = ""; input.style.height = "auto";
  appendMsg("user", text);
  SFX.send();
  state.chatHistory.push({ role: "user", content: text });
  const placeholder = appendMsg("system", "Thinking…");
  setStatus(true);
  try {
    const reply = await callClaude(state.chatHistory, "You are ARIA, a sharp, concise personal AI assistant. Keep replies natural and to the point.");
    placeholder.querySelector(".msg-body").innerHTML = mdLite(reply);
    state.chatHistory.push({ role: "assistant", content: reply });
    SFX.receive();
  } catch (err) {
    placeholder.querySelector(".msg-body").classList.add("error");
    placeholder.querySelector(".msg-body").textContent = err.message;
    SFX.error();
  } finally { setStatus(false); }
});

/* ---------------- Imaging (Google Gemini "Nano Banana" image models) ---------------- */
async function callGeminiImage(prompt) {
  if (!state.apiKey) throw new Error("No API key set. Open Settings and add your free Gemini API key.");
  const model = state.imageModel || "gemini-3.1-flash-image";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(state.apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] }
      })
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`API error ${res.status}: ${errBody.slice(0, 300)}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inlineData);
  if (!imgPart) {
    const reason = data.promptFeedback?.blockReason;
    throw new Error(reason ? `Blocked: ${reason}` : "No image returned — try rephrasing the prompt.");
  }
  return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
}

document.getElementById("imageForm").addEventListener("submit", async e => {
  e.preventDefault();
  const input = document.getElementById("imageInput");
  const prompt = input.value.trim();
  if (!prompt) return;
  const grid = document.getElementById("imageGrid");
  const card = document.createElement("div");
  card.className = "image-card loading";
  card.textContent = "RENDERING…";
  grid.prepend(card);
  setStatus(true);
  SFX.send();
  input.value = "";

  try {
    const dataUrl = await callGeminiImage(prompt);
    card.classList.remove("loading");
    card.textContent = "";
    card.innerHTML = `<img src="${dataUrl}" alt="${escapeHtml(prompt)}"><div class="cap">${escapeHtml(prompt)}</div>`;
    SFX.chime();
  } catch (err) {
    card.classList.remove("loading");
    card.textContent = "";
    card.innerHTML = `<div class="cap" style="color:var(--danger)">${escapeHtml(err.message)}</div>`;
    SFX.error();
  } finally { setStatus(false); }
});

/* ---------------- Digest / Summary ---------------- */
document.getElementById("summaryBtn").addEventListener("click", async () => {
  const text = document.getElementById("summaryInput").value.trim();
  const resultEl = document.getElementById("summaryResult");
  if (!text) return;
  const length = document.getElementById("summaryLength").value;
  const instructions = {
    brief: "Give only 3-5 crisp bullet points capturing the essentials. No preamble.",
    standard: "Give a structured summary: a 2-sentence overview, then key points as bullets, then any notable caveats.",
    deep: "Give a detailed breakdown: overview, all key points and sub-points, named entities/figures mentioned, and any conclusions or implications."
  };
  resultEl.textContent = "Analyzing…";
  setStatus(true);
  SFX.send();
  try {
    const reply = await callClaude(
      [{ role: "user", content: text }],
      `You are ARIA's digest engine. Summarize the user's text. ${instructions[length]} Use markdown-style ## headers and **bold** sparingly where useful.`
    );
    resultEl.innerHTML = mdLite(reply);
    SFX.receive();
  } catch (err) {
    resultEl.textContent = err.message;
    SFX.error();
  } finally { setStatus(false); }
});

/* ---------------- Research ---------------- */
async function braveSearch(query) {
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6`, {
    headers: { "Accept": "application/json", "X-Subscription-Token": state.braveKey }
  });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = await res.json();
  return (data.web?.results || []).map(r => `- ${r.title}: ${r.description} (${r.url})`).join("\n");
}

document.getElementById("researchForm").addEventListener("submit", async e => {
  e.preventDefault();
  const input = document.getElementById("researchInput");
  const topic = input.value.trim();
  if (!topic) return;
  const resultEl = document.getElementById("researchResult");
  resultEl.textContent = "Investigating…";
  setStatus(true);
  SFX.send();

  let context = "";
  let sourceNote = "";
  if (state.braveKey) {
    try {
      context = await braveSearch(topic);
      sourceNote = "Live web results were used to ground this report.";
    } catch (err) {
      sourceNote = `Live search unavailable (${err.message}) — falling back to ARIA's own knowledge.`;
    }
  } else {
    sourceNote = "No search key set — this report draws on ARIA's own knowledge, not live web data.";
  }

  try {
    const prompt = context
      ? `Research topic: "${topic}"\n\nHere are live web search results to ground your answer:\n${context}\n\nWrite a detailed, well-organized research report using these results, citing sources by name inline.`
      : `Research topic: "${topic}"\n\nWrite a detailed, well-organized research report from your own knowledge. Note plainly if parts may be outdated.`;
    const reply = await callClaude(
      [{ role: "user", content: prompt }],
      "You are ARIA's research engine. Produce a thorough, structured report with ## section headers, key facts, and a brief closing synthesis."
    );
    resultEl.innerHTML = `<div class="cap" style="color:var(--muted); font-family:var(--mono); font-size:11px; margin-bottom:14px;">${sourceNote}</div>` + mdLite(reply);
    SFX.receive();
  } catch (err) {
    resultEl.textContent = err.message;
    SFX.error();
  } finally { setStatus(false); }
  input.value = "";
});
        
