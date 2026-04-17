// Checkers — 8x8, diagonal moves, forced captures, multi-jumps, kings.
// Piece encoding: null | { color: "R"|"B", king: boolean }
// Move: { from: [r,c], to: [r,c], captures: [[r,c]...] }

import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";
import { enableDrag } from "/shared/drag.js";

register("ck", {
  en: {
    subtitle: "2 players · diagonal moves · forced captures",
    red: "Red",
    black: "Black",
    turn: "{p}'s turn",
    win: "{p} wins!",
  },
  id: {
    subtitle: "2 pemain · diagonal · makan wajib",
    red: "Merah",
    black: "Hitam",
    turn: "Giliran {p}",
    win: "{p} menang!",
  },
  jw: {
    subtitle: "2 pemain · diagonal · mangan kudu",
    red: "Abang",
    black: "Ireng",
    turn: "Giliran {p}",
    win: "{p} menang!",
  },
});

wireGameHead({
  titleEn: "Checkers",
  titleId: "Dam",
  titleJw: "Dam",
  subtitleKey: "ck.subtitle",
  rules: {
    en: `
      <h3>Goal</h3>
      <p>Capture all opponent pieces, or leave them with no legal moves.</p>
      <h3>Movement</h3>
      <ul>
        <li>Pieces move diagonally forward to an empty dark square.</li>
        <li>Capture by jumping over an adjacent opponent into the empty square beyond.</li>
        <li>Captures are <strong>mandatory</strong> — if you can jump, you must.</li>
        <li>Multi-jumps chain: keep jumping with the same piece if more captures are available.</li>
      </ul>
      <h3>Kings</h3>
      <p>A piece reaching the far row is crowned and may move diagonally in any direction.</p>`,
    id: `
      <h3>Tujuan</h3>
      <p>Habisi semua bidak lawan, atau bikin lawan tidak bisa jalan.</p>
      <h3>Gerakan</h3>
      <ul>
        <li>Bidak jalan diagonal ke depan, ke kotak gelap kosong.</li>
        <li>Makan dengan melompati bidak lawan di sebelah, mendarat di kotak kosong setelahnya.</li>
        <li>Makan itu <strong>wajib</strong> — kalau bisa makan, harus makan.</li>
        <li>Lompatan berantai: terus lompat kalau masih ada yang bisa dimakan.</li>
      </ul>
      <h3>Raja</h3>
      <p>Bidak yang sampai baris paling jauh jadi raja, bisa jalan diagonal ke segala arah.</p>`,
    jw: `
      <h3>Tujuan</h3>
      <p>Entekake kabeh bidak lawan, utawa nggawe lawan ora isa mlaku.</p>
      <h3>Gerakan</h3>
      <ul>
        <li>Bidak mlaku diagonal menyang ngarep, menyang kothak peteng sing kosong.</li>
        <li>Mangan sarana mlumpati bidak lawan sing jejer, mudhun ing kothak kosong sabanjure.</li>
        <li>Mangan iku <strong>kudu</strong> — yen isa mangan, kudu mangan.</li>
        <li>Mlumpat rambatan: terus mlumpat yen isih ana sing isa dipangan.</li>
      </ul>
      <h3>Raja</h3>
      <p>Bidak sing tekan baris paling adoh dadi raja, isa mlaku diagonal menyang endi wae.</p>`,
  },
});

const N = 8;
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");
const turnDot = document.querySelector("#turn-pill .turn-dot");

let board, current, selected, legalMoves, squares, done, mustContinueFrom;

function start() {
  board = Array.from({ length: N }, () => Array(N).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < N; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: "B", king: false };
    }
  }
  for (let r = N - 3; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: "R", king: false };
    }
  }
  current = "R";
  selected = null;
  legalMoves = [];
  done = false;
  mustContinueFrom = null;
}

const inB = (r, c) => r >= 0 && c >= 0 && r < N && c < N;

function movesDirs(piece) {
  if (piece.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return piece.color === "R" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

// Collect all maximal jump chains starting from (sr, sc) for `piece`.
// The piece is treated as lifted from (sr, sc) so that square is walkable.
function collectJumps(sr, sc, piece) {
  const dirs = movesDirs(piece);
  const results = [];

  function recurse(r, c, captured, path) {
    let extended = false;
    for (const [dr, dc] of dirs) {
      const mr = r + dr, mc = c + dc;
      const lr = r + dr * 2, lc = c + dc * 2;
      if (!inB(lr, lc)) continue;
      const mid = board[mr][mc];
      if (!mid || mid.color === piece.color) continue;
      if (captured.has(`${mr},${mc}`)) continue;
      // Landing must be empty — OR the origin square (since piece has lifted off).
      const landing = board[lr][lc];
      if (landing && !(lr === sr && lc === sc)) continue;

      extended = true;
      const nextCap = new Set(captured);
      nextCap.add(`${mr},${mc}`);
      recurse(lr, lc, nextCap, [...path, { to: [lr, lc], capture: [mr, mc] }]);
    }
    if (!extended && path.length) {
      results.push({
        from: [sr, sc],
        to: path[path.length - 1].to,
        captures: path.map((p) => p.capture),
      });
    }
  }

  recurse(sr, sc, new Set(), []);
  return results;
}

function simpleMovesFrom(r, c, piece) {
  const out = [];
  for (const [dr, dc] of movesDirs(piece)) {
    const nr = r + dr, nc = c + dc;
    if (inB(nr, nc) && !board[nr][nc]) {
      out.push({ from: [r, c], to: [nr, nc], captures: [] });
    }
  }
  return out;
}

function allLegalMoves(color) {
  const jumps = [];
  const simple = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;
      jumps.push(...collectJumps(r, c, p));
      simple.push(...simpleMovesFrom(r, c, p));
    }
  }
  return jumps.length ? jumps : simple;
}

function render() {
  boardEl.innerHTML = "";
  squares = Array.from({ length: N }, () => Array(N));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const dark = (r + c) % 2 === 1;
      const sq = document.createElement("button");
      sq.type = "button";
      sq.className = "ck-sq" + (dark ? " dark" : "");
      sq.setAttribute("aria-label", `row ${r + 1} column ${c + 1}`);
      const piece = board[r][c];
      if (piece) {
        const el = document.createElement("span");
        el.className = `ck-piece ${piece.color === "R" ? "red" : "black"}${piece.king ? " king" : ""}`;
        sq.appendChild(el);
      }
      if (selected && selected[0] === r && selected[1] === c) sq.classList.add("selected");
      if (legalMoves.some((m) => m.to[0] === r && m.to[1] === c)) sq.classList.add("hint");
      sq.addEventListener("click", () => onClick(r, c));
      boardEl.appendChild(sq);
      squares[r][c] = sq;
    }
  }
  const name = (p) => t(p === "R" ? "ck.red" : "ck.black");
  turnLabel.textContent = done ? "—" : t("ck.turn", { p: name(current) });
  turnDot.className = "turn-dot " + (current === "R" ? "red" : "black");

  if (!done) {
    const forced = allLegalMoves(current);
    if (!forced.length) {
      done = true;
      statusEl.textContent = t("ck.win", { p: name(current === "R" ? "B" : "R") });
      statusEl.className = "status-banner win";
      statusEl.hidden = false;
      fx.play("win"); fx.haptic("win");
    }
  }
}

document.addEventListener("langchange", () => render());

function onClick(r, c) {
  if (done) return;

  if (mustContinueFrom) {
    const move = legalMoves.find((m) => m.to[0] === r && m.to[1] === c);
    if (move) applyMove(move);
    return;
  }

  const piece = board[r][c];

  if (selected) {
    const move = legalMoves.find((m) => m.to[0] === r && m.to[1] === c);
    if (move) {
      applyMove(move);
      return;
    }
    if (piece && piece.color === current) {
      selectPiece(r, c);
      return;
    }
    selected = null;
    legalMoves = [];
    render();
    return;
  }

  if (piece && piece.color === current) selectPiece(r, c);
}

function selectPiece(r, c) {
  const all = allLegalMoves(current);
  const hasCap = all.some((m) => m.captures.length);
  const ms = all.filter((m) => m.from[0] === r && m.from[1] === c);
  if (hasCap && !ms.some((m) => m.captures.length)) return;
  selected = [r, c];
  legalMoves = hasCap ? ms.filter((m) => m.captures.length) : ms;
  render();
}

function applyMove(move) {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = board[fr][fc];
  board[fr][fc] = null;
  for (const [cr, cc] of move.captures) board[cr][cc] = null;
  board[tr][tc] = piece;

  if (move.captures.length) { fx.play("capture"); fx.haptic("capture"); }
  else { fx.play("place"); fx.haptic("tap"); }

  // Promotion (only if landed on last rank — captures module already made kings mid-chain safe
  // because our chain runs atomically as one move)
  const becameKing =
    !piece.king && ((piece.color === "R" && tr === 0) || (piece.color === "B" && tr === N - 1));
  if (becameKing) piece.king = true;

  // A chain move was already collected in one go, so we don't continue further.
  current = current === "R" ? "B" : "R";
  selected = null;
  legalMoves = [];
  mustContinueFrom = null;
  render();
}

document.getElementById("reset").addEventListener("click", () => {
  statusEl.hidden = true;
  start();
  render();
});

enableDrag(boardEl, {
  pieceSelector: ".ck-piece",
  cellFromPoint: (x, y) => document.elementFromPoint(x, y)?.closest(".ck-sq"),
  onDragStart: (cell) => cell.click(),
  onDrop: (cell) => cell.click(),
});

start();
render();
