// Visual audit: open every page, take a mobile screenshot, and do a few
// meaningful interactions so we catch UI/UX bugs that text-only tests miss.
//
// Writes screenshots to scripts/audit/ .

import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://localhost:8765";
const OUT = fileURLToPath(new URL("./audit/", import.meta.url));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();

const notes = [];
function note(msg) {
  notes.push(msg);
  console.log(msg);
}

page.on("pageerror", (e) => note(`PAGEERROR: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") note(`CONSOLE: ${m.text()}`);
});

async function shot(name) {
  // Let CSS animations/transitions settle before capturing.
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

async function visit(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
}

// --- Hub ---
await visit("/");
await shot("01-hub-en");
await page.click('#lang-seg [data-lang="id"]');
await shot("02-hub-id");
await page.click('#lang-seg [data-lang="en"]');

// --- Tic-Tac-Toe: play a full round ---
await visit("/games/tictactoe/");
await shot("10-ttt-start");
for (const i of [4, 0, 3, 5, 2, 6]) {
  await page.locator(".ttt-board .cell").nth(i).click();
}
// position: X: 4,3,2  O: 0,5,6 — X wins diagonal? Let's just capture
await shot("11-ttt-midgame");

// --- Connect Four ---
await visit("/games/connect-four/");
await shot("20-c4-start");
// drop 4 in col 0 for red (with yellow in col 1 between)
for (const col of [0, 1, 0, 1, 0, 1, 0]) {
  await page.evaluate((col) => {
    const slots = document.querySelectorAll(".c4-slot");
    for (let r = 5; r >= 0; r--) {
      const s = slots[r * 7 + col];
      if (s && !s.disabled) { s.click(); return; }
    }
  }, col);
}
await shot("21-c4-red-wins");

// --- Checkers ---
await visit("/games/checkers/");
await shot("30-checkers-start");
// try clicking a red piece and see if hints appear
const ckSq = await page.$$(".ck-sq");
if (ckSq[50]) await ckSq[50].click(); // some red piece
await shot("31-checkers-selected");

// --- Chess ---
await visit("/games/chess/");
await shot("40-chess-start");
await page.locator(".ch-sq").nth(6 * 8 + 4).click(); // e2
await shot("41-chess-e2-selected");
await page.locator(".ch-sq").nth(4 * 8 + 4).click(); // e4
await shot("42-chess-after-e4");
await page.locator(".ch-sq").nth(1 * 8 + 4).click(); // e7 (black)
await page.locator(".ch-sq").nth(3 * 8 + 4).click(); // e5
await shot("43-chess-e7e5");

// --- Ludo ---
await visit("/games/ludo/");
await shot("50-ludo-setup");
await page.click('button[data-n="4"]');
await page.waitForTimeout(200);
await shot("51-ludo-play-initial");
await page.click("#roll");
await page.waitForTimeout(800);
await shot("52-ludo-after-roll");

// --- Werewolf ---
await visit("/games/werewolf/");
await shot("60-werewolf-setup");
await page.click("#start");
await page.waitForTimeout(200);
await shot("61-werewolf-pass");
await page.click(".ww-cover");
await page.waitForTimeout(200);
await shot("62-werewolf-reveal");

// --- Battleship ---
await visit("/games/battleship/");
await shot("70-battleship-cover");
await page.click(".bs-cover");
await page.waitForTimeout(200);
await shot("71-battleship-place");
// try to place the first ship at row 0 col 0
const first = await page.$(".bs-board .bs-cell");
if (first) await first.click();
await shot("72-battleship-ship-placed");

// --- Hangman ---
await visit("/games/hangman/");
await shot("80-hangman-start");
for (const l of "AEIOUT") {
  const k = await page.$(`.hm-key:has-text("${l}")`);
  if (k) await k.click();
}
await shot("81-hangman-some-guesses");

// --- Dots and Boxes ---
await visit("/games/dots-and-boxes/");
await shot("90-db-start");
// click a few edges
for (let i = 0; i < 4; i++) {
  await page.locator(".db-hit").nth(i * 3).click();
}
await shot("91-db-some-edges");

// --- Truth or Dare ---
await visit("/games/truth-or-dare/");
await shot("A0-td-setup");
await page.locator(".td-name-input").nth(0).fill("Alice");
await page.locator(".td-name-input").nth(1).fill("Bob");
await page.click("#start");
await page.waitForTimeout(200);
await shot("A1-td-pick");
await page.click("#truth");
await shot("A2-td-prompt");

await browser.close();
console.log(`\nWrote ${notes.length} notes to audit folder ${OUT}`);
