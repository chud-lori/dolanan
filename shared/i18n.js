// Central i18n. Each game registers its own strings via `register(scope, dict)`.
// Keys look up in `<current-lang>.<scope>.<key>`, falling back to `en`.
// Persisted to localStorage; emits `langchange` on switch.

import { storage } from "./storage.js";

const DEFAULT = "en";
const SUPPORTED = ["en", "id", "jw"];

// Resolution order when a key is missing in the active language.
// Javanese speakers understand Indonesian, so jw → id → en is a better fallback
// than jumping straight to English.
const LANG_FALLBACK = {
  jw: "id",
};

function langChain(lang) {
  const chain = [lang];
  let cur = LANG_FALLBACK[lang];
  while (cur && !chain.includes(cur)) {
    chain.push(cur);
    cur = LANG_FALLBACK[cur];
  }
  if (!chain.includes(DEFAULT)) chain.push(DEFAULT);
  return chain;
}

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
    "hub.about": "About",
    "hub.iosInstallTitle": "Add to Home Screen",
    "hub.iosStep1": "Tap the Share button at the bottom of Safari.",
    "hub.iosStep2": "Scroll and choose Add to Home Screen.",
    "hub.iosStep3": "Tap Add — Dolanan opens like a native app.",
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
    "hub.about": "Tentang",
    "hub.iosInstallTitle": "Tambahkan ke Layar Utama",
    "hub.iosStep1": "Tekan tombol Bagikan di bawah Safari.",
    "hub.iosStep2": "Gulir dan pilih Tambahkan ke Layar Utama.",
    "hub.iosStep3": "Tekan Tambah — Dolanan kebuka kayak aplikasi asli.",
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
  jw: {
    "hub.tagline": "Kumpulan dolanan santai kanggo bareng kanca.",
    "hub.games": "Dolanan",
    "hub.install": "Instal aplikasi",
    "hub.language": "Basa",
    "hub.offlineReady": "Isa offline",
    "hub.alsoTry": "Coba uga",
    "hub.sisterBlurb": "Dolanan deduksi sosial — tebak penyamare.",
    "hub.about": "Bab",
    "hub.iosInstallTitle": "Tambahake menyang Layar Utama",
    "hub.iosStep1": "Pencet tombol Share ing ngisor Safari.",
    "hub.iosStep2": "Scroll lan pilih Add to Home Screen.",
    "hub.iosStep3": "Pencet Add — Dolanan mbukak kaya aplikasi asli.",
    "nav.back": "← Bali",
    "nav.howTo": "Carane dolanan",
    "btn.newGame": "Main maneh",
    "btn.newRound": "Ronde anyar",
    "btn.reset": "Mbaleni",
    "btn.resetSeries": "Reset skor",
    "btn.undo": "↶ Batalke",
    "btn.ready": "Siap",
    "btn.start": "Miwiti",
    "btn.cancel": "Batal",
    "btn.continue": "Terusake",
    "btn.done": "Rampung",
    "btn.close": "Tutup",
    "btn.roll": "🎲 Kocok",
    "status.turn": "Giliran {name}",
    "status.winner": "{name} menang!",
    "status.draw": "Seri.",
    "pass.toNext": "Kasih HP marang {name}",
    "pass.private": "Pencet Siap yen HP wis ing tangan dhewe.",
    "players.count": "{n} pemain",
    "setup.howMany": "Pira pemaine?",
    "credit.by": "Digawe dening",
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
  let raw = key;
  for (const lang of langChain(current)) {
    const v =
      resolveKey(scope, k, lang) ||
      resolveKey("common", key, lang) ||
      resolveKey("common", k, lang);
    if (v) { raw = v; break; }
  }
  return raw.replace(/\{(\w+)\}/g, (_, v) => (vars[v] != null ? vars[v] : ""));
}

/** Pick the best-matching value from a {en, id, jw, ...} dictionary
 *  using the active language's fallback chain. */
export function pickLocalized(dict) {
  if (!dict) return "";
  for (const lang of langChain(current)) {
    if (dict[lang]) return dict[lang];
  }
  return dict.en || "";
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
    else if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
    else el.textContent = val;
  });
}

document.documentElement.lang = current;
document.addEventListener("langchange", () => applyI18n());
