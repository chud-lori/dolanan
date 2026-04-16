// Hangman — 1+ players, offline word list (EN + ID), 6 wrong guesses allowed.
// Input: hidden focused <input> so mobile pops up the device keyboard; desktop
// just types. A "tried letters" strip shows what's been guessed (hits vs misses).

import { storage } from "/shared/storage.js";
import { register, t, getLang } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { WORDS } from "./words.js";

register("hm", {
  en: {
    subtitle: "6 wrong = you hang. Good luck.",
    wrongs: "{n}/6 wrong",
    win: "You got it! Word: {w}",
    lose: "Game over. Word: {w}",
    category: "Category",
    change: "Change",
    cat_animals: "Animals",
    cat_food: "Food",
    cat_tech: "Tech",
    cat_nature: "Nature",
    cat_makanan: "Food",
    cat_teknologi: "Tech",
    cat_alam: "Nature",
    hint: "Tap here and type a letter",
    tried: "Tried",
  },
  id: {
    subtitle: "6 kali salah = tamat. Semangat!",
    wrongs: "{n}/6 salah",
    win: "Kamu berhasil! Katanya: {w}",
    lose: "Game over. Katanya: {w}",
    category: "Kategori",
    change: "Ganti",
    cat_animals: "Hewan",
    cat_food: "Makanan",
    cat_tech: "Teknologi",
    cat_nature: "Alam",
    cat_makanan: "Makanan",
    cat_teknologi: "Teknologi",
    cat_alam: "Alam",
    hint: "Tap di sini, ketik huruf tebakan",
    tried: "Sudah dicoba",
  },
});

wireGameHead({ titleEn: "Hangman", titleId: "Tebak Kata", subtitleKey: "hm.subtitle" });

const wordEl = document.getElementById("word");
const triedEl = document.getElementById("tried");
const hiddenInput = document.getElementById("guess-input");
const hintLabel = document.getElementById("guess-hint");
const catLabelEl = document.getElementById("cat-label");
const catBtn = document.getElementById("cat-change");
const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");

const RECENT_KEY = "hm:recent";
const MAX_WRONG = 6;

let target, guessed, wrong, categoryKey;

function pickCategory() {
  const lang = getLang();
  const cats = Object.keys(WORDS[lang]);
  return cats[Math.floor(Math.random() * cats.length)];
}

function pickWord(category) {
  const lang = getLang();
  const bucket = WORDS[lang][category] || Object.values(WORDS[lang])[0];
  const recent = storage.get(RECENT_KEY, []);
  const pool = bucket.filter((w) => !recent.includes(w));
  const candidates = pool.length ? pool : bucket;
  const word = candidates[Math.floor(Math.random() * candidates.length)];
  const next = [word, ...recent].slice(0, Math.min(20, bucket.length - 1));
  storage.set(RECENT_KEY, next);
  return word;
}

function newRound({ keepCategory = false } = {}) {
  if (!keepCategory || !categoryKey || !WORDS[getLang()][categoryKey]) {
    categoryKey = pickCategory();
  }
  target = pickWord(categoryKey);
  guessed = new Set();
  wrong = 0;
  statusEl.hidden = true;
  render();
  focusInput();
}

function render() {
  // Hidden word
  wordEl.innerHTML = target
    .split("")
    .map((ch) => {
      const shown = guessed.has(ch) || wrong >= MAX_WRONG;
      return `<span class="hm-letter${shown ? "" : " blank"}">${shown ? ch : "_"}</span>`;
    })
    .join("");

  // Tried letters strip
  const tried = [...guessed].sort();
  if (tried.length === 0) {
    triedEl.innerHTML = `<span class="hm-tried-label">${t("hm.tried")}:</span> <span class="hm-tried-none">—</span>`;
  } else {
    triedEl.innerHTML =
      `<span class="hm-tried-label">${t("hm.tried")}:</span> ` +
      tried
        .map((l) => {
          const cls = target.includes(l) ? "hit" : "miss";
          return `<span class="hm-tried-chip ${cls}">${l}</span>`;
        })
        .join("");
  }

  // Gallows
  document.querySelectorAll("#gallows .part").forEach((el, i) => {
    el.classList.toggle("on", i < wrong);
  });

  // Category + labels
  catLabelEl.textContent = `${t("hm.category")}: ${t("hm.cat_" + categoryKey)}`;
  catBtn.textContent = t("hm.change");
  hintLabel.textContent = t("hm.hint");

  turnLabel.textContent = t("hm.wrongs", { n: wrong });
  const dot = document.querySelector("#turn-pill .turn-dot");
  dot.className = "turn-dot " + (wrong >= 4 ? "red" : wrong >= 2 ? "yellow" : "green");

  if (isOver()) {
    statusEl.hidden = false;
    if (isWin()) {
      statusEl.textContent = t("hm.win", { w: target });
      statusEl.className = "status-banner win";
    } else {
      statusEl.textContent = t("hm.lose", { w: target });
      statusEl.className = "status-banner draw";
    }
    hiddenInput.disabled = true;
  } else {
    hiddenInput.disabled = false;
  }
}

function guess(letter) {
  if (isOver() || guessed.has(letter)) return;
  guessed.add(letter);
  if (!target.includes(letter)) wrong++;
  render();
}

function isWin() {
  return target.split("").every((ch) => guessed.has(ch));
}
function isOver() {
  return isWin() || wrong >= MAX_WRONG;
}

function focusInput() {
  // Don't auto-show the mobile keyboard — only open it when the user taps.
  hiddenInput.value = "";
}

// ---- Input wiring ----

// Keep the input empty after every keystroke so the next letter fires `input`.
hiddenInput.addEventListener("input", () => {
  const v = hiddenInput.value.toUpperCase();
  hiddenInput.value = "";
  for (const ch of v) {
    if (/[A-Z]/.test(ch)) guess(ch);
    if (isOver()) break;
  }
});

// Desktop support — catch physical keyboard too in case input isn't focused.
document.addEventListener("keydown", (e) => {
  if (e.key.length !== 1) return;
  if (document.activeElement === hiddenInput) return; // input handler takes over
  const l = e.key.toUpperCase();
  if (/[A-Z]/.test(l)) guess(l);
});

// Tapping the tried-strip / hint opens the keyboard on mobile
document.getElementById("input-zone").addEventListener("click", () => {
  hiddenInput.focus();
});

catBtn.addEventListener("click", () => {
  const lang = getLang();
  const cats = Object.keys(WORDS[lang]);
  const idx = cats.indexOf(categoryKey);
  categoryKey = cats[(idx + 1) % cats.length];
  newRound({ keepCategory: true });
});

document.getElementById("reset").addEventListener("click", () => newRound());

document.addEventListener("langchange", () => newRound());

newRound();
