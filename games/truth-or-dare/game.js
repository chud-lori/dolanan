// Truth or Dare — pass-phone picker. Players cycle in order. Each turn, the
// current player picks Truth or Dare, reads the prompt, and passes the phone.

import { storage } from "/shared/storage.js";
import { register, t, getLang } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";
import { attachNameSuggestions, rememberNames } from "/shared/names.js";
import { PROMPTS } from "./prompts.js";

register("td", {
  en: {
    subtitle: "2+ players · pass-phone dares",
    setupTitle: "Players",
    addPlayer: "+ Add player",
    start: "Start",
    minPlayers: "Need at least 2 players.",
    current: "{name}'s turn",
    pickTruth: "Truth",
    pickDare: "Dare",
    next: "Pass to next",
    random: "Random",
    tooShort: "Enter a name",
    truth: "Truth",
    dare: "Dare",
  },
  id: {
    subtitle: "2+ pemain · tantangan estafet",
    setupTitle: "Pemain",
    addPlayer: "+ Tambah pemain",
    start: "Mulai",
    minPlayers: "Butuh minimal 2 pemain.",
    current: "Giliran {name}",
    pickTruth: "Jujur",
    pickDare: "Berani",
    next: "Kasih ke berikutnya",
    random: "Acak",
    tooShort: "Isi nama",
    truth: "Jujur",
    dare: "Berani",
  },
});

wireGameHead({
  titleEn: "Truth or Dare",
  titleId: "Jujur atau Berani",
  subtitleKey: "td.subtitle",
  rules: {
    en: `
      <h3>How to play</h3>
      <ul>
        <li>Enter player names and tap Start.</li>
        <li>On your turn, choose <strong>Truth</strong>, <strong>Dare</strong>, or <strong>Random</strong>.</li>
        <li>Read the prompt aloud and answer / do it.</li>
        <li>Tap <em>Pass to next</em> and hand the phone to the next player.</li>
      </ul>
      <p>Prompts are safe and friendly. Switch language to swap EN ↔ ID prompt pools.</p>`,
    id: `
      <h3>Cara main</h3>
      <ul>
        <li>Isi nama pemain lalu tekan Mulai.</li>
        <li>Pas giliranmu, pilih <strong>Jujur</strong>, <strong>Berani</strong>, atau <strong>Acak</strong>.</li>
        <li>Baca tantangannya dan jawab / lakukan.</li>
        <li>Tekan <em>Kasih ke berikutnya</em> dan oper HP ke pemain selanjutnya.</li>
      </ul>
      <p>Semua tantangan aman dan bersahabat. Ganti bahasa untuk tukar daftar tantangan ID ↔ EN.</p>`,
  },
});

const root = document.getElementById("td-root");
const RECENT_KEY = "td:recent";

const state = {
  phase: "setup",
  players: storage.get("td:players", ["", ""]),
  idx: 0,
  current: null,
};

function pickPrompt(kind) {
  const lang = getLang();
  const pool = PROMPTS[lang][kind];
  const recent = storage.get(RECENT_KEY, []);
  const fresh = pool.filter((p) => !recent.includes(p));
  const candidates = fresh.length ? fresh : pool;
  const p = candidates[Math.floor(Math.random() * candidates.length)];
  const next = [p, ...recent].slice(0, Math.min(30, pool.length - 1));
  storage.set(RECENT_KEY, next);
  return p;
}

function renderSetup() {
  state.phase = "setup";
  const valid = state.players.filter((n) => n.trim()).length >= 2;
  root.innerHTML = `
    <div class="td-card" style="align-items: stretch; text-align: left;">
      <h2 style="text-align:center;">${t("td.setupTitle")}</h2>
      <div class="td-names" id="names"></div>
      <div class="td-buttons">
        <button id="add" class="btn btn-ghost" type="button">${t("td.addPlayer")}</button>
      </div>
      <p style="color: ${valid ? "var(--success)" : "var(--danger)"}; text-align: center;">
        ${valid ? "✓" : t("td.minPlayers")}
      </p>
      <button id="start" class="btn btn-primary" type="button" ${valid ? "" : "disabled"} style="width: 100%;">
        ${t("td.start")}
      </button>
    </div>
  `;
  const namesEl = root.querySelector("#names");
  const startBtn = root.querySelector("#start");
  const syncStart = () => {
    const ok = state.players.filter((n) => n.trim()).length >= 2;
    startBtn.disabled = !ok;
  };

  const allInputs = [];
  state.players.forEach((name, i) => {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "6px";
    wrap.innerHTML = `
      <input type="text" class="td-name-input" value="${name}" placeholder="${t("td.tooShort")}" style="flex:1;" />
      <button type="button" class="btn btn-ghost" aria-label="remove">✕</button>
    `;
    const input = wrap.querySelector("input");
    allInputs.push(input);
    input.addEventListener("input", () => {
      state.players[i] = input.value;
      storage.set("td:players", state.players);
      syncStart();
    });
    wrap.querySelector("button").addEventListener("click", () => {
      state.players.splice(i, 1);
      if (state.players.length === 0) state.players = [""];
      storage.set("td:players", state.players);
      renderSetup();
    });
    namesEl.appendChild(wrap);
  });

  attachNameSuggestions(allInputs);
  root.querySelector("#add").addEventListener("click", () => {
    state.players.push("");
    renderSetup();
  });
  root.querySelector("#start").addEventListener("click", () => {
    state.players = state.players.filter((n) => n.trim());
    rememberNames(state.players);
    state.idx = 0;
    fx.play("click"); fx.haptic("tap");
    renderPick();
  });
}

function renderPick() {
  state.phase = "pick";
  const name = state.players[state.idx];
  root.innerHTML = `
    <div class="td-card">
      <h2>${t("td.current", { name })}</h2>
      <div class="td-spinner"><span>🎯</span></div>
      <div class="td-buttons">
        <button id="truth" class="btn btn-primary" type="button" style="background: var(--primary);">${t("td.pickTruth")}</button>
        <button id="dare" class="btn btn-danger" type="button">${t("td.pickDare")}</button>
        <button id="random" class="btn btn-ghost" type="button">🎲 ${t("td.random")}</button>
      </div>
    </div>
  `;
  root.querySelector("#truth").addEventListener("click", () => { fx.play("click"); fx.haptic("tap"); show("truth"); });
  root.querySelector("#dare").addEventListener("click", () => { fx.play("click"); fx.haptic("tap"); show("dare"); });
  root.querySelector("#random").addEventListener("click", () => { fx.play("roll"); fx.haptic("roll"); show(Math.random() < 0.5 ? "truth" : "dare"); });
}

function show(kind) {
  state.phase = "prompt";
  state.current = { kind, prompt: pickPrompt(kind) };
  renderPrompt();
}

function renderPrompt() {
  const { kind, prompt } = state.current;
  const name = state.players[state.idx];
  root.innerHTML = `
    <div class="td-card">
      <span class="td-kind ${kind}">${t("td." + kind)}</span>
      <p class="td-prompt">${prompt}</p>
      <p style="color: var(--text-muted);">${name}</p>
      <button id="next" class="btn btn-primary" type="button" style="width: 100%;">${t("td.next")}</button>
    </div>
  `;
  root.querySelector("#next").addEventListener("click", () => {
    state.idx = (state.idx + 1) % state.players.length;
    renderPick();
  });
}

document.addEventListener("langchange", () => {
  if (state.phase === "setup") renderSetup();
  else if (state.phase === "pick") renderPick();
  else if (state.phase === "prompt") renderPrompt();
});

renderSetup();
