// Halma — two variants share this file:
//
//   CLASSICAL (1883 original, known internationally):
//     2 players on a 16×16 square grid. 19 pieces per side in triangular
//     corner camps. Step or jump to any of 8 adjacent directions.
//
//   STAR (Chinese Checkers — commonly sold as "Halma" in Indonesia):
//     2 / 3 / 4 / 6 players on a six-pointed star (triangular lattice).
//     10 pieces per triangle. Step or jump to any of 6 hex directions.
//
// Shared rules across both variants:
//   • Step: move one piece to an adjacent empty cell.
//   • Jump: hop over an adjacent piece (any color) into the empty cell
//     directly beyond. Multi-jumps allowed — keep jumping with the same
//     piece or end the turn with "End jump".
//   • No captures.
//   • Win: be first to fill the opposite starting triangle.

import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";
import { enableDrag } from "/shared/drag.js";

register("hl", {
  en: {
    subtitle: "Step or jump · fill the far corner",
    red: "Red", blue: "Blue", green: "Green", yellow: "Yellow", purple: "Purple", orange: "Orange",
    turn: "{p}'s turn",
    win: "{p} wins!",
    keepJumping: "Keep jumping or tap End jump.",
    endJump: "End jump",
    pickVariant: "Pick a variant",
    classical2: "Classical · 2 players",
    starHeading: "Star (Indonesian)",
  },
  id: {
    subtitle: "Jalan atau loncat · isi sudut seberang",
    red: "Merah", blue: "Biru", green: "Hijau", yellow: "Kuning", purple: "Ungu", orange: "Jingga",
    turn: "Giliran {p}",
    win: "{p} menang!",
    keepJumping: "Lanjut loncat atau tekan Selesai loncat.",
    endJump: "Selesai loncat",
    pickVariant: "Pilih varian",
    classical2: "Klasik · 2 pemain",
    starHeading: "Bintang (Indonesia)",
  },
  jw: {
    subtitle: "Mlaku utawa mlumpat · kebak sudut sebrang",
    red: "Abang", blue: "Biru", green: "Ijo", yellow: "Kuning", purple: "Ungu", orange: "Jingga",
    turn: "Giliran {p}",
    win: "{p} menang!",
    keepJumping: "Terusna mlumpat utawa pencet Mari mlumpat.",
    endJump: "Mari mlumpat",
    pickVariant: "Pilih variasi",
    classical2: "Klasik · 2 pemain",
    starHeading: "Bintang (Indonesia)",
  },
});

wireGameHead({
  titleEn: "Halma",
  titleId: "Halma",
  subtitleKey: "hl.subtitle",
  rules: {
    en: `
      <h3>Two variants</h3>
      <p><strong>Classical</strong> — 2 players, square 16×16 board, 19 pieces per side.</p>
      <p><strong>Star</strong> — 2–6 players, six-pointed star board, 10 pieces per triangle. Known in Indonesia as "Halma" (internationally called Chinese Checkers).</p>
      <h3>Movement (both variants)</h3>
      <ul>
        <li><strong>Step</strong> — move one piece into an adjacent empty cell.</li>
        <li><strong>Jump</strong> — leap over an adjacent piece (your own or opponent's) into the empty cell directly beyond. Chain multiple jumps with the same piece.</li>
        <li>No captures — pieces stay on the board.</li>
        <li>Mid-chain, tap <em>End jump</em> to commit, or keep jumping.</li>
      </ul>
      <h3>Goal</h3>
      <p>Be the first to fill the opposite starting triangle with your pieces.</p>`,
    id: `
      <h3>Dua varian</h3>
      <p><strong>Klasik</strong> — 2 pemain, papan kotak 16×16, 19 bidak per sisi.</p>
      <p><strong>Bintang</strong> — 2–6 pemain, papan bintang bersudut enam, 10 bidak per segitiga. Di Indonesia dikenal sebagai "Halma" (internasional: Chinese Checkers).</p>
      <h3>Gerakan (kedua varian)</h3>
      <ul>
        <li><strong>Jalan</strong> — pindahkan bidak ke kotak tetangga yang kosong.</li>
        <li><strong>Loncat</strong> — lompati bidak tetangga (sendiri atau lawan) ke kotak kosong tepat di seberangnya. Bisa loncat berantai dengan bidak yang sama.</li>
        <li>Tidak ada makan — semua bidak tetap di papan.</li>
        <li>Di tengah rantai loncat, tekan <em>Selesai loncat</em> untuk mengakhiri, atau terus loncat.</li>
      </ul>
      <h3>Tujuan</h3>
      <p>Isi segitiga awal lawan di sisi seberang dengan bidakmu duluan.</p>`,
    jw: `
      <h3>Loro variasi</h3>
      <p><strong>Klasik</strong> — 2 pemain, papan kothak 16×16, 19 bidak saben sisi.</p>
      <p><strong>Bintang</strong> — 2–6 pemain, papan bintang enem pucuk, 10 bidak saben segitiga.</p>
      <h3>Gerakan</h3>
      <ul>
        <li><strong>Mlaku</strong> — pindhah bidak menyang kothak jejer sing kosong.</li>
        <li><strong>Mlumpat</strong> — mlumpati bidak jejer menyang kothak kosong ing sebrang. Bisa nyambung mlumpat.</li>
        <li>Ora ana mati — kabeh bidak tetep ana papan.</li>
      </ul>`,
  },
});

// ============================================================================
// CLASSICAL (square 16×16, 19-piece corner camps, 2 players)
// ============================================================================

const CL_N = 16;
const CL_RED_HOME = [
  [11,0],[11,1],
  [12,0],[12,1],[12,2],
  [13,0],[13,1],[13,2],[13,3],
  [14,0],[14,1],[14,2],[14,3],[14,4],
  [15,0],[15,1],[15,2],[15,3],[15,4],
];
const CL_BLUE_HOME = CL_RED_HOME.map(([r, c]) => [CL_N - 1 - r, CL_N - 1 - c]);
const CL_RED_ZONE = new Set(CL_RED_HOME.map(([r, c]) => `${r},${c}`));
const CL_BLUE_ZONE = new Set(CL_BLUE_HOME.map(([r, c]) => `${r},${c}`));
const CL_DIRS = [
  [-1,-1],[-1,0],[-1,1],
  [ 0,-1],       [ 0,1],
  [ 1,-1],[ 1,0],[ 1,1],
];

// ============================================================================
// STAR (triangular lattice, 17 rows, 121 positions)
// Coordinates: (r, gc) where r ∈ 0..16 and gc is the "grid column" in a
// 25-wide half-cell lattice. Cells in the same row are 2 gc apart; adjacent
// rows are offset by 1 gc (pointy-top hex). Widest row is 13 cells.
// ============================================================================

// Row widths: 1,2,3,4, 13,12,11,10, 9, 10,11,12,13, 4,3,2,1
const ST_ROW_CELLS = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1];

function stRowCols(r) {
  const n = ST_ROW_CELLS[r];
  const start = 13 - n; // horizontally centers the row in 25 half-columns (0..24)
  const cols = [];
  for (let i = 0; i < n; i++) cols.push(start + 2 * i);
  return cols;
}

const ST_VALID = new Set();
const ST_CELLS = []; // all [r, gc] in board
for (let r = 0; r < 17; r++) {
  for (const gc of stRowCols(r)) {
    ST_VALID.add(`${r},${gc}`);
    ST_CELLS.push([r, gc]);
  }
}

// The 6 corner triangles (10 cells each).
const ST_TOP = [];
for (let r = 0; r < 4; r++) for (const gc of stRowCols(r)) ST_TOP.push([r, gc]);
const ST_BOTTOM = [];
for (let r = 13; r < 17; r++) for (const gc of stRowCols(r)) ST_BOTTOM.push([r, gc]);
// UL: leftmost cells of rows 4-7 that are NOT in the central hexagon.
// Derived by picking the N leftmost cells of each row where N counts down 4→1.
// Central hex in row 4 spans gc 8..16 (5 cells); UL is gc < 8 → 4 cells at 0,2,4,6.
const ST_UL = [
  [4,0],[4,2],[4,4],[4,6],
  [5,1],[5,3],[5,5],
  [6,2],[6,4],
  [7,3],
];
const ST_UR = [
  [4,18],[4,20],[4,22],[4,24],
  [5,19],[5,21],[5,23],
  [6,20],[6,22],
  [7,21],
];
const ST_LL = [
  [9,3],
  [10,2],[10,4],
  [11,1],[11,3],[11,5],
  [12,0],[12,2],[12,4],[12,6],
];
const ST_LR = [
  [9,21],
  [10,20],[10,22],
  [11,19],[11,21],[11,23],
  [12,18],[12,20],[12,22],[12,24],
];

const ST_TRIANGLES = { T: ST_TOP, B: ST_BOTTOM, UL: ST_UL, UR: ST_UR, LL: ST_LL, LR: ST_LR };
const ST_OPPOSITE  = { T: "B", B: "T", UL: "LR", LR: "UL", UR: "LL", LL: "UR" };

// Player configurations: which triangles get filled, in turn order.
// Turn order is chosen so adjacent triangles don't play back-to-back where
// possible (keeps the game visually rotational).
const ST_CONFIGS = {
  2: ["T", "B"],
  3: ["T", "LR", "LL"],         // 120° apart
  4: ["UL", "UR", "LR", "LL"],  // skips top + bottom
  6: ["T", "LR", "LL", "B", "UL", "UR"],
};

// Palette by triangle slot (fixed so each corner always has the same colour).
const ST_PALETTE = {
  T:  { key: "hl.red",    code: "R" },
  UR: { key: "hl.yellow", code: "Y" },
  LR: { key: "hl.green",  code: "G" },
  B:  { key: "hl.blue",   code: "B" },
  LL: { key: "hl.purple", code: "P" },
  UL: { key: "hl.orange", code: "O" },
};

// Hex directions (r, gc deltas): NE, E, SE, SW, W, NW
const ST_DIRS = [
  [-1, +1], [ 0, +2], [+1, +1],
  [+1, -1], [ 0, -2], [-1, -1],
];

// ============================================================================
// STATE
// ============================================================================

const setupEl   = document.getElementById("setup");
const playEl    = document.getElementById("play");
const boardEl   = document.getElementById("board");
const statusEl  = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");
const turnPill  = document.getElementById("turn-pill");
const turnDot   = document.querySelector("#turn-pill .turn-dot");
const endJumpBtn = document.getElementById("end-jump");

let mode = null;       // "classical" | "star"
let playerCount = 2;   // classical: always 2; star: 2/3/4/6
let activeTriangles = []; // star mode: list of triangle keys in turn order
let turnIdx = 0;       // index into activeTriangles (star) or 0/1 for classical
let board = null;      // classical: 2D array; star: Map<"r,gc", code>
let selected = null;   // [r, c] for classical; [r, gc] for star
let legalDests = [];   // {to:[...], jump:bool}
let jumpChain = null;
let done = false;

// ============================================================================
// SHARED HELPERS
// ============================================================================

function keyRC(r, c) { return `${r},${c}`; }
function colorName(code) {
  if (code === "R") return t("hl.red");
  if (code === "B") return t("hl.blue");
  if (code === "G") return t("hl.green");
  if (code === "Y") return t("hl.yellow");
  if (code === "P") return t("hl.purple");
  if (code === "O") return t("hl.orange");
  return code;
}

function currentCode() {
  if (mode === "classical") return turnIdx === 0 ? "R" : "B";
  return ST_PALETTE[activeTriangles[turnIdx]].code;
}

function advanceTurn() {
  turnIdx = (turnIdx + 1) % (mode === "classical" ? 2 : activeTriangles.length);
}

// ============================================================================
// CLASSICAL: move generation + render
// ============================================================================

function clInB(r, c) { return r >= 0 && c >= 0 && r < CL_N && c < CL_N; }
function clPieceAt(r, c) { return clInB(r, c) ? board[r][c] : null; }

function clLegalSteps(r, c) {
  const out = [];
  for (const [dr, dc] of CL_DIRS) {
    const nr = r + dr, nc = c + dc;
    if (clInB(nr, nc) && !clPieceAt(nr, nc)) out.push({ to: [nr, nc], jump: false });
  }
  return out;
}
function clLegalJumps(r, c, visited = new Set([keyRC(r, c)])) {
  const out = [];
  for (const [dr, dc] of CL_DIRS) {
    const mr = r + dr, mc = c + dc;
    const lr = r + 2 * dr, lc = c + 2 * dc;
    if (!clInB(lr, lc)) continue;
    if (!clPieceAt(mr, mc)) continue;
    if (clPieceAt(lr, lc)) continue;
    if (visited.has(keyRC(lr, lc))) continue;
    out.push({ to: [lr, lc], jump: true });
  }
  return out;
}
function clCheckWin() {
  const redIn = CL_BLUE_HOME.every(([r, c]) => board[r][c] === "R");
  const blueIn = CL_RED_HOME.every(([r, c]) => board[r][c] === "B");
  if (redIn) return "R";
  if (blueIn) return "B";
  return null;
}

function newGameClassical() {
  board = Array.from({ length: CL_N }, () => Array(CL_N).fill(null));
  for (const [r, c] of CL_RED_HOME)  board[r][c] = "R";
  for (const [r, c] of CL_BLUE_HOME) board[r][c] = "B";
  turnIdx = 0; selected = null; legalDests = []; jumpChain = null; done = false;
  statusEl.hidden = true; endJumpBtn.hidden = true;
  boardEl.classList.remove("hl-star");
  boardEl.classList.add("hl-classical");
  boardEl.style.setProperty("--hl-n", CL_N);
  render();
}

function renderClassical() {
  boardEl.innerHTML = "";
  for (let r = 0; r < CL_N; r++) {
    for (let c = 0; c < CL_N; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "hl-cell";
      if (CL_RED_ZONE.has(keyRC(r, c))) cell.classList.add("zone-R");
      if (CL_BLUE_ZONE.has(keyRC(r, c))) cell.classList.add("zone-B");
      cell.setAttribute("aria-label", `row ${r + 1} col ${c + 1}`);
      if (selected && selected[0] === r && selected[1] === c) cell.classList.add("selected");
      if (legalDests.some((m) => m.to[0] === r && m.to[1] === c)) cell.classList.add("hint");
      if (jumpChain && jumpChain.startR === r && jumpChain.startC === c) cell.classList.add("last");
      const p = board[r][c];
      if (p) {
        const piece = document.createElement("span");
        piece.className = `hl-piece ${p}`;
        cell.appendChild(piece);
      }
      cell.addEventListener("click", () => onCellClickClassical(r, c));
      boardEl.appendChild(cell);
    }
  }
  refreshStatusBar();
}

function onCellClickClassical(r, c) {
  if (done) return;
  const current = currentCode();
  if (jumpChain) {
    const dest = legalDests.find((m) => m.to[0] === r && m.to[1] === c);
    if (dest) attemptMoveClassical(r, c);
    return;
  }
  const p = clPieceAt(r, c);
  if (selected) {
    const dest = legalDests.find((m) => m.to[0] === r && m.to[1] === c);
    if (dest) { attemptMoveClassical(r, c); return; }
    if (p === current) { selectClassical(r, c); return; }
    selected = null; legalDests = []; render(); return;
  }
  if (p === current) selectClassical(r, c);
}

function selectClassical(r, c) {
  selected = [r, c];
  legalDests = [...clLegalSteps(r, c), ...clLegalJumps(r, c)];
  render();
}

function attemptMoveClassical(r, c) {
  const dest = legalDests.find((m) => m.to[0] === r && m.to[1] === c);
  if (!dest) return;
  const current = currentCode();
  const [fr, fc] = selected;
  board[fr][fc] = null;
  board[r][c] = current;
  fx.play(dest.jump ? "capture" : "place");
  fx.haptic(dest.jump ? "capture" : "tap");
  if (dest.jump) {
    if (!jumpChain) jumpChain = { startR: fr, startC: fc, visited: new Set([keyRC(fr, fc)]) };
    jumpChain.visited.add(keyRC(r, c));
    selected = [r, c];
    legalDests = clLegalJumps(r, c, jumpChain.visited);
    if (legalDests.length === 0) { finishTurn(); return; }
    endJumpBtn.hidden = false;
    statusEl.hidden = false;
    statusEl.className = "status-banner";
    statusEl.textContent = t("hl.keepJumping");
    render();
    return;
  }
  finishTurn();
}

// ============================================================================
// STAR: move generation + render
// ============================================================================

function stKey(r, gc) { return `${r},${gc}`; }
function stInB(r, gc) { return ST_VALID.has(stKey(r, gc)); }
function stPieceAt(r, gc) { return board.get(stKey(r, gc)) || null; }

function stLegalSteps(r, gc) {
  const out = [];
  for (const [dr, dgc] of ST_DIRS) {
    const nr = r + dr, ngc = gc + dgc;
    if (stInB(nr, ngc) && !stPieceAt(nr, ngc)) out.push({ to: [nr, ngc], jump: false });
  }
  return out;
}
function stLegalJumps(r, gc, visited = new Set([stKey(r, gc)])) {
  const out = [];
  for (const [dr, dgc] of ST_DIRS) {
    const mr = r + dr, mgc = gc + dgc;
    const lr = r + 2 * dr, lgc = gc + 2 * dgc;
    if (!stInB(lr, lgc)) continue;
    if (!stPieceAt(mr, mgc)) continue;
    if (stPieceAt(lr, lgc)) continue;
    if (visited.has(stKey(lr, lgc))) continue;
    out.push({ to: [lr, lgc], jump: true });
  }
  return out;
}
function stCheckWin() {
  // A player wins if every cell of their GOAL triangle holds their color.
  for (const tri of activeTriangles) {
    const code = ST_PALETTE[tri].code;
    const goalTri = ST_TRIANGLES[ST_OPPOSITE[tri]];
    // Each goal triangle has 10 cells — need exactly the N pieces of this
    // player occupying them. (N is always 10 since 10 pieces per player.)
    if (goalTri.every(([r, gc]) => stPieceAt(r, gc) === code)) return code;
  }
  return null;
}

function newGameStar() {
  board = new Map();
  activeTriangles = ST_CONFIGS[playerCount];
  for (const tri of activeTriangles) {
    const code = ST_PALETTE[tri].code;
    for (const [r, gc] of ST_TRIANGLES[tri]) board.set(stKey(r, gc), code);
  }
  turnIdx = 0; selected = null; legalDests = []; jumpChain = null; done = false;
  statusEl.hidden = true; endJumpBtn.hidden = true;
  boardEl.classList.remove("hl-classical");
  boardEl.classList.add("hl-star");
  render();
}

function renderStar() {
  boardEl.innerHTML = "";

  // Background layer: colored triangles (SVG so they scale with the board).
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 27.712"); // widest row spans 0..24 half-cols; height = 16 rows × √3 ≈ 27.712
  svg.setAttribute("preserveAspectRatio", "none");
  svg.classList.add("hl-star-bg");
  // Six triangle polygons. Each is defined by its 3 outer vertices in (gc, y) space,
  // where y = r * √3/2 * 2 = r * √3 (because vertical spacing is √3/2 per row, and
  // viewBox height is 16 rows of that spacing). We inline √3 ≈ 1.732.
  const R3 = 1.7320508;
  const tri = (pts, cls) => {
    const p = document.createElementNS(svgNS, "polygon");
    p.setAttribute("points", pts.map(([x, y]) => `${x},${y}`).join(" "));
    p.setAttribute("class", cls);
    svg.appendChild(p);
  };
  // T (top): apex (12,0), base endpoints on row 4 corners of top-tri base.
  tri([[12, 0], [8, 4 * R3], [16, 4 * R3]], "hl-tri T");
  // B (bottom): apex (12, 16*R3), base endpoints row 12 center corners.
  tri([[12, 16 * R3], [8, 12 * R3], [16, 12 * R3]], "hl-tri B");
  // UL: apex (0, 4R3), edges to (8, 4R3) and (4, 8R3)... Actually simplify —
  // each side triangle has vertices at:
  //   UL: outer tip (0, 4R3), inner-top (8, 4R3), inner-bot (4, 8R3) — wait, geometry time.
  // The central hexagon has 6 vertices:
  //   top-left    (8, 4R3)   top-right    (16, 4R3)
  //   left        (4, 8R3)   right        (20, 8R3)
  //   bot-left    (8, 12R3)  bot-right    (16, 12R3)
  // (And row 8 widest, the hex is narrow at 4..20 = 16 wide, which contradicts.)
  // Actually the central hex widest row (row 8) has 9 cells at gc 4..20, so
  // the hex spans gc 4 to 20 horizontally. Its 6 vertices:
  //   (12, 4R3)   top of hex is gc 12 at row 4 — NO, hex top is row 4 width 5 (gc 8..16).
  // The hex has flat horizontal top/bottom edges (not pointy), so:
  //   top edge:    (8, 4R3) to (16, 4R3)
  //   bot edge:    (8, 12R3) to (16, 12R3)
  //   left vertex: (4, 8R3)   // single point
  //   right vertex:(20, 8R3)
  // That makes 6 points total: (8,4R3),(16,4R3),(20,8R3),(16,12R3),(8,12R3),(4,8R3). ✓
  //
  // Each side triangle points OUTWARD from one of the 4 "slanted" edges of the hex:
  //   UL triangle: outer tip at (0, 4R3), base from (8,4R3) and (4,8R3)
  //   UR:          outer tip at (24, 4R3), base (16,4R3) and (20,8R3)
  //   LL:          outer tip at (0, 12R3), base (4,8R3) and (8,12R3)
  //   LR:          outer tip at (24, 12R3), base (16,12R3) and (20,8R3)
  tri([[0, 4 * R3],   [8, 4 * R3],   [4, 8 * R3]],   "hl-tri UL");
  tri([[24, 4 * R3],  [16, 4 * R3],  [20, 8 * R3]],  "hl-tri UR");
  tri([[0, 12 * R3],  [8, 12 * R3],  [4, 8 * R3]],   "hl-tri LL");
  tri([[24, 12 * R3], [16, 12 * R3], [20, 8 * R3]],  "hl-tri LR");
  // Central hexagon — white / card background
  const hex = document.createElementNS(svgNS, "polygon");
  hex.setAttribute("points", [
    [8, 4 * R3], [16, 4 * R3],
    [20, 8 * R3], [16, 12 * R3],
    [8, 12 * R3], [4, 8 * R3],
  ].map(([x, y]) => `${x},${y}`).join(" "));
  hex.setAttribute("class", "hl-hex");
  svg.appendChild(hex);
  boardEl.appendChild(svg);

  // Dot layer: one button per valid cell, absolutely positioned.
  // Inset by 5% on each side so the dots (6.5% wide, centered via
  // translate(-50%, -50%)) don't spill past the square board border.
  // SVG background is inset the same amount (see .hl-star-bg CSS).
  const PAD = 5;
  const SPAN = 100 - 2 * PAD; // 90
  for (const [r, gc] of ST_CELLS) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hl-dot";
    dot.style.left = `${PAD + (gc / 24) * SPAN}%`;
    dot.style.top  = `${PAD + (r / 16) * SPAN}%`;
    dot.setAttribute("aria-label", `row ${r + 1} col ${gc}`);

    if (selected && selected[0] === r && selected[1] === gc) dot.classList.add("selected");
    if (legalDests.some((m) => m.to[0] === r && m.to[1] === gc)) dot.classList.add("hint");
    if (jumpChain && jumpChain.startR === r && jumpChain.startC === gc) dot.classList.add("last");

    const p = board.get(stKey(r, gc));
    if (p) {
      const piece = document.createElement("span");
      piece.className = `hl-piece ${p}`;
      dot.appendChild(piece);
    }
    dot.addEventListener("click", () => onCellClickStar(r, gc));
    boardEl.appendChild(dot);
  }

  refreshStatusBar();
}

function onCellClickStar(r, gc) {
  if (done) return;
  const current = currentCode();
  if (jumpChain) {
    const dest = legalDests.find((m) => m.to[0] === r && m.to[1] === gc);
    if (dest) attemptMoveStar(r, gc);
    return;
  }
  const p = stPieceAt(r, gc);
  if (selected) {
    const dest = legalDests.find((m) => m.to[0] === r && m.to[1] === gc);
    if (dest) { attemptMoveStar(r, gc); return; }
    if (p === current) { selectStar(r, gc); return; }
    selected = null; legalDests = []; render(); return;
  }
  if (p === current) selectStar(r, gc);
}

function selectStar(r, gc) {
  selected = [r, gc];
  legalDests = [...stLegalSteps(r, gc), ...stLegalJumps(r, gc)];
  render();
}

function attemptMoveStar(r, gc) {
  const dest = legalDests.find((m) => m.to[0] === r && m.to[1] === gc);
  if (!dest) return;
  const current = currentCode();
  const [fr, fgc] = selected;
  board.delete(stKey(fr, fgc));
  board.set(stKey(r, gc), current);
  fx.play(dest.jump ? "capture" : "place");
  fx.haptic(dest.jump ? "capture" : "tap");
  if (dest.jump) {
    if (!jumpChain) jumpChain = { startR: fr, startC: fgc, visited: new Set([stKey(fr, fgc)]) };
    jumpChain.visited.add(stKey(r, gc));
    selected = [r, gc];
    legalDests = stLegalJumps(r, gc, jumpChain.visited);
    if (legalDests.length === 0) { finishTurn(); return; }
    endJumpBtn.hidden = false;
    statusEl.hidden = false;
    statusEl.className = "status-banner";
    statusEl.textContent = t("hl.keepJumping");
    render();
    return;
  }
  finishTurn();
}

// ============================================================================
// SHARED: turn end, win, render dispatch
// ============================================================================

function finishTurn() {
  selected = null; legalDests = []; jumpChain = null;
  endJumpBtn.hidden = true;

  const winner = mode === "classical" ? clCheckWin() : stCheckWin();
  if (winner) {
    done = true;
    statusEl.hidden = false;
    statusEl.className = "status-banner win";
    statusEl.textContent = t("hl.win", { p: colorName(winner) });
    fx.play("win"); fx.haptic("win");
  } else {
    advanceTurn();
    statusEl.hidden = true;
    statusEl.textContent = "";
    statusEl.className = "status-banner";
  }
  render();
}

function refreshStatusBar() {
  turnLabel.textContent = done ? "—" : t("hl.turn", { p: colorName(currentCode()) });
  const codeToClass = { R: "red", B: "blue", G: "green", Y: "yellow", P: "purple", O: "orange" };
  turnDot.className = "turn-dot " + (codeToClass[currentCode()] || "red");
  endJumpBtn.hidden = done || !jumpChain;
}

function newGame() { mode === "classical" ? newGameClassical() : newGameStar(); }
function render()  { mode === "classical" ? renderClassical()  : renderStar(); }

// ============================================================================
// SETUP / WIRING
// ============================================================================

setupEl.querySelectorAll("button[data-variant]").forEach((btn) => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.variant;
    playerCount = parseInt(btn.dataset.n, 10);
    setupEl.hidden = true;
    playEl.hidden = false;
    turnPill.hidden = false;
    newGame();
  });
});

document.getElementById("reset").addEventListener("click", () => {
  // Back to variant picker so user can switch mode between games.
  mode = null;
  playEl.hidden = true;
  setupEl.hidden = false;
  turnPill.hidden = true;
  boardEl.innerHTML = "";
  statusEl.hidden = true;
  endJumpBtn.hidden = true;
  turnLabel.textContent = "";
  turnDot.className = "turn-dot red";
});

endJumpBtn.addEventListener("click", () => {
  if (!jumpChain) return;
  finishTurn();
});

document.addEventListener("langchange", () => { if (mode) render(); });

// Drag-and-drop — reuses the click handlers by calling cell.click() so all
// turn / jump-chain logic stays in one place. Works for both modes because
// both render pieces inside `.hl-piece` elements whose parent is clickable.
enableDrag(boardEl, {
  pieceSelector: ".hl-piece",
  cellFromPoint: (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest(".hl-cell, .hl-dot");
  },
  onDragStart: (cell) => cell.click(),
  onDrop: (cell) => cell.click(),
});

// Show setup on load.
setupEl.hidden = false;
playEl.hidden = true;
turnPill.hidden = true;
