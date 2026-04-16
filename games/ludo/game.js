// Ludo — 2–4 players. Traditional cross-shaped board on a 15×15 grid.
//
// Rules implemented (standard Parcheesi / Ludo rules):
//   - 4 tokens per player, start in the home base (pos = -1).
//   - Roll a 6 to release a token onto the entry square.
//   - Tokens travel 51 squares clockwise, then turn into their private
//     6-square home column, then one final step onto the finish.
//   - Capture: landing on a cell occupied by a single opponent token sends
//     that token back to home. Safe squares (entry squares + "stars") block
//     captures.
//   - Rolling a 6 or capturing grants an extra roll.
//   - Three 6s in a row forfeits the turn.
//   - Same-colour tokens cannot share a square.
//   - Exact roll required to land on the finish.
//   - Win when all four tokens finish.

import { animateRoll, renderFace } from "/shared/dice.js";
import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";

register("lu", {
  en: {
    subtitle: "2–4 players · roll 6 to enter · race home",
    red: "Red", green: "Green", yellow: "Yellow", blue: "Blue",
    turn: "{p}'s turn",
    win: "{p} wins!",
    hintTap: "Tap Roll to start.",
    hintPick: "Rolled {n} — pick a token to move.",
    hintNoMove6: "No move possible. Roll again next turn.",
    hintNoMove: "Rolled {n} — no move possible.",
    hintForfeit: "Three 6s in a row — turn forfeited.",
    hintSix: "Rolled a 6 — roll again!",
    hintCapture: "Capture! Roll again.",
  },
  id: {
    subtitle: "2–4 pemain · kocok 6 untuk keluar · balap ke rumah",
    red: "Merah", green: "Hijau", yellow: "Kuning", blue: "Biru",
    turn: "Giliran {p}",
    win: "{p} menang!",
    hintTap: "Tekan Kocok untuk mulai.",
    hintPick: "Dapat {n} — pilih bidak yang mau digerakkan.",
    hintNoMove6: "Tidak bisa jalan. Kocok lagi giliran depan.",
    hintNoMove: "Dapat {n} — tidak ada yang bisa jalan.",
    hintForfeit: "Tiga kali 6 — giliran hangus.",
    hintSix: "Dapat 6 — kocok lagi!",
    hintCapture: "Makan lawan! Kocok lagi.",
  },
});

wireGameHead({
  titleEn: "Ludo",
  titleId: "Ludo",
  subtitleKey: "lu.subtitle",
  rules: {
    en: `
      <h3>Goal</h3>
      <p>Be the first to bring all four of your tokens around the board and into the center.</p>
      <h3>Movement</h3>
      <ul>
        <li>Roll a <strong>6</strong> to release a token from your home base.</li>
        <li>Tokens travel clockwise around the 52-cell track, then turn into your colored home column toward the center.</li>
        <li>Exact roll required to land on the finish.</li>
      </ul>
      <h3>Capture & safety</h3>
      <ul>
        <li>Land on an opponent's token to send it back to their home base.</li>
        <li><strong>Safe squares</strong> (entry squares + star squares) cannot be captured on.</li>
        <li>Two of your own tokens can't share a cell.</li>
      </ul>
      <h3>Bonus rolls</h3>
      <ul>
        <li>Rolling a 6 → roll again.</li>
        <li>Capturing → roll again.</li>
        <li>Three 6s in a row → turn forfeited.</li>
      </ul>`,
    id: `
      <h3>Tujuan</h3>
      <p>Bawa keempat bidakmu keliling papan ke tengah duluan.</p>
      <h3>Gerakan</h3>
      <ul>
        <li>Kocok <strong>6</strong> untuk keluarkan bidak dari home base.</li>
        <li>Bidak jalan searah jarum jam di 52 kotak track, lalu masuk ke jalur warna sendiri menuju tengah.</li>
        <li>Wajib kocok angka pas buat sampai finish.</li>
      </ul>
      <h3>Makan & aman</h3>
      <ul>
        <li>Mendarat di kotak bidak lawan = lawan balik ke home base.</li>
        <li><strong>Kotak aman</strong> (entry + bintang) tidak bisa dimakan.</li>
        <li>Dua bidak warna sama tidak bisa di kotak yang sama.</li>
      </ul>
      <h3>Bonus kocok</h3>
      <ul>
        <li>Dapat 6 → kocok lagi.</li>
        <li>Makan lawan → kocok lagi.</li>
        <li>Tiga kali 6 berturut → giliran hangus.</li>
      </ul>`,
  },
});

// ---- Constants -------------------------------------------------------------

const COLORS = ["R", "B", "Y", "G"]; // clockwise starting from red
const COLOR_KEY = { R: "lu.red", B: "lu.blue", Y: "lu.yellow", G: "lu.green" };
const COLOR_DOT = { R: "red", B: "blue", Y: "yellow", G: "green" };

const TRACK_LEN = 52;
const HOME_LEN = 6;

// Clockwise entry offsets around the 52-cell track.
const ENTRY = { R: 0, B: 13, Y: 26, G: 39 };

// 52-cell track. Index 0 = red entry; path goes clockwise.
const TRACK = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],           // left-arm top row (0-4)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],   // top-arm left col (5-10)
  [0, 7], [0, 8],                                    // top corner (11-12)
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],           // top-arm right col (13-17)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // right-arm top row (18-23)
  [7, 14], [8, 14],                                  // right corner (24-25)
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],       // right-arm bottom row (26-30)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // bottom-arm right col (31-36)
  [14, 7], [14, 6],                                  // bottom corner (37-38)
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],       // bottom-arm left col (39-43)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],   // left-arm bottom row (44-49)
  [7, 0], [6, 0],                                    // left corner (50-51)
];

// 6-cell home column per colour (from track edge toward the center).
const HOME_COL = {
  R: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  B: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  Y: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  G: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
};

// Where finished tokens land (center triangle cells).
const FINISH_CELL = { R: [7, 7], B: [7, 7], Y: [7, 7], G: [7, 7] };

// Home base starting positions (4 per colour, inside each 6x6 corner).
const BASE_CELLS = {
  R: [[1, 1], [1, 4], [4, 1], [4, 4]],
  B: [[1, 10], [1, 13], [4, 10], [4, 13]],
  Y: [[10, 10], [10, 13], [13, 10], [13, 13]],
  G: [[10, 1], [10, 4], [13, 1], [13, 4]],
};

// "Safe" absolute track indices. The 4 entry squares + 4 star squares
// (traditionally 8 cells after each entry, halfway around the arm).
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// ---- DOM references --------------------------------------------------------

const setupEl = document.getElementById("setup");
const playEl = document.getElementById("play");
const boardEl = document.getElementById("board");
const dieEl = document.getElementById("die");
const rollBtn = document.getElementById("roll");
const hintEl = document.getElementById("dice-hint");
const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");
const turnDot = document.querySelector("#turn-pill .turn-dot");

// ---- Game state ------------------------------------------------------------

let state;

function newGame(n) {
  const colors = COLORS.slice(0, n);
  state = {
    colors,
    players: Object.fromEntries(
      colors.map((c) => [c, { tokens: [-1, -1, -1, -1] }]),
    ),
    turnIdx: 0,
    roll: null,
    sixesInRow: 0,
    rolledThisTurn: false,
    done: false,
  };
  renderFace(dieEl, 1);
  setupEl.hidden = true;
  playEl.hidden = false;
  statusEl.hidden = true;
  document.getElementById("turn-pill").hidden = false;
  hintEl.textContent = t("lu.hintTap");
  render();
}

const currentColor = () => state.colors[state.turnIdx];

function absIndex(color, pos) {
  if (pos < 0 || pos >= TRACK_LEN) return null;
  return (ENTRY[color] + pos) % TRACK_LEN;
}

function sameCellAsOwnToken(color, tokenIdx, pos) {
  // Can't land on a cell already occupied by one of your own tokens.
  const t = state.players[color].tokens;
  if (pos < 0 || pos > TRACK_LEN + HOME_LEN) return false;
  return t.some((p, i) => i !== tokenIdx && p === pos);
}

function movableTokens(color, roll) {
  const out = [];
  const tokens = state.players[color].tokens;
  for (let i = 0; i < 4; i++) {
    const p = tokens[i];
    if (p === TRACK_LEN + HOME_LEN) continue; // already finished
    if (p === -1) {
      if (roll === 6) {
        // Can only come out if entry square is free of own tokens
        if (!sameCellAsOwnToken(color, i, 0)) out.push(i);
      }
      continue;
    }
    if (p < TRACK_LEN) {
      // On main track
      const distanceToHome = TRACK_LEN - 1 - p;
      if (roll <= distanceToHome) {
        const candidatePos = p + roll;
        if (!sameCellAsOwnToken(color, i, candidatePos)) out.push(i);
      } else {
        const intoHome = roll - distanceToHome - 1;
        if (intoHome < HOME_LEN) {
          const pos = TRACK_LEN + intoHome;
          if (!sameCellAsOwnToken(color, i, pos)) out.push(i);
        } else if (intoHome === HOME_LEN) {
          out.push(i); // exact finish
        }
      }
    } else {
      // In home column
      const candidate = p + roll;
      if (candidate === TRACK_LEN + HOME_LEN) out.push(i);
      else if (candidate < TRACK_LEN + HOME_LEN &&
               !sameCellAsOwnToken(color, i, candidate)) out.push(i);
    }
  }
  return out;
}

function moveToken(color, tokenIdx, roll) {
  const tokens = state.players[color].tokens;
  const p = tokens[tokenIdx];
  let newPos;
  if (p === -1) newPos = 0;
  else if (p < TRACK_LEN) {
    const distanceToHome = TRACK_LEN - 1 - p;
    if (roll <= distanceToHome) newPos = p + roll;
    else {
      const intoHome = roll - distanceToHome - 1;
      newPos = intoHome === HOME_LEN ? TRACK_LEN + HOME_LEN : TRACK_LEN + intoHome;
    }
  } else {
    const candidate = p + roll;
    newPos = candidate === TRACK_LEN + HOME_LEN
      ? TRACK_LEN + HOME_LEN
      : candidate;
  }
  tokens[tokenIdx] = newPos;

  // Capture — only on the main track, only on non-safe cells.
  let captured = false;
  if (newPos >= 0 && newPos < TRACK_LEN) {
    const absTarget = absIndex(color, newPos);
    if (!SAFE.has(absTarget)) {
      for (const other of state.colors) {
        if (other === color) continue;
        const oTokens = state.players[other].tokens;
        for (let j = 0; j < 4; j++) {
          if (oTokens[j] >= 0 && oTokens[j] < TRACK_LEN) {
            if (absIndex(other, oTokens[j]) === absTarget) {
              oTokens[j] = -1;
              captured = true;
            }
          }
        }
      }
    }
  }

  if (captured) { fx.play("capture"); fx.haptic("capture"); }
  else { fx.play("place"); fx.haptic("tap"); }

  // Win check
  if (tokens.every((tp) => tp === TRACK_LEN + HOME_LEN)) {
    state.done = true;
    statusEl.textContent = t("lu.win", { p: t(COLOR_KEY[color]) });
    statusEl.className = "status-banner win";
    statusEl.hidden = false;
    fx.play("win"); fx.haptic("win");
  }
  return { captured, newPos };
}

function endTurn() {
  state.roll = null;
  state.rolledThisTurn = false;
  state.sixesInRow = 0;
  state.turnIdx = (state.turnIdx + 1) % state.colors.length;
  render();
}

async function doRoll() {
  if (state.done || state.rolledThisTurn) return;
  rollBtn.disabled = true;
  state.rolledThisTurn = true;
  const face = 1 + Math.floor(Math.random() * 6);
  fx.play("roll"); fx.haptic("roll");
  await animateRoll(dieEl, face, 500);
  state.roll = face;
  if (face === 6) state.sixesInRow++;
  else state.sixesInRow = 0;

  if (state.sixesInRow >= 3) {
    hintEl.textContent = t("lu.hintForfeit");
    setTimeout(() => endTurn(), 800);
    return;
  }

  const movable = movableTokens(currentColor(), face);
  if (movable.length === 0) {
    hintEl.textContent = face === 6
      ? t("lu.hintNoMove6")
      : t("lu.hintNoMove", { n: face });
    setTimeout(() => endTurn(), 800);
    return;
  }
  hintEl.textContent = t("lu.hintPick", { n: face });
  render();
}

function onTokenClick(color, idx) {
  if (state.done) return;
  if (color !== currentColor()) return;
  if (!state.rolledThisTurn) return;
  const movable = movableTokens(color, state.roll);
  if (!movable.includes(idx)) return;

  const { captured } = moveToken(color, idx, state.roll);
  if (state.done) {
    render();
    return;
  }
  const rolledSix = state.roll === 6;
  const bonus = rolledSix || captured;
  if (bonus) {
    hintEl.textContent = rolledSix ? t("lu.hintSix") : t("lu.hintCapture");
    state.rolledThisTurn = false;
    state.roll = null;
    rollBtn.disabled = false;
    render();
  } else {
    endTurn();
  }
}

// ---- Rendering -------------------------------------------------------------

/**
 * Rebuild the 15×15 grid with coloured bases, cross tracks, home columns,
 * and the center triangles. Overlay tokens at their current positions.
 */
function render() {
  boardEl.innerHTML = "";
  const movable = (!state.done && state.rolledThisTurn)
    ? new Set(movableTokens(currentColor(), state.roll))
    : new Set();

  // Map each (row, col) to a class list for its role.
  const cellClass = buildCellClassMap();

  // Index token stacks by position key so multiples can render side-by-side.
  const cellEntries = new Map(); // key "r,c" -> [{color, idx, role}]
  const putToken = (r, c, entry) => {
    const key = `${r},${c}`;
    if (!cellEntries.has(key)) cellEntries.set(key, []);
    cellEntries.get(key).push(entry);
  };
  for (const color of state.colors) {
    const tokens = state.players[color].tokens;
    for (let i = 0; i < 4; i++) {
      const pos = tokens[i];
      const [r, c] = cellForPos(color, i, pos);
      putToken(r, c, { color, idx: i, movable: color === currentColor() && movable.has(i) });
    }
  }

  // Build the 225 cells.
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const cell = document.createElement("div");
      cell.className = "lu-cell " + (cellClass[`${r},${c}`] || "");
      cell.dataset.r = r;
      cell.dataset.c = c;

      // Tokens in this cell
      const tokens = cellEntries.get(`${r},${c}`) || [];
      tokens.forEach((tok, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "lu-tok " + tok.color + (tok.movable ? " movable" : "");
        if (tokens.length > 1) {
          // stack with small offset
          el.style.transform = `translate(${(i - (tokens.length - 1) / 2) * 16}%, ${(i - (tokens.length - 1) / 2) * 10}%)`;
        }
        if (tok.movable) {
          el.addEventListener("click", () => onTokenClick(tok.color, tok.idx));
        } else {
          el.disabled = true;
        }
        el.setAttribute("aria-label", `${t(COLOR_KEY[tok.color])} token ${tok.idx + 1}`);
        cell.appendChild(el);
      });

      boardEl.appendChild(cell);
    }
  }

  // Active-base highlight overlays — a glowing frame around the home base
  // of whoever's turn it is. One overlay per color, positioned via CSS grid.
  for (const color of ["R", "B", "G", "Y"]) {
    const overlay = document.createElement("div");
    overlay.className = "lu-base-overlay";
    overlay.dataset.color = color;
    if (!state.done && color === currentColor()) overlay.classList.add("active");
    boardEl.appendChild(overlay);
  }

  // Status pill
  turnLabel.textContent = state.done
    ? "—"
    : t("lu.turn", { p: t(COLOR_KEY[currentColor()]) });
  turnDot.className = "turn-dot " + COLOR_DOT[currentColor()];
  rollBtn.disabled = state.done || state.rolledThisTurn;
}

function cellForPos(color, tokenIdx, pos) {
  if (pos === -1) return BASE_CELLS[color][tokenIdx];
  if (pos === TRACK_LEN + HOME_LEN) return FINISH_CELL[color];
  if (pos < TRACK_LEN) {
    const abs = absIndex(color, pos);
    return TRACK[abs];
  }
  return HOME_COL[color][pos - TRACK_LEN];
}

function buildCellClassMap() {
  const map = {};
  // Bases — every cell in the 6×6 corner is solid color. The 4 token-rest
  // positions get an extra `lu-base-spot` modifier that draws a white
  // circle so tokens have a clear seat to sit on.
  const baseRanges = [
    { color: "R", r0: 0, c0: 0 },
    { color: "B", r0: 0, c0: 9 },
    { color: "Y", r0: 9, c0: 9 },
    { color: "G", r0: 9, c0: 0 },
  ];
  for (const { color, r0, c0 } of baseRanges) {
    for (let r = r0; r < r0 + 6; r++) {
      for (let c = c0; c < c0 + 6; c++) {
        map[`${r},${c}`] = `lu-base ${color}`;
      }
    }
    for (const [r, c] of BASE_CELLS[color]) {
      map[`${r},${c}`] += " lu-base-spot";
    }
  }
  // Track
  for (let i = 0; i < TRACK.length; i++) {
    const [r, c] = TRACK[i];
    let cls = "lu-track";
    if (SAFE.has(i)) cls += " safe";
    if (i === ENTRY.R) cls += " entry-R";
    else if (i === ENTRY.B) cls += " entry-B";
    else if (i === ENTRY.Y) cls += " entry-Y";
    else if (i === ENTRY.G) cls += " entry-G";
    map[`${r},${c}`] = cls;
  }
  // Home columns
  for (const color of ["R", "G", "B", "Y"]) {
    for (const [r, c] of HOME_COL[color]) {
      map[`${r},${c}`] = `lu-home-col ${color}`;
    }
  }
  // Center 3x3
  const centers = [
    { r: 6, c: 6, cls: "lu-center R" },
    { r: 6, c: 8, cls: "lu-center B" },
    { r: 8, c: 8, cls: "lu-center Y" },
    { r: 8, c: 6, cls: "lu-center G" },
    { r: 7, c: 7, cls: "lu-center mid" },
  ];
  for (const c of centers) map[`${c.r},${c.c}`] = c.cls;

  return map;
}

// ---- Wiring ---------------------------------------------------------------

setupEl.querySelectorAll("button[data-n]").forEach((btn) => {
  btn.addEventListener("click", () => newGame(Number(btn.dataset.n)));
});
rollBtn.addEventListener("click", doRoll);

document.getElementById("reset").addEventListener("click", () => {
  setupEl.hidden = false;
  playEl.hidden = true;
  statusEl.hidden = true;
  document.getElementById("turn-pill").hidden = true;
});

document.addEventListener("langchange", () => {
  if (!playEl.hidden) render();
  if (!state?.rolledThisTurn) hintEl.textContent = t("lu.hintTap");
});

// Show setup on load
setupEl.hidden = false;
playEl.hidden = true;
