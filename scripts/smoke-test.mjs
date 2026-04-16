// Dolanan smoke test — uses the globally-installed Playwright to:
//   1. Boot iPhone-sized viewport
//   2. Load hub, assert all tiles render without 404
//   3. Visit each game, check:
//      - page loads without console errors
//      - no raw i18n keys ("btn.foo") visible
//      - primary controls respond
//      - body height doesn't overflow the viewport (games shouldn't scroll)
//   4. Plays one real round on representative games (Tic-Tac-Toe, Connect Four,
//      Hangman, Dots & Boxes) to validate interaction paths.
//
// Exit 0 on pass, 1 on fail. Prints a summary.

import { chromium, devices } from "playwright";

const BASE = process.env.BASE || "http://localhost:8765";
const VIEWPORT = devices["iPhone 13"]; // 390x844
const GAMES = [
  "tictactoe",
  "connect-four",
  "checkers",
  "chess",
  "ludo",
  "werewolf",
  "battleship",
  "hangman",
  "dots-and-boxes",
  "truth-or-dare",
];

const results = [];
function record(name, ok, details = "") {
  results.push({ name, ok, details });
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} ${name}${details ? " — " + details : ""}`);
}

function collectConsole(page, errors) {
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (url.startsWith(BASE)) errors.push(`404: ${url}`);
  });
}

async function check(page, path, assertFn) {
  const errors = [];
  collectConsole(page, errors);
  const url = `${BASE}${path}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  // Generic: no raw i18n keys should be visible
  const visibleText = await page.evaluate(() => document.body.innerText);
  const rawKeys = visibleText.match(/\b(btn|nav|hub|ttt|c4|ck|ch|lu|ww|hm|bs|db|td)\.\w+/g);
  if (rawKeys) {
    errors.push(`raw i18n keys surfaced: ${[...new Set(rawKeys)].join(", ")}`);
  }

  // Mobile scrollability: page scrollHeight vs viewport
  const overflow = await page.evaluate(() => {
    const docH = document.documentElement.scrollHeight;
    const winH = window.innerHeight;
    return { docH, winH, overflow: docH - winH };
  });

  if (assertFn) await assertFn({ page, errors, overflow });

  return { errors, overflow };
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...VIEWPORT });
  const page = await context.newPage();

  try {
    // ---- HUB ----
    {
      const { errors, overflow } = await check(page, "/", async ({ page }) => {
        const tiles = await page.$$(".game-tile");
        if (tiles.length !== GAMES.length) {
          throw new Error(`expected ${GAMES.length} tiles, got ${tiles.length}`);
        }
        // At least one icon img must be visible
        const iconVisible = await page.evaluate(() => {
          const img = document.querySelector(".tile-icon");
          return !!img && img.complete && img.naturalWidth > 0;
        });
        if (!iconVisible) throw new Error("tile icon not loaded");
      });
      record(`hub renders all ${GAMES.length} tiles`, errors.length === 0, errors.join(" | "));
      // hub is allowed to scroll — just note the overflow
      console.log(`    hub overflow: ${overflow.overflow}px`);
    }

    // ---- GAMES ----
    for (const slug of GAMES) {
      const { errors, overflow } = await check(page, `/games/${slug}/`);
      const ok = errors.length === 0;
      record(`${slug} loads clean`, ok, errors.join(" | "));
      // Only report scroll issue if significant (>24px allows for safe-area padding)
      if (overflow.overflow > 24) {
        console.log(`    ⚠ ${slug} scrolls ${overflow.overflow}px past viewport (docH ${overflow.docH} > winH ${overflow.winH})`);
      }
    }

    // ---- INTERACTIONS ----

    // Tic-Tac-Toe: click three cells in a winning line, expect status banner.
    // TTT re-renders each turn, so use .nth() locators which re-query.
    {
      await page.goto(`${BASE}/games/tictactoe/`);
      await page.waitForLoadState("networkidle");
      // X: 0, O: 3, X: 1, O: 4, X: 2 -> X wins top row
      for (const i of [0, 3, 1, 4, 2]) {
        await page.locator(".ttt-board .cell").nth(i).click();
      }
      const statusVisible = await page.isVisible("#status:not([hidden])");
      const statusText = await page.textContent("#status");
      record("ttt: X wins top row", statusVisible && /X|win|menang/i.test(statusText || ""),
        `status="${(statusText || "").trim()}"`);
    }

    // Connect Four: drop 4 in column 0, first player wins
    {
      await page.goto(`${BASE}/games/connect-four/`);
      await page.waitForLoadState("networkidle");
      // Only the lowest-empty cell per column is enabled; click whichever in target col.
      async function dropInCol(col) {
        // Query .c4-slot elements NOT disabled in this column
        const handle = await page.$(`.c4-slot:nth-child(7n+${col + 1}):not(:disabled)`);
        if (handle) { await handle.click(); return; }
        // Fallback: enable the click via evaluate
        await page.evaluate((col) => {
          const slots = document.querySelectorAll(".c4-slot");
          for (let r = 5; r >= 0; r--) {
            const s = slots[r * 7 + col];
            if (s && !s.disabled) { s.click(); return; }
          }
        }, col);
      }
      for (const col of [0, 1, 0, 1, 0, 1, 0]) await dropInCol(col);
      const statusText = (await page.textContent("#status"))?.trim() || "";
      record("c4: vertical win in col 0", /win|menang/i.test(statusText), `status="${statusText}"`);
    }

    // Hangman: now uses a hidden <input>; type letters via the page keyboard.
    {
      await page.goto(`${BASE}/games/hangman/`);
      await page.waitForLoadState("networkidle");
      // Focus the hidden input that captures keystrokes
      await page.focus("#guess-input");
      for (const l of "AEIOULNRTSMBCDFGHJKPQVWXYZ") {
        await page.keyboard.type(l);
        const over = await page.isVisible("#status:not([hidden])");
        if (over) break;
      }
      const status = (await page.textContent("#status"))?.trim() || "";
      record("hangman: reaches end state", status.length > 0, `status="${status}"`);
    }

    // Dots and Boxes: click any edge and confirm stroke appears
    {
      await page.goto(`${BASE}/games/dots-and-boxes/`);
      await page.waitForLoadState("networkidle");
      const hit = await page.$(".db-hit");
      if (hit) await hit.click();
      const hasOwned = await page.evaluate(
        () => document.querySelectorAll(".db-edge.p1, .db-edge.p2").length > 0,
      );
      record("dots-and-boxes: edge claim renders", hasOwned);
    }

    // Chess: open, move a pawn (e2→e4), confirm turn flips to black
    {
      await page.goto(`${BASE}/games/chess/`);
      await page.waitForLoadState("networkidle");
      // Square at (6, 4) is white pawn e2. (4, 4) is e4.
      const idx = (r, c) => r * 8 + c;
      await page.locator(".ch-sq").nth(idx(6, 4)).click();
      await page.locator(".ch-sq").nth(idx(4, 4)).click();
      const turnText = (await page.textContent("#turn-label"))?.trim() || "";
      record("chess: e2-e4 passes turn to black", /Black|Hitam/i.test(turnText),
        `turn="${turnText}"`);
    }

    // Ludo: pick 2 players, roll the dice, assert hint updates
    {
      await page.goto(`${BASE}/games/ludo/`);
      await page.waitForLoadState("networkidle");
      await page.click('button[data-n="2"]');
      await page.click("#roll");
      await page.waitForTimeout(700); // let animateRoll finish
      const hintText = (await page.textContent("#dice-hint"))?.trim() || "";
      record("ludo: roll produces a hint message",
        hintText.length > 0 && hintText !== "Tap roll to start.",
        `hint="${hintText}"`);
    }

    // Truth-or-Dare: fill names → start → pick truth → prompt shown
    {
      const freshCtx = await browser.newContext({ ...VIEWPORT });
      const tdPage = await freshCtx.newPage();
      await tdPage.goto(`${BASE}/games/truth-or-dare/`);
      await tdPage.waitForLoadState("networkidle");
      // Use locators (auto-retrying, always fresh) instead of handles
      await tdPage.locator(".td-name-input").nth(0).fill("Alice");
      await tdPage.locator(".td-name-input").nth(1).fill("Bob");
      await tdPage.click("#start");
      await tdPage.waitForSelector("#truth");
      await tdPage.click("#truth");
      await tdPage.waitForSelector(".td-prompt");
      const prompt = (await tdPage.textContent(".td-prompt"))?.trim() || "";
      record("td: truth prompt appears", prompt.length > 10, `prompt="${prompt.slice(0, 40)}…"`);
      await freshCtx.close();
    }

    // Werewolf: setup flow + verify each in-game screen fits the viewport
    {
      await page.goto(`${BASE}/games/werewolf/`);
      await page.waitForLoadState("networkidle");
      const beforeTotal = await page.textContent("#v-total");
      await page.click('[data-step="total+"]');
      const afterTotal = await page.textContent("#v-total");
      record("werewolf: total-players stepper works", Number(afterTotal) === Number(beforeTotal) + 1,
        `${beforeTotal} → ${afterTotal}`);

      // Start the game and walk through the reveal + night screens, checking each fits.
      // Reset to default 6 players.
      await page.click('[data-step="total-"]');
      await page.click("#start");

      // Reveal cover screen
      let height = await page.evaluate(() => document.documentElement.scrollHeight);
      let winH = await page.evaluate(() => window.innerHeight);
      record("werewolf: pass-device cover fits viewport", height <= winH + 24,
        `docH ${height} vs winH ${winH}`);

      // Tap cover → role reveal for player 1
      await page.click(".ww-cover");
      height = await page.evaluate(() => document.documentElement.scrollHeight);
      record("werewolf: role reveal fits viewport", height <= winH + 24,
        `docH ${height} vs winH ${winH}`);

      // Walk through all 6 reveals
      for (let i = 0; i < 6; i++) {
        if (await page.isVisible("#next")) {
          await page.click("#next");
        }
        if (await page.isVisible(".ww-cover")) {
          await page.click(".ww-cover");
        }
      }

      // Night intro
      if (await page.isVisible("#go")) {
        height = await page.evaluate(() => document.documentElement.scrollHeight);
        record("werewolf: night intro fits viewport", height <= winH + 24,
          `docH ${height} vs winH ${winH}`);
        await page.click("#go");
      }

      // Werewolves pick (list of players)
      if (await page.isVisible(".ww-player-btn")) {
        height = await page.evaluate(() => document.documentElement.scrollHeight);
        // Player lists of 6 names can legitimately be taller; budget +80px
        record("werewolf: night picker within reasonable budget",
          height <= winH + 80, `docH ${height} vs winH ${winH}`);
      }
    }

    // Dots and Boxes: cycle board size
    {
      await page.goto(`${BASE}/games/dots-and-boxes/`);
      await page.waitForLoadState("networkidle");
      const before = (await page.textContent("#size-btn"))?.trim();
      await page.click("#size-btn");
      const after = (await page.textContent("#size-btn"))?.trim();
      record("dots-and-boxes: size cycle", before !== after, `${before} → ${after}`);
    }

    // Language toggle: flip and confirm hub heading changes to ID string
    {
      await page.goto(`${BASE}/`);
      await page.waitForLoadState("networkidle");
      const before = await page.textContent("#games-heading");
      await page.click('#lang-seg [data-lang="id"]');
      const after = await page.textContent("#games-heading");
      record("lang toggle switches hub heading", before !== after && /Game|Permainan|Games/.test(after || ""),
        `"${before}" → "${after}"`);
    }

    // Lang toggle in-game (chess): confirm Indonesian strings show
    {
      await page.goto(`${BASE}/games/chess/`);
      await page.waitForLoadState("networkidle");
      // setLang stored as "id" from previous test; verify it applied
      const title = (await page.textContent(".game-title"))?.trim();
      const newGameBtn = (await page.textContent("#reset"))?.trim();
      record("game pages respect saved language",
        /Catur/.test(title || "") && /Main (lagi|baru)/i.test(newGameBtn || ""),
        `title="${title}" btn="${newGameBtn}"`);
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log("  -", f.name, f.details || "");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
