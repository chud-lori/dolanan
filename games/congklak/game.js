// Congklak / Dakon — traditional Indonesian mancala.
//
// Board: 16 positions.
//   0–6:  Player 1's pits (bottom row, left to right)
//   7:    Player 1's store (right end)
//   8–14: Player 2's pits (top row, RIGHT to LEFT in display)
//   15:   Player 2's store (left end)
//
// Rules (standard Indonesian Congklak):
//   - 7 seeds per pit, stores start empty (total 98 seeds).
//   - Pick up all seeds from one of your pits, sow clockwise one at a time.
//   - Skip the opponent's store when sowing.
//   - Relay sowing: if your last seed lands in a non-empty pit, pick up
//     all seeds from that pit and continue sowing.
//   - If your last seed lands in your own store → extra turn.
//   - If your last seed lands in an empty pit on YOUR side → capture that
//     seed + all seeds from the opposite pit into your store. Turn ends.
//   - If your last seed lands in an empty pit on the OPPONENT's side →
//     turn ends (no capture).
//   - Game ends when one side is completely empty. The other player collects
//     all remaining seeds on their side. Most seeds in store wins.

import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";

register("cg", {
  en: {
    subtitle: "2 players · traditional Indonesian mancala",
    p1: "Player 1 (bottom)",
    p2: "Player 2 (top)",
    turn: "{p}'s turn",
    win: "{p} wins!",
    tie: "Tie!",
    pickPit: "Pick a pit to sow.",
    relay: "Relay — keep sowing!",
    capture: "Capture!",
    extraTurn: "Landed in store — go again!",
  },
  id: {
    subtitle: "2 pemain · congklak tradisional Indonesia",
    p1: "Pemain 1 (bawah)",
    p2: "Pemain 2 (atas)",
    turn: "Giliran {p}",
    win: "{p} menang!",
    tie: "Seri!",
    pickPit: "Pilih lubang untuk ditabur.",
    relay: "Lanjut menabur!",
    capture: "Tembak!",
    extraTurn: "Masuk rumah — giliran lagi!",
  },
});

wireGameHead({
  titleEn: "Congklak",
  titleId: "Congklak",
  subtitleKey: "cg.subtitle",
  rules: {
    en: `
      <h3>Board</h3>
      <p>7 pits per side, 1 store ("rumah") at each end. 7 seeds in every pit to start.</p>
      <h3>Your turn</h3>
      <ol>
        <li>Pick one of your pits (must have seeds).</li>
        <li>Pick up all seeds, drop one per hole going clockwise.</li>
        <li><strong>Skip</strong> the opponent's store — never put seeds there.</li>
      </ol>
      <h3>Relay sowing</h3>
      <p>If your last seed lands in a pit that already has seeds, pick them ALL up and keep sowing. This chain continues until your last seed lands in an empty hole or your store.</p>
      <h3>Capture ("tembak")</h3>
      <p>If your last seed lands in an <strong>empty pit on your side</strong>, you capture that seed + all seeds from the <strong>opposite pit</strong> on your opponent's side. All go into your store.</p>
      <h3>Extra turn</h3>
      <p>If your last seed lands in <strong>your own store</strong>, you get another turn.</p>
      <h3>End</h3>
      <p>When one side is empty, the other player collects all remaining seeds into their store. Most seeds wins.</p>`,
    id: `
      <h3>Papan</h3>
      <p>7 lubang per sisi, 1 rumah di ujung. Awal: 7 biji per lubang.</p>
      <h3>Giliranmu</h3>
      <ol>
        <li>Pilih satu lubang milikmu (harus ada biji).</li>
        <li>Ambil semua biji, taruh satu per lubang searah jarum jam.</li>
        <li><strong>Lewati</strong> rumah lawan — jangan taruh biji di sana.</li>
      </ol>
      <h3>Tabur berantai</h3>
      <p>Kalau biji terakhirmu jatuh di lubang yang sudah ada isinya, ambil SEMUA biji dari lubang itu dan terus tabur. Rantai ini berlanjut sampai biji terakhir jatuh di lubang kosong atau rumahmu.</p>
      <h3>Tembak</h3>
      <p>Kalau biji terakhir jatuh di <strong>lubang kosong di sisimu</strong>, kamu tembak: ambil biji itu + semua biji dari <strong>lubang di depannya</strong> (sisi lawan). Semua masuk rumahmu.</p>
      <h3>Giliran bonus</h3>
      <p>Kalau biji terakhir masuk <strong>rumahmu sendiri</strong>, kamu dapat giliran lagi.</p>
      <h3>Akhir</h3>
      <p>Saat satu sisi kosong, lawan kumpulkan sisa biji sisinya. Biji terbanyak di rumah menang.</p>`,
  },
});

// ---- Constants ----

const PITS = 7;
const SEEDS = 7;
const P1_PITS = [0, 1, 2, 3, 4, 5, 6];
const P1_STORE = 7;
const P2_PITS = [8, 9, 10, 11, 12, 13, 14];
const P2_STORE = 15;
const TOTAL = 16;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");
const turnDot = document.querySelector("#turn-pill .turn-dot");
const score1El = document.getElementById("score-1");
const score2El = document.getElementById("score-2");

// ---- State ----

let board, current, done, animating;

function pName(p) {
  return t(p === 1 ? "cg.p1" : "cg.p2");
}

function ownPits(p) { return p === 1 ? P1_PITS : P2_PITS; }
function ownStore(p) { return p === 1 ? P1_STORE : P2_STORE; }
function oppStore(p) { return p === 1 ? P2_STORE : P1_STORE; }

function oppositeIdx(i) {
  // Pit i's opposite: P1 pit 0 ↔ P2 pit 14, P1 pit 6 ↔ P2 pit 8
  return 14 - i;
}

// ---- Game logic ----

function newGame() {
  board = new Array(TOTAL).fill(0);
  for (let i = 0; i < PITS; i++) board[i] = SEEDS;
  for (let i = 8; i < 8 + PITS; i++) board[i] = SEEDS;
  current = 1;
  done = false;
  animating = false;
  statusEl.hidden = true;
  render();
}

function sideEmpty(player) {
  return ownPits(player).every((i) => board[i] === 0);
}

function collectRemaining() {
  for (const p of [1, 2]) {
    for (const i of ownPits(p)) {
      board[ownStore(p)] += board[i];
      board[i] = 0;
    }
  }
}

function checkEnd() {
  if (sideEmpty(1) || sideEmpty(2)) {
    collectRemaining();
    done = true;
    const s1 = board[P1_STORE], s2 = board[P2_STORE];
    if (s1 > s2) {
      statusEl.textContent = t("cg.win", { p: pName(1) });
      statusEl.className = "status-banner win";
    } else if (s2 > s1) {
      statusEl.textContent = t("cg.win", { p: pName(2) });
      statusEl.className = "status-banner win";
    } else {
      statusEl.textContent = t("cg.tie");
      statusEl.className = "status-banner draw";
    }
    statusEl.hidden = false;
    fx.play("win"); fx.haptic("win");
    return true;
  }
  return false;
}

/**
 * Execute one sowing pass starting from `pitIdx` for `player`.
 * Uses an async loop with small delays so the user can see seeds drop.
 */
async function sow(pitIdx, player) {
  animating = true;
  const skip = oppStore(player);
  let seeds = board[pitIdx];
  board[pitIdx] = 0;
  render();

  let pos = pitIdx;
  while (seeds > 0) {
    pos = (pos + 1) % TOTAL;
    if (pos === skip) continue;
    board[pos]++;
    seeds--;
    render();
    flashPit(pos);
    await sleep(80);
  }

  // Determine outcome
  const myStore = ownStore(player);
  const myPits = ownPits(player);

  if (pos === myStore) {
    // Landed in own store → extra turn (if game not over)
    fx.play("click"); fx.haptic("tap");
    if (!checkEnd()) {
      animating = false;
      render();
      return; // same player goes again
    }
  } else if (board[pos] > 1) {
    // Relay: landed in a non-empty pit → pick up and keep going
    fx.play("click"); fx.haptic("tap");
    await sleep(200);
    await sow(pos, player);
    return;
  } else if (board[pos] === 1 && myPits.includes(pos)) {
    // Capture: last seed in empty own pit
    const opp = oppositeIdx(pos);
    if (board[opp] > 0) {
      const captured = board[opp] + 1;
      board[pos] = 0;
      board[opp] = 0;
      board[myStore] += captured;
      fx.play("capture"); fx.haptic("capture");
      render();
      await sleep(300);
    }
    if (!checkEnd()) {
      current = current === 1 ? 2 : 1;
      animating = false;
      render();
    }
  } else {
    // Landed in opponent's pit (empty or not, but was already handled if >1)
    fx.play("place"); fx.haptic("tap");
    if (!checkEnd()) {
      current = current === 1 ? 2 : 1;
      animating = false;
      render();
    }
  }
  animating = false;
  render();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function flashPit(idx) {
  const el = boardEl.querySelector(`[data-idx="${idx}"]`);
  if (el) {
    el.classList.remove("drop-flash");
    void el.offsetWidth; // force reflow
    el.classList.add("drop-flash");
  }
}

// ---- Click handler ----

function onPitClick(idx) {
  if (done || animating) return;
  if (!ownPits(current).includes(idx)) return;
  if (board[idx] === 0) return;
  sow(idx, current);
}

// ---- Rendering ----

function renderSeedDots(count, max = 7) {
  const n = Math.min(count, max);
  return Array.from({ length: n }, () => '<span class="ck-seed"></span>').join("");
}

function render() {
  boardEl.innerHTML = "";

  // P2 store (left, spans both rows)
  const s2 = document.createElement("div");
  s2.className = "ck-store ck-store-p2";
  s2.dataset.idx = P2_STORE;
  s2.innerHTML = `<span class="ck-count">${board[P2_STORE]}</span>`;
  boardEl.appendChild(s2);

  // Top row: P2 pits 14→8 (right-to-left display = cols 2→8)
  for (let i = 0; i < PITS; i++) {
    const idx = 14 - i; // pit 14, 13, ..., 8
    const pit = document.createElement("button");
    pit.type = "button";
    pit.className = "ck-pit";
    pit.dataset.side = "2";
    pit.dataset.idx = idx;
    pit.style.gridColumn = String(i + 2);
    const seeds = board[idx];
    if (seeds === 0) pit.classList.add("empty");
    if (!done && !animating && current === 2 && seeds > 0) pit.classList.add("clickable");
    pit.innerHTML = `
      <span class="ck-count">${seeds}</span>
      <div class="ck-seeds">${renderSeedDots(seeds)}</div>`;
    pit.addEventListener("click", () => onPitClick(idx));
    boardEl.appendChild(pit);
  }

  // Bottom row: P1 pits 0→6 (left-to-right = cols 2→8)
  for (let i = 0; i < PITS; i++) {
    const idx = i;
    const pit = document.createElement("button");
    pit.type = "button";
    pit.className = "ck-pit";
    pit.dataset.side = "1";
    pit.dataset.idx = idx;
    pit.style.gridColumn = String(i + 2);
    const seeds = board[idx];
    if (seeds === 0) pit.classList.add("empty");
    if (!done && !animating && current === 1 && seeds > 0) pit.classList.add("clickable");
    pit.innerHTML = `
      <span class="ck-count">${seeds}</span>
      <div class="ck-seeds">${renderSeedDots(seeds)}</div>`;
    pit.addEventListener("click", () => onPitClick(idx));
    boardEl.appendChild(pit);
  }

  // P1 store (right, spans both rows)
  const s1 = document.createElement("div");
  s1.className = "ck-store ck-store-p1";
  s1.dataset.idx = P1_STORE;
  s1.innerHTML = `<span class="ck-count">${board[P1_STORE]}</span>`;
  boardEl.appendChild(s1);

  // Score + turn
  score1El.textContent = board[P1_STORE];
  score2El.textContent = board[P2_STORE];
  turnLabel.textContent = done ? "—" : t("cg.turn", { p: pName(current) });
  turnDot.className = "turn-dot " + (current === 1 ? "blue" : "yellow");
}

document.getElementById("reset").addEventListener("click", newGame);
document.addEventListener("langchange", render);

newGame();
