// Chess — full rules. Human-vs-human hotseat.
//
// Piece encoding: null | { color: "w"|"b", type: "P"|"N"|"B"|"R"|"Q"|"K" }
// State is rebuilt by replaying moves; undo pops the last move.
//
// Special rules implemented:
// - Castling (kingside + queenside) incl. can't castle through/out of check
// - En passant (one-move window)
// - Pawn promotion (piece choice modal)
// - Check, checkmate, stalemate detection
// - 50-move rule + threefold repetition draw
//
// Not implemented: insufficient material, full FIDE repetition (we approximate
// threefold by FEN-ish hash of position+rights+side-to-move).

import { storage } from "/shared/storage.js";
import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";
import { findBestMove } from "./bot.js";

register("ch", {
  en: {
    subtitle: "2 players · full rules · hotseat",
    white: "White",
    black: "Black",
    turn: "{p}'s turn",
    mateWhite: "Checkmate — White wins.",
    mateBlack: "Checkmate — Black wins.",
    stalemate: "Stalemate — draw.",
    repetition: "Draw — threefold repetition.",
    fiftyMove: "Draw — 50-move rule.",
    promote: "Promote pawn",
    chooseMode: "Choose mode",
    modeHuman: "2 Players",
    modeBot: "vs Bot",
    botThinking: "Bot is thinking…",
    difficulty: "Difficulty",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
  },
  id: {
    subtitle: "2 pemain · aturan lengkap · hotseat",
    white: "Putih",
    black: "Hitam",
    turn: "Giliran {p}",
    mateWhite: "Skakmat — Putih menang.",
    mateBlack: "Skakmat — Hitam menang.",
    stalemate: "Seri — pat.",
    repetition: "Seri — posisi sama tiga kali.",
    fiftyMove: "Seri — 50 langkah tanpa makan.",
    promote: "Promosi pion",
    chooseMode: "Pilih mode",
    modeHuman: "2 Pemain",
    modeBot: "vs Bot",
    botThinking: "Bot sedang berpikir…",
    difficulty: "Tingkat kesulitan",
    easy: "Mudah",
    medium: "Sedang",
    hard: "Sulit",
  },
});

wireGameHead({
  titleEn: "Chess",
  titleId: "Catur",
  subtitleKey: "ch.subtitle",
  rules: {
    en: `
      <h3>Goal</h3>
      <p>Checkmate the opponent's king — attack it so it can't escape, block, or be defended.</p>
      <h3>Special rules</h3>
      <ul>
        <li><strong>Castling</strong> — king moves two squares toward an unmoved rook; the rook hops over.</li>
        <li><strong>En passant</strong> — capture a pawn that just double-stepped past your pawn.</li>
        <li><strong>Promotion</strong> — a pawn reaching the last rank becomes a Queen, Rook, Bishop, or Knight (you pick).</li>
        <li><strong>Draws</strong>: stalemate, threefold repetition, or 50 moves without a capture/pawn move.</li>
      </ul>
      <h3>This app</h3>
      <p>Hotseat only — no AI. Tap a piece to see its legal moves; tap a target to play it. Undo backs out the last move.</p>`,
    id: `
      <h3>Tujuan</h3>
      <p>Skakmat raja lawan — serang sampai tak ada jalan kabur, blok, atau pertahanan.</p>
      <h3>Aturan spesial</h3>
      <ul>
        <li><strong>Rokade</strong> — raja loncat dua kotak menuju benteng yang belum bergerak; benteng melompat ke sisi lain.</li>
        <li><strong>En passant</strong> — makan pion yang baru saja loncat dua kotak melewatimu.</li>
        <li><strong>Promosi</strong> — pion sampai baris ujung jadi Mentri, Benteng, Gajah, atau Kuda (pilih sendiri).</li>
        <li><strong>Seri</strong>: pat, posisi sama tiga kali, atau 50 langkah tanpa makan/gerak pion.</li>
      </ul>
      <h3>Versi ini</h3>
      <p>Hotseat saja — tanpa AI. Tap bidak untuk lihat langkah legal; tap target untuk jalan. Tombol Batalkan urungkan langkah terakhir.</p>`,
  },
});

// Use the filled (solid) glyphs for both sides so pieces are readable.
// Color + text-shadow separates white from black.
const GLYPH = {
  w: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};
const PROMO_ORDER = ["Q", "R", "B", "N"];

const boardEl = document.getElementById("board");
const turnLabel = document.getElementById("turn-label");
const turnDot = document.querySelector("#turn-pill .turn-dot");
const statusEl = document.getElementById("status");
const promoEl = document.getElementById("promo");
const promoChoicesEl = document.getElementById("promo-choices");

let state;

function initialState() {
  const empty = () => Array(8).fill(null);
  const board = [];
  const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  board.push(back.map((t) => ({ color: "b", type: t })));
  board.push(Array.from({ length: 8 }, () => ({ color: "b", type: "P" })));
  for (let i = 0; i < 4; i++) board.push(empty());
  board.push(Array.from({ length: 8 }, () => ({ color: "w", type: "P" })));
  board.push(back.map((t) => ({ color: "w", type: t })));
  return {
    board,
    turn: "w",
    castling: { w: { K: true, Q: true }, b: { K: true, Q: true } },
    enPassant: null, // [r, c] of the square *behind* a pawn that just moved 2
    halfmove: 0, // 50-move counter
    history: [], // for undo + repetition
    positions: new Map(), // repetition hashes
    result: null, // "1-0" | "0-1" | "½-½" | null
  };
}

function cloneBoard(b) {
  return b.map((row) => row.map((p) => (p ? { ...p } : null)));
}

const inB = (r, c) => r >= 0 && c >= 0 && r < 8 && c < 8;

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === "K") return [r, c];
    }
  }
  return null;
}

function isSquareAttacked(board, r, c, byColor) {
  // Pawns
  const dir = byColor === "w" ? -1 : 1;
  for (const dc of [-1, 1]) {
    const pr = r - dir, pc = c - dc; // inverse direction from defender's perspective
    // Actually: a pawn of byColor at (r', c') attacks (r'+dir, c'+-1). So for square (r,c)
    // to be attacked by a pawn of byColor, check pawn at (r-dir, c±1).
    const sr = r - dir, sc = c + dc;
    if (inB(sr, sc)) {
      const p = board[sr][sc];
      if (p && p.color === byColor && p.type === "P") return true;
    }
  }
  // Knights
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const nr = r + dr, nc = c + dc;
    if (inB(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === "N") return true;
    }
  }
  // King (adjacent)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (inB(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === byColor && p.type === "K") return true;
      }
    }
  }
  // Sliding: rook/queen (orthogonal), bishop/queen (diagonal)
  const slide = (dirs, types) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inB(nr, nc)) {
        const p = board[nr][nc];
        if (p) {
          if (p.color === byColor && types.includes(p.type)) return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }
    return false;
  };
  if (slide([[1, 0], [-1, 0], [0, 1], [0, -1]], ["R", "Q"])) return true;
  if (slide([[1, 1], [1, -1], [-1, 1], [-1, -1]], ["B", "Q"])) return true;
  return false;
}

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [2, -1], [2, 1],
  [-1, -2], [-1, 2], [1, -2], [1, 2],
];

function isInCheck(s, color) {
  const k = findKing(s.board, color);
  if (!k) return false;
  return isSquareAttacked(s.board, k[0], k[1], color === "w" ? "b" : "w");
}

/**
 * Generate pseudo-legal moves for `color`. Each move:
 * { from: [r,c], to: [r,c], piece, captured?, promotion?,
 *   castling?: "K"|"Q", enPassant?: true, pawnDouble?: true }
 */
function pseudoMoves(s, color) {
  const moves = [];
  const b = s.board;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p.color !== color) continue;
      switch (p.type) {
        case "P": pawnMoves(s, r, c, moves); break;
        case "N": leaperMoves(b, r, c, p, KNIGHT_OFFSETS, moves); break;
        case "B": sliderMoves(b, r, c, p, [[1,1],[1,-1],[-1,1],[-1,-1]], moves); break;
        case "R": sliderMoves(b, r, c, p, [[1,0],[-1,0],[0,1],[0,-1]], moves); break;
        case "Q":
          sliderMoves(b, r, c, p, [[1,1],[1,-1],[-1,1],[-1,-1]], moves);
          sliderMoves(b, r, c, p, [[1,0],[-1,0],[0,1],[0,-1]], moves);
          break;
        case "K":
          leaperMoves(b, r, c, p,
            [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]], moves);
          castleMoves(s, r, c, moves);
          break;
      }
    }
  }
  return moves;
}

function pawnMoves(s, r, c, moves) {
  const b = s.board;
  const p = b[r][c];
  const dir = p.color === "w" ? -1 : 1;
  const startRow = p.color === "w" ? 6 : 1;
  const promoteRow = p.color === "w" ? 0 : 7;

  const push = (fr, fc, tr, tc, extra = {}) => {
    const move = { from: [fr, fc], to: [tr, tc], piece: "P", ...extra };
    if (tr === promoteRow) {
      for (const promo of PROMO_ORDER) moves.push({ ...move, promotion: promo });
    } else {
      moves.push(move);
    }
  };

  // Single push
  const one = r + dir;
  if (inB(one, c) && !b[one][c]) {
    push(r, c, one, c);
    // Double push
    const two = r + dir * 2;
    if (r === startRow && !b[two][c]) {
      moves.push({ from: [r, c], to: [two, c], piece: "P", pawnDouble: true });
    }
  }
  // Captures
  for (const dc of [-1, 1]) {
    const tr = r + dir, tc = c + dc;
    if (!inB(tr, tc)) continue;
    const target = b[tr][tc];
    if (target && target.color !== p.color) {
      push(r, c, tr, tc, { captured: target });
    }
    // En passant
    if (s.enPassant && s.enPassant[0] === tr && s.enPassant[1] === tc) {
      const capRow = r;
      const capCol = tc;
      const ep = b[capRow][capCol];
      if (ep && ep.color !== p.color && ep.type === "P") {
        moves.push({
          from: [r, c], to: [tr, tc], piece: "P",
          captured: ep, enPassant: true,
        });
      }
    }
  }
}

function leaperMoves(b, r, c, p, offsets, moves) {
  for (const [dr, dc] of offsets) {
    const nr = r + dr, nc = c + dc;
    if (!inB(nr, nc)) continue;
    const target = b[nr][nc];
    if (!target) moves.push({ from: [r, c], to: [nr, nc], piece: p.type });
    else if (target.color !== p.color) {
      moves.push({ from: [r, c], to: [nr, nc], piece: p.type, captured: target });
    }
  }
}

function sliderMoves(b, r, c, p, dirs, moves) {
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    while (inB(nr, nc)) {
      const target = b[nr][nc];
      if (!target) {
        moves.push({ from: [r, c], to: [nr, nc], piece: p.type });
      } else {
        if (target.color !== p.color) {
          moves.push({ from: [r, c], to: [nr, nc], piece: p.type, captured: target });
        }
        break;
      }
      nr += dr; nc += dc;
    }
  }
}

function castleMoves(s, r, c, moves) {
  const p = s.board[r][c];
  const rights = s.castling[p.color];
  if (!rights.K && !rights.Q) return;
  if (isInCheck(s, p.color)) return;
  const opp = p.color === "w" ? "b" : "w";
  const row = p.color === "w" ? 7 : 0;
  if (r !== row || c !== 4) return;
  // Kingside: squares 5,6 must be empty + not attacked; rook at 7
  if (rights.K && !s.board[row][5] && !s.board[row][6]) {
    if (s.board[row][7] && s.board[row][7].type === "R" && s.board[row][7].color === p.color) {
      if (!isSquareAttacked(s.board, row, 5, opp) && !isSquareAttacked(s.board, row, 6, opp)) {
        moves.push({ from: [r, c], to: [row, 6], piece: "K", castling: "K" });
      }
    }
  }
  // Queenside: squares 3,2 must not be attacked; 1 also empty; rook at 0
  if (rights.Q && !s.board[row][3] && !s.board[row][2] && !s.board[row][1]) {
    if (s.board[row][0] && s.board[row][0].type === "R" && s.board[row][0].color === p.color) {
      if (!isSquareAttacked(s.board, row, 3, opp) && !isSquareAttacked(s.board, row, 2, opp)) {
        moves.push({ from: [r, c], to: [row, 2], piece: "K", castling: "Q" });
      }
    }
  }
}

function applyMove(s, move) {
  const prev = {
    board: cloneBoard(s.board),
    turn: s.turn,
    castling: JSON.parse(JSON.stringify(s.castling)),
    enPassant: s.enPassant ? [...s.enPassant] : null,
    halfmove: s.halfmove,
    result: s.result,
  };
  s.history.push({ move, prev });

  const { from: [fr, fc], to: [tr, tc] } = move;
  const piece = s.board[fr][fc];
  const isPawn = piece.type === "P";
  const isCapture = !!move.captured;

  // Halfmove clock
  if (isPawn || isCapture) s.halfmove = 0;
  else s.halfmove++;

  // Move piece
  s.board[tr][tc] = piece;
  s.board[fr][fc] = null;

  // En passant capture
  if (move.enPassant) s.board[fr][tc] = null;

  // Promotion
  if (move.promotion) s.board[tr][tc] = { color: piece.color, type: move.promotion };

  // Castling: move rook
  if (move.castling) {
    const row = tr;
    if (move.castling === "K") {
      s.board[row][5] = s.board[row][7];
      s.board[row][7] = null;
    } else {
      s.board[row][3] = s.board[row][0];
      s.board[row][0] = null;
    }
  }

  // Update castling rights: king or rook moves — or rook captured
  if (piece.type === "K") s.castling[piece.color] = { K: false, Q: false };
  if (piece.type === "R") {
    const row = piece.color === "w" ? 7 : 0;
    if (fr === row && fc === 0) s.castling[piece.color].Q = false;
    if (fr === row && fc === 7) s.castling[piece.color].K = false;
  }
  if (isCapture) {
    const row = move.captured.color === "w" ? 7 : 0;
    if (tr === row && tc === 0) s.castling[move.captured.color].Q = false;
    if (tr === row && tc === 7) s.castling[move.captured.color].K = false;
  }

  // En passant target
  s.enPassant = move.pawnDouble
    ? [(fr + tr) / 2, fc]
    : null;

  s.turn = s.turn === "w" ? "b" : "w";

  // Repetition tracking
  const key = positionKey(s);
  s.positions.set(key, (s.positions.get(key) || 0) + 1);
  if (s.positions.get(key) >= 3) s.result = "½-½ (repetition)";
  if (s.halfmove >= 100) s.result = s.result || "½-½ (50-move)";
}

function undoMove() {
  const last = s => s.history.pop();
  const step = last(state);
  if (!step) return;
  state.board = step.prev.board;
  state.turn = step.prev.turn;
  state.castling = step.prev.castling;
  state.enPassant = step.prev.enPassant;
  state.halfmove = step.prev.halfmove;
  state.result = step.prev.result;

  // Rebuild positions map (cheap enough for casual play)
  state.positions = new Map();
  const replay = structuredClone(initialState());
  for (const h of state.history) {
    // applyMove mutates replay; we don't re-use `state`
    applyMove(replay, h.move);
  }
  state.positions = replay.positions;
}

function legalMovesForCurrent() {
  const moves = pseudoMoves(state, state.turn);
  const legal = [];
  for (const m of moves) {
    const savedPositions = new Map(state.positions);
    applyMove(state, m);
    const leftKing = isInCheck(state, state.turn === "w" ? "b" : "w");
    // Revert
    const step = state.history.pop();
    state.board = step.prev.board;
    state.turn = step.prev.turn;
    state.castling = step.prev.castling;
    state.enPassant = step.prev.enPassant;
    state.halfmove = step.prev.halfmove;
    state.result = step.prev.result;
    state.positions = savedPositions;
    if (!leftKing) legal.push(m);
  }
  return legal;
}

function positionKey(s) {
  let parts = [];
  for (let r = 0; r < 8; r++) {
    let line = "";
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c];
      line += p ? (p.color === "w" ? p.type : p.type.toLowerCase()) : ".";
    }
    parts.push(line);
  }
  parts.push(s.turn);
  parts.push(`${s.castling.w.K ? "K" : ""}${s.castling.w.Q ? "Q" : ""}${s.castling.b.K ? "k" : ""}${s.castling.b.Q ? "q" : ""}`);
  parts.push(s.enPassant ? s.enPassant.join(",") : "-");
  return parts.join("|");
}

// ---- Bot integration ----

// Engine adapter — exposes the functions bot.js needs without exporting them
// from this module's global scope.
const engine = {
  legalMoves(s) {
    const moves = pseudoMoves(s, s.turn);
    const legal = [];
    for (const m of moves) {
      const saved = new Map(s.positions);
      applyMove(s, m);
      const leftKing = isInCheck(s, s.turn === "w" ? "b" : "w");
      const step = s.history.pop();
      s.board = step.prev.board;
      s.turn = step.prev.turn;
      s.castling = step.prev.castling;
      s.enPassant = step.prev.enPassant;
      s.halfmove = step.prev.halfmove;
      s.result = step.prev.result;
      s.positions = saved;
      if (!leftKing) legal.push(m);
    }
    return legal;
  },
  apply(s, m) { applyMove(s, m); },
  revert(s) {
    const step = s.history.pop();
    s.board = step.prev.board;
    s.turn = step.prev.turn;
    s.castling = step.prev.castling;
    s.enPassant = step.prev.enPassant;
    s.halfmove = step.prev.halfmove;
    s.result = step.prev.result;
    // positions map: we don't restore here since minimax doesn't check repetition
  },
  inCheck(s, color) { return isInCheck(s, color); },
};

let botMode = false;    // false = 2-player, true = vs bot
let botColor = "b";     // bot plays black
let botDifficulty = "medium";
let botBusy = false;

function isBotTurn() {
  return botMode && state.turn === botColor && !state.result;
}

async function doBotMove() {
  if (!isBotTurn()) return;
  botBusy = true;
  render();
  // Small delay so the UI shows "Bot is thinking…" before the CPU-heavy search
  await new Promise((r) => setTimeout(r, 100));
  const move = findBestMove(state, engine, botDifficulty);
  botBusy = false;
  if (!move) { render(); return; }
  // Apply the bot's move
  applyMove(state, move);
  if (move.captured) { fx.play("capture"); fx.haptic("capture"); }
  else { fx.play("place"); fx.haptic("tap"); }
  selected = null;
  selectedMoves = [];
  render();
  if (state.result) {
    fx.play(state.result.startsWith("½") ? "lose" : "win");
    fx.haptic("win");
  }
}

// ---- Rendering + interaction ----

let selected = null;
let selectedMoves = [];
let pendingPromotion = null;

function squareClass(r, c) {
  return (r + c) % 2 === 0 ? "light" : "dark";
}

function render() {
  const legalAll = state.result ? [] : legalMovesForCurrent();
  const checkedKing = isInCheck(state, state.turn) ? findKing(state.board, state.turn) : null;
  const lastMove = state.history.length ? state.history[state.history.length - 1].move : null;

  boardEl.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("button");
      sq.type = "button";
      sq.className = `ch-sq ${squareClass(r, c)}`;
      sq.setAttribute("aria-label", `${"abcdefgh"[c]}${8 - r}`);
      const p = state.board[r][c];
      if (p) {
        const span = document.createElement("span");
        span.className = `ch-piece ${p.color === "w" ? "white" : "black"}`;
        span.textContent = GLYPH[p.color][p.type];
        sq.appendChild(span);
      }
      if (selected && selected[0] === r && selected[1] === c) sq.classList.add("selected");
      if (selectedMoves.some((m) => m.to[0] === r && m.to[1] === c)) {
        sq.classList.add(state.board[r][c] || selectedMoves.find(m=>m.to[0]===r&&m.to[1]===c).enPassant ? "hint-capture" : "hint");
      }
      if (checkedKing && checkedKing[0] === r && checkedKing[1] === c) sq.classList.add("check");
      if (lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) ||
                      (lastMove.to[0] === r && lastMove.to[1] === c))) sq.classList.add("last");
      sq.addEventListener("click", () => onSquareClick(r, c, legalAll));
      boardEl.appendChild(sq);
    }
  }

  const name = (p) => t(p === "w" ? "ch.white" : "ch.black");
  if (botBusy) {
    turnLabel.textContent = t("ch.botThinking");
  } else {
    turnLabel.textContent = state.result ? "—" : t("ch.turn", { p: name(state.turn) });
  }
  turnDot.className = "turn-dot " + (state.turn === "w" ? "white" : "black");

  if (!state.result) {
    if (legalAll.length === 0) {
      state.result = isInCheck(state, state.turn)
        ? state.turn === "w" ? "0-1" : "1-0"
        : "stalemate";
    }
  }

  if (state.result) {
    statusEl.hidden = false;
    const draw = state.result === "stalemate"
      || (typeof state.result === "string" && state.result.startsWith("½"));
    statusEl.className = "status-banner " + (draw ? "draw" : "win");
    statusEl.textContent =
      state.result === "1-0" ? t("ch.mateWhite") :
      state.result === "0-1" ? t("ch.mateBlack") :
      state.result === "stalemate" ? t("ch.stalemate") :
      state.result.includes("repetition") ? t("ch.repetition") :
      state.result.includes("50-move") ? t("ch.fiftyMove") :
      state.result;
  } else {
    statusEl.hidden = true;
  }
  const promoTitle = document.getElementById("promo-title");
  if (promoTitle) promoTitle.textContent = t("ch.promote");
}

document.addEventListener("langchange", () => render());

function onSquareClick(r, c, legalAll) {
  if (state.result) return;
  if (pendingPromotion) return;
  if (botBusy || isBotTurn()) return; // block clicks during bot's turn

  const p = state.board[r][c];
  if (selected) {
    const move = selectedMoves.find((m) => m.to[0] === r && m.to[1] === c);
    if (move) {
      performMove(move);
      return;
    }
    if (p && p.color === state.turn) {
      select(r, c, legalAll);
      return;
    }
    selected = null;
    selectedMoves = [];
    render();
    return;
  }

  if (p && p.color === state.turn) select(r, c, legalAll);
}

function select(r, c, legalAll) {
  selected = [r, c];
  selectedMoves = legalAll.filter((m) => m.from[0] === r && m.from[1] === c);
  render();
}

function performMove(move) {
  // Promotion: if multiple moves share same from/to, prompt
  const promos = selectedMoves.filter(
    (m) => m.to[0] === move.to[0] && m.to[1] === move.to[1] && m.from[0] === move.from[0] && m.from[1] === move.from[1],
  );
  if (promos.length > 1 && promos[0].promotion) {
    askPromotion(move, promos);
    return;
  }
  applyMove(state, move);
  if (move.captured) { fx.play("capture"); fx.haptic("capture"); }
  else { fx.play("place"); fx.haptic("tap"); }
  selected = null;
  selectedMoves = [];
  render();
  if (state.result) {
    fx.play(state.result.startsWith("½") ? "lose" : "win"); fx.haptic("win");
  } else if (isBotTurn()) {
    setTimeout(() => doBotMove(), 200);
  }
}

function askPromotion(move, promos) {
  pendingPromotion = true;
  promoChoicesEl.innerHTML = "";
  for (const m of promos) {
    const btn = document.createElement("button");
    btn.className = "promo-btn";
    btn.type = "button";
    btn.textContent = GLYPH[state.turn][m.promotion];
    btn.setAttribute("aria-label", `Promote to ${m.promotion}`);
    btn.addEventListener("click", () => {
      promoEl.hidden = true;
      pendingPromotion = false;
      applyMove(state, m);
      selected = null;
      selectedMoves = [];
      render();
    });
    promoChoicesEl.appendChild(btn);
  }
  promoEl.hidden = false;
}

const setupEl = document.getElementById("ch-setup");
const playEl = document.getElementById("ch-play");
const diffRow = document.getElementById("diff-row");
const diffSeg = document.getElementById("diff-seg");
const turnPill = document.getElementById("turn-pill");

function startGame(mode) {
  botMode = mode === "bot";
  // botDifficulty is set by the difficulty segmented toggle handler; default
  // to "medium" if never touched.
  botDifficulty = botDifficulty || "medium";
  botBusy = false;
  state = initialState();
  selected = null;
  selectedMoves = [];
  setupEl.hidden = true;
  playEl.hidden = false;
  turnPill.hidden = false;
  render();
  if (isBotTurn()) setTimeout(() => doBotMove(), 300);
}

function backToSetup() {
  setupEl.hidden = false;
  playEl.hidden = true;
  turnPill.hidden = true;
  statusEl.hidden = true;
}

// Setup buttons
setupEl.querySelector('[data-mode="human"]').addEventListener("click", () => {
  startGame("human");
});

// "vs Bot" reveals the difficulty picker; "Start" actually begins.
document.getElementById("btn-pick-bot").addEventListener("click", () => {
  diffRow.hidden = false;
});

diffSeg.querySelectorAll("[data-diff]").forEach((btn) => {
  btn.addEventListener("click", () => {
    botDifficulty = btn.dataset.diff;
    diffSeg.querySelectorAll("[data-diff]").forEach((b) =>
      b.classList.toggle("active", b === btn));
  });
});

document.getElementById("btn-start-bot").addEventListener("click", () => {
  startGame("bot");
});

document.getElementById("reset").addEventListener("click", backToSetup);
document.getElementById("undo").addEventListener("click", () => {
  if (!state.history.length) return;
  if (botBusy) return;
  undoMove();
  if (botMode && state.history.length && state.turn === botColor) {
    undoMove();
  }
  selected = null;
  selectedMoves = [];
  render();
});

// Start on setup screen
turnPill.hidden = true;
