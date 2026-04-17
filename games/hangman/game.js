// Hangman — 1+ players, offline word list (EN + ID + JW), 6 wrong guesses allowed.
// On-screen A–Z keyboard with hit/miss state baked into the keys. Desktop keydown
// still works so you can type instead of tapping.

import { storage } from "/shared/storage.js";
import { register, t, getLang } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";
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
  },
});

wireGameHead({
  titleEn: "Hangman",
  titleId: "Tebak Kata",
  subtitleKey: "hm.subtitle",
  rules: {
    en: `
      <h3>Goal</h3>
      <p>Guess the hidden word one letter at a time. Six wrong guesses and the figure is complete — game over.</p>
      <h3>Play</h3>
      <ul>
        <li>Tap letters on the on-screen keyboard — or type on your physical keyboard.</li>
        <li>Correct letters fill in; wrong letters add a body part to the gallows.</li>
        <li>Keys turn green for hits, red for misses, and are disabled once tried.</li>
        <li>Cycle categories (Animals, Food, Tech, Nature) with the <em>Change</em> button.</li>
        <li>Switch language to swap word lists (English ↔ Indonesian).</li>
      </ul>`,
    id: `
      <h3>Tujuan</h3>
      <p>Tebak kata tersembunyi satu huruf per giliran. Salah enam kali = tamat.</p>
      <h3>Cara main</h3>
      <ul>
        <li>Tap huruf di keyboard layar — atau ketik di keyboard fisik.</li>
        <li>Huruf benar terisi; huruf salah menambah bagian tubuh ke tiang.</li>
        <li>Tombol jadi hijau kalau kena, merah kalau meleset, dan mati setelah dicoba.</li>
        <li>Tukar kategori (Hewan, Makanan, Teknologi, Alam) lewat tombol <em>Ganti</em>.</li>
        <li>Ganti bahasa untuk ganti daftar kata (Indonesia ↔ Inggris).</li>
      </ul>`,
  },
});

const wordEl = document.getElementById("word");
const keyboardEl = document.getElementById("keyboard");
const catLabelEl = document.getElementById("cat-label");
const catBtn = document.getElementById("cat-change");
const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");

const RECENT_KEY = "hm:recent";
const MAX_WRONG = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

let target, guessed, wrong, categoryKey;

function wordLang() {
  const lang = getLang();
  return WORDS[lang] ? lang : "en";
}

function pickCategory() {
  const cats = Object.keys(WORDS[wordLang()]);
  return cats[Math.floor(Math.random() * cats.length)];
}

function pickWord(category) {
  const dict = WORDS[wordLang()];
  const bucket = dict[category] || Object.values(dict)[0];
  const recent = storage.get(RECENT_KEY, []);
  const pool = bucket.filter((w) => !recent.includes(w));
  const candidates = pool.length ? pool : bucket;
  const word = candidates[Math.floor(Math.random() * candidates.length)];
  const next = [word, ...recent].slice(0, Math.min(20, bucket.length - 1));
  storage.set(RECENT_KEY, next);
  return word;
}

function newRound({ keepCategory = false } = {}) {
  if (!keepCategory || !categoryKey || !WORDS[wordLang()][categoryKey]) {
    categoryKey = pickCategory();
  }
  target = pickWord(categoryKey);
  guessed = new Set();
  wrong = 0;
  statusEl.hidden = true;
  render();
}

function renderKeyboard() {
  const over = isOver();
  keyboardEl.innerHTML = ALPHABET.split("")
    .map((ch) => {
      let cls = "hm-key";
      if (guessed.has(ch)) {
        cls += target.includes(ch) ? " hit" : " miss";
      }
      const disabled = guessed.has(ch) || over ? "disabled" : "";
      return `<button type="button" class="${cls}" data-letter="${ch}" ${disabled}>${ch}</button>`;
    })
    .join("");
}

function render() {
  wordEl.innerHTML = target
    .split("")
    .map((ch) => {
      const shown = guessed.has(ch) || wrong >= MAX_WRONG;
      return `<span class="hm-letter${shown ? "" : " blank"}">${shown ? ch : "_"}</span>`;
    })
    .join("");

  renderKeyboard();

  document.querySelectorAll("#gallows .part").forEach((el, i) => {
    el.classList.toggle("on", i < wrong);
  });

  catLabelEl.textContent = `${t("hm.category")}: ${t("hm.cat_" + categoryKey)}`;
  catBtn.textContent = t("hm.change");

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
  }
}

function guess(letter) {
  if (isOver() || guessed.has(letter)) return;
  guessed.add(letter);
  const hit = target.includes(letter);
  if (!hit) wrong++;
  fx.play(hit ? "click" : "lose"); fx.haptic(hit ? "click" : "tap");
  render();
  if (isOver()) {
    if (isWin()) { fx.play("win"); fx.haptic("win"); }
    else { fx.play("lose"); fx.haptic("lose"); }
  }
}

function isWin() {
  return target.split("").every((ch) => guessed.has(ch));
}
function isOver() {
  return isWin() || wrong >= MAX_WRONG;
}

// ---- Input wiring ----

keyboardEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".hm-key");
  if (!btn || btn.disabled) return;
  guess(btn.dataset.letter);
});

// Desktop — physical keyboard still works.
document.addEventListener("keydown", (e) => {
  if (e.key.length !== 1) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const l = e.key.toUpperCase();
  if (/[A-Z]/.test(l)) guess(l);
});

catBtn.addEventListener("click", () => {
  const cats = Object.keys(WORDS[wordLang()]);
  const idx = cats.indexOf(categoryKey);
  categoryKey = cats[(idx + 1) % cats.length];
  newRound({ keepCategory: true });
});

document.getElementById("reset").addEventListener("click", () => newRound());

document.addEventListener("langchange", () => newRound());

newRound();
