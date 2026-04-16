// Central i18n. Each game registers its own strings via `register(scope, dict)`.
// Keys look up in `<current-lang>.<scope>.<key>`, falling back to `en`.
// Persisted to localStorage; emits `langchange` on switch.

import { storage } from "./storage.js";

const DEFAULT = "en";
const SUPPORTED = ["en", "id"];

// Shared "common" scope — used by hub + every game.
const COMMON = {
  en: {
    "hub.tagline": "Casual games for hanging out with friends.",
    "hub.games": "Games",
    "hub.install": "Install app",
    "hub.language": "Language",
    "hub.offlineReady": "Works offline",
    "hub.alsoTry": "Also try",
    "hub.sisterBlurb": "Social deduction party game — find the impostor.",
    "nav.back": "← Back",
    "nav.howTo": "How to play",
    "btn.newGame": "New game",
    "btn.newRound": "New round",
    "btn.reset": "Reset",
    "btn.resetSeries": "Reset series",
    "btn.undo": "↶ Undo",
    "btn.ready": "Ready",
    "btn.start": "Start",
    "btn.cancel": "Cancel",
    "btn.continue": "Continue",
    "btn.done": "Done",
    "btn.close": "Close",
    "btn.roll": "🎲 Roll",
    "status.turn": "{name}'s turn",
    "status.winner": "{name} wins!",
    "status.draw": "Draw.",
    "pass.toNext": "Pass the device to {name}",
    "pass.private": "Tap Ready once it's in your hands alone.",
    "players.count": "{n} players",
    "setup.howMany": "How many players?",
    "credit.by": "Created by",
  },
  id: {
    "hub.tagline": "Kumpulan game buat main bareng teman.",
    "hub.games": "Game",
    "hub.install": "Install aplikasi",
    "hub.language": "Bahasa",
    "hub.offlineReady": "Bisa offline",
    "hub.alsoTry": "Coba juga",
    "hub.sisterBlurb": "Gim deduksi sosial — tebak penyamarnya.",
    "nav.back": "← Kembali",
    "nav.howTo": "Cara main",
    "btn.newGame": "Main lagi",
    "btn.newRound": "Ronde baru",
    "btn.reset": "Ulang",
    "btn.resetSeries": "Reset skor",
    "btn.undo": "↶ Batalkan",
    "btn.ready": "Siap",
    "btn.start": "Mulai",
    "btn.cancel": "Batal",
    "btn.continue": "Lanjut",
    "btn.done": "Selesai",
    "btn.close": "Tutup",
    "btn.roll": "🎲 Kocok",
    "status.turn": "Giliran {name}",
    "status.winner": "{name} menang!",
    "status.draw": "Seri.",
    "pass.toNext": "Kasih HP ke {name}",
    "pass.private": "Tekan Siap kalau HP sudah di tanganmu.",
    "players.count": "{n} pemain",
    "setup.howMany": "Berapa pemain?",
    "credit.by": "Dibuat oleh",
  },
};

const STRINGS = {};
for (const lang of SUPPORTED) STRINGS[lang] = { common: { ...COMMON[lang] } };

function detect() {
  const saved = storage.get("lang");
  if (saved && SUPPORTED.includes(saved)) return saved;
  const nav = (navigator.language || DEFAULT).toLowerCase();
  return nav.startsWith("id") ? "id" : DEFAULT;
}

let current = detect();

export function register(scope, dict) {
  for (const lang of SUPPORTED) {
    if (!STRINGS[lang][scope]) STRINGS[lang][scope] = {};
    Object.assign(STRINGS[lang][scope], dict[lang] || {});
  }
}

export function getLang() { return current; }

export function setLang(code) {
  if (!SUPPORTED.includes(code) || code === current) return;
  current = code;
  storage.set("lang", code);
  document.documentElement.lang = code;
  document.dispatchEvent(new CustomEvent("langchange", { detail: code }));
}

function resolveKey(scope, key, lang) {
  return STRINGS[lang]?.[scope]?.[key];
}

/**
 * Translate `key`. Lookup order:
 *   1. parsed scope.rest                  (e.g. "ttt.win"     → STRINGS[x].ttt.win)
 *   2. whole key inside common            (e.g. "btn.undo"    → STRINGS[x].common["btn.undo"])
 *   3. rest alone inside common           (e.g. "btn.undo"    → STRINGS[x].common.undo)
 *   4. English fallback at each tier
 *   5. the key itself (surfaces missing translations instead of blanks)
 */
export function t(key, vars = {}) {
  let scope = "common";
  let k = key;
  const dot = key.indexOf(".");
  if (dot > -1) {
    scope = key.slice(0, dot);
    k = key.slice(dot + 1);
  }
  const raw =
    resolveKey(scope, k, current) ||
    resolveKey("common", key, current) ||
    resolveKey("common", k, current) ||
    resolveKey(scope, k, DEFAULT) ||
    resolveKey("common", key, DEFAULT) ||
    resolveKey("common", k, DEFAULT) ||
    key;
  return raw.replace(/\{(\w+)\}/g, (_, v) => (vars[v] != null ? vars[v] : ""));
}

/**
 * Apply translations to every element under `root` that has `data-i18n`.
 * The value can be a plain key or key with variables: "scope.key"
 * `data-i18n-attr` attaches to an attribute (e.g. "aria-label") instead of text.
 */
export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const attr = el.dataset.i18nAttr;
    const val = t(key);
    if (attr) el.setAttribute(attr, val);
    else el.textContent = val;
  });
}

document.documentElement.lang = current;
document.addEventListener("langchange", () => applyI18n());
