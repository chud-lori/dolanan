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
import { enableDrag } from "/shared/drag.js";
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
    material: "Draw — insufficient material.",
    promote: "Promote pawn",
    chooseMode: "Choose mode",
    modeHuman: "2 Players",
    modeBot: "vs Bot",
    botThinking: "Bot is thinking…",
    difficulty: "Difficulty",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    playAs: "Play as",
    colorWhite: "White",
    colorBlack: "Black",
    colorRandom: "Random",
    flip: "Flip",
    resign: "Resign",
    draw: "Draw",
    drawOffered: "Draw offered — opponent, tap Draw to accept",
    drawDeclined: "Draw declined.",
    resignedWhite: "White resigned — Black wins.",
    resignedBlack: "Black resigned — White wins.",
    drawAgreed: "Draw by agreement.",
    confirmTakeback: "Take back last move?",
    confirmResign: "Resign this game?",
    yes: "Yes",
    no: "No",
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
    material: "Seri — materi tidak cukup.",
    promote: "Promosi pion",
    chooseMode: "Pilih mode",
    modeHuman: "2 Pemain",
    modeBot: "vs Bot",
    botThinking: "Bot sedang berpikir…",
    difficulty: "Tingkat kesulitan",
    easy: "Mudah",
    medium: "Sedang",
    hard: "Sulit",
    playAs: "Main sebagai",
    colorWhite: "Putih",
    colorBlack: "Hitam",
    colorRandom: "Acak",
    flip: "Balik",
    resign: "Menyerah",
    draw: "Seri",
    drawOffered: "Tawaran seri — lawan, tekan Seri untuk setuju",
    drawDeclined: "Tawaran seri ditolak.",
    resignedWhite: "Putih menyerah — Hitam menang.",
    resignedBlack: "Hitam menyerah — Putih menang.",
    drawAgreed: "Seri atas kesepakatan.",
    confirmTakeback: "Urungkan langkah terakhir?",
    confirmResign: "Menyerah?",
    yes: "Ya",
    no: "Tidak",
  },
  jw: {
    subtitle: "2 pemain · aturan lengkap · hotseat",
    white: "Putih",
    black: "Ireng",
    turn: "Giliran {p}",
    mateWhite: "Skakmat — Putih menang.",
    mateBlack: "Skakmat — Ireng menang.",
    stalemate: "Seri — pat.",
    repetition: "Seri — posisi padha ping telu.",
    fiftyMove: "Seri — 50 langkah ora ana sing dipangan.",
    material: "Seri — bidak ora cukup.",
    promote: "Promosi pion",
    chooseMode: "Pilih mode",
    modeHuman: "2 Pemain",
    modeBot: "Lawan Bot",
    botThinking: "Bot lagi mikir…",
    difficulty: "Tingkat angele",
    easy: "Gampang",
    medium: "Sedheng",
    hard: "Angel",
    playAs: "Dolanan dadi",
    colorWhite: "Putih",
    colorBlack: "Ireng",
    colorRandom: "Acak",
    flip: "Walik",
    resign: "Nyerah",
    draw: "Seri",
    drawOffered: "Tawaran seri — lawan, pencet Seri kanggo nampa",
    drawDeclined: "Tawaran seri ditolak.",
    resignedWhite: "Putih nyerah — Ireng menang.",
    resignedBlack: "Ireng nyerah — Putih menang.",
    drawAgreed: "Seri amarga sepakat.",
    confirmTakeback: "Balekake langkah pungkasan?",
    confirmResign: "Arep nyerah?",
    yes: "Iya",
    no: "Ora",
  },
});

wireGameHead({
  titleEn: "Chess",
  titleId: "Catur",
  titleJw: "Catur",
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
        <li><strong>Draws</strong>: stalemate, threefold repetition, 50 moves without a capture/pawn move, or insufficient material (e.g. K vs K, K+B vs K).</li>
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
        <li><strong>Seri</strong>: pat, posisi sama tiga kali, 50 langkah tanpa makan/gerak pion, atau materi tidak cukup (misal K lawan K, K+G lawan K).</li>
      </ul>
      <h3>Versi ini</h3>
      <p>Hotseat saja — tanpa AI. Tap bidak untuk lihat langkah legal; tap target untuk jalan. Tombol Batalkan urungkan langkah terakhir.</p>`,
    jw: `
      <h3>Tujuan</h3>
      <p>Skakmat ratu lawan — serang nganti ora ana dalan ngungsi, mblokir, utawa mbelani.</p>
      <h3>Aturan spesial</h3>
      <ul>
        <li><strong>Rokade</strong> — ratu mlumpat rong kothak menyang benteng sing durung obah; benteng mlumpat menyang sisih liya.</li>
        <li><strong>En passant</strong> — mangan pion sing lagi loncat rong kothak ngliwati pionmu.</li>
        <li><strong>Promosi</strong> — pion tekan baris pungkasan dadi Mentri, Benteng, Gajah, utawa Jaran (kowe sing milih).</li>
        <li><strong>Seri</strong>: pat, posisi padha ping telu, 50 langkah tanpa mangan/obah pion, utawa bidak ora cukup.</li>
      </ul>
      <h3>Versi iki</h3>
      <p>Isa lawan manungsa (hotseat) utawa lawan bot. Pencet bidak kanggo weruh langkah legal; pencet target kanggo mlaku. Tombol Batalke ngembalekake langkah pungkasan.</p>`,
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

  // Insufficient material — per FIDE, a draw is declared when neither side
  // could possibly force checkmate with the material on the board:
  //   • K vs K
  //   • K + minor (B or N) vs K
  //   • K + B vs K + B with bishops of the same color
  if (!s.result && isInsufficientMaterial(s)) {
    s.result = "½-½ (material)";
  }
}

function isInsufficientMaterial(s) {
  // Collect non-king pieces per side, plus square color of each bishop.
  const sides = { w: [], b: [] };
  const bishopSquareColors = { w: [], b: [] };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c];
      if (!p) continue;
      if (p.type === "K") continue;
      // Any pawn, rook, or queen means mate is still forceable.
      if (p.type === "P" || p.type === "R" || p.type === "Q") return false;
      sides[p.color].push(p.type);
      if (p.type === "B") bishopSquareColors[p.color].push((r + c) % 2);
    }
  }
  const w = sides.w, b = sides.b;
  // K vs K
  if (w.length === 0 && b.length === 0) return true;
  // K + minor (B or N) vs K
  if (w.length === 1 && b.length === 0) return true;
  if (b.length === 1 && w.length === 0) return true;
  // K + B vs K + B, same-square-color bishops
  if (w.length === 1 && b.length === 1 &&
      w[0] === "B" && b[0] === "B" &&
      bishopSquareColors.w[0] === bishopSquareColors.b[0]) return true;
  // Two knights vs king: technically can't force mate (only win if opponent
  // blunders). FIDE does NOT auto-draw — it's a blockaded theoretical draw.
  // We follow FIDE and don't auto-draw.
  return false;
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
  apply(s, m) {
    // Snapshot the positions map BEFORE applyMove mutates it. Without this,
    // minimax exploration pollutes s.positions with every searched position,
    // and the real game spuriously detects threefold repetition after a
    // few moves.
    const saved = new Map(s.positions);
    applyMove(s, m);
    // Stash the snapshot on the history step so revert() can restore it.
    s.history[s.history.length - 1]._savedPositions = saved;
  },
  revert(s) {
    const step = s.history.pop();
    s.board = step.prev.board;
    s.turn = step.prev.turn;
    s.castling = step.prev.castling;
    s.enPassant = step.prev.enPassant;
    s.halfmove = step.prev.halfmove;
    s.result = step.prev.result;
    if (step._savedPositions) s.positions = step._savedPositions;
  },
  inCheck(s, color) { return isInCheck(s, color); },
};

let botMode = false;    // false = 2-player, true = vs bot
let botColor = "b";     // which side the bot plays
let humanColor = "w";   // which side the user plays (vs-bot only)
let botDifficulty = "medium";
let botBusy = false;
let flipped = false;    // flip board 180° (for hotseat black player's view)
let drawOfferedBy = null; // "w" | "b" | null — who offered a draw, if anyone
// Bumped on every newGame / backToSetup. doBotMove() captures this at entry;
// if it changes during the async search, the move is discarded — prevents
// the bot from applying a stale move to a fresh board.
let gameGen = 0;

function isBotTurn() {
  return botMode && state.turn === botColor && !state.result;
}

async function doBotMove() {
  if (!isBotTurn()) return;
  const myGen = gameGen;
  botBusy = true;
  render();
  // Small delay so the UI shows "Bot is thinking…" before the CPU-heavy search
  await new Promise((r) => setTimeout(r, 100));
  // Abort if the game was reset while we were waiting.
  if (myGen !== gameGen) { botBusy = false; return; }
  const move = findBestMove(state, engine, botDifficulty);
  // Abort again in case the game reset during the (synchronous but CPU-heavy)
  // search — the user might have tapped "New game" just before we returned.
  if (myGen !== gameGen) { botBusy = false; return; }
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
  // When `flipped`, iterate in reverse so row 7/col 7 is first (black's view).
  const rowOrder = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const colOrder = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  for (const r of rowOrder) {
    for (const c of colOrder) {
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

  renderCaptured();

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
      state.result.includes("material") ? t("ch.material") :
      state.result.includes("agreement") ? t("ch.drawAgreed") :
      state.result.includes("resign") ? t(state.result === "resign-w" ? "ch.resignedWhite" : "ch.resignedBlack") :
      state.result;
  } else {
    // Also clear stale text so that even if some browser chrome ignores
    // [hidden] the banner isn't showing a previous game's result.
    statusEl.hidden = true;
    statusEl.textContent = "";
    statusEl.className = "status-banner";
  }
  const promoTitle = document.getElementById("promo-title");
  if (promoTitle) promoTitle.textContent = t("ch.promote");

  // After game end, only "New game" is meaningful — Flip/Undo/Draw/Resign
  // don't apply to a finished game and just clutter the action row.
  const ended = !!state.result;
  for (const id of ["flip", "undo", "draw-btn", "resign"]) {
    const el = document.getElementById(id);
    if (el) el.hidden = ended;
  }
}

document.addEventListener("langchange", () => render());

// ---- Captured pieces -------------------------------------------------------

// Standard material values used for the "+N" advantage indicator.
const PIECE_VALUE = { P: 1, N: 3, B: 3, R: 5, Q: 9 };

function capturedPieces() {
  // Scan all history steps for move.captured. Builds two ordered-by-value
  // lists: captured BY white (i.e. captured black pieces) and BY black.
  const byWhite = []; // black pieces white took
  const byBlack = []; // white pieces black took
  for (const step of state.history) {
    const cap = step.move?.captured;
    if (!cap) continue;
    (cap.color === "b" ? byWhite : byBlack).push(cap.type);
  }
  const sortByVal = (a, b) => (PIECE_VALUE[b] || 0) - (PIECE_VALUE[a] || 0);
  byWhite.sort(sortByVal);
  byBlack.sort(sortByVal);
  return { byWhite, byBlack };
}

function renderCaptured() {
  const topEl = document.getElementById("captured-top");
  const botEl = document.getElementById("captured-bottom");
  if (!topEl || !botEl) return;
  const { byWhite, byBlack } = capturedPieces();

  // "Top" strip shows pieces captured BY the player at the top of the board.
  // Without flip, top = black; with flip, top = white. Similarly for bottom.
  const topColor = flipped ? "w" : "b";
  const bottomColor = flipped ? "b" : "w";

  function strip(color) {
    // color is the color of the player whose strip this is. They've captured
    // the OPPOSITE color's pieces.
    const captured = color === "w" ? byWhite : byBlack;
    const glyphs = captured.map((t) => {
      const opp = color === "w" ? "b" : "w";
      return `<span class="cap-piece ${opp === "w" ? "white" : "black"}">${GLYPH[opp][t]}</span>`;
    }).join("");
    // Material advantage (only shown if positive for this side).
    const myTotal = captured.reduce((s, t) => s + (PIECE_VALUE[t] || 0), 0);
    const oppCaptured = color === "w" ? byBlack : byWhite;
    const oppTotal = oppCaptured.reduce((s, t) => s + (PIECE_VALUE[t] || 0), 0);
    const advantage = myTotal - oppTotal;
    const adv = advantage > 0 ? `<span class="cap-advantage">+${advantage}</span>` : "";
    return glyphs + adv;
  }

  topEl.innerHTML = strip(topColor);
  botEl.innerHTML = strip(bottomColor);
}

// ---- Modal confirm helper --------------------------------------------------

function confirmDialog(message, onYes) {
  const root = document.createElement("div");
  root.className = "modal-backdrop";
  root.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <p style="margin: 8px 0 16px;">${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-no>${t("ch.no")}</button>
        <button type="button" class="btn btn-primary" data-yes>${t("ch.yes")}</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  const close = () => root.remove();
  root.querySelector("[data-yes]").addEventListener("click", () => { close(); onYes(); });
  root.querySelector("[data-no]").addEventListener("click", close);
  root.addEventListener("click", (e) => { if (e.target === root) close(); });
  root.querySelector("[data-yes]").focus();
}

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
  // Draw-offer lifecycle: if the OPPONENT moves after an offer, they've
  // implicitly declined. If the OFFERER themselves moves, the offer remains
  // pending for the opponent's next decision.
  const mover = state.turn;
  applyMove(state, move);
  if (drawOfferedBy && drawOfferedBy !== mover) drawOfferedBy = null;
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
const colorSeg = document.getElementById("color-seg");
const turnPill = document.getElementById("turn-pill");

// Pick the human's color: "w" | "b" | "r" (random) from the segmented toggle.
let humanColorChoice = "w";

function startGame(mode) {
  gameGen++;
  botMode = mode === "bot";
  botDifficulty = botDifficulty || "medium";
  botBusy = false;
  drawOfferedBy = null;

  // Resolve color in bot mode (no effect in 2-player mode).
  if (botMode) {
    humanColor = humanColorChoice === "r"
      ? (Math.random() < 0.5 ? "w" : "b")
      : humanColorChoice;
    botColor = humanColor === "w" ? "b" : "w";
    // If the human picked black, flip the board so their side is on the bottom.
    flipped = humanColor === "b";
  } else {
    flipped = false;
  }

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
  gameGen++;            // invalidate any in-flight bot search
  botBusy = false;
  setupEl.hidden = false;
  playEl.hidden = true;
  turnPill.hidden = true;
  statusEl.hidden = true;
  statusEl.textContent = "";
  statusEl.className = "status-banner";
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

colorSeg.querySelectorAll("[data-color]").forEach((btn) => {
  btn.addEventListener("click", () => {
    humanColorChoice = btn.dataset.color;
    colorSeg.querySelectorAll("[data-color]").forEach((b) =>
      b.classList.toggle("active", b === btn));
  });
});

document.getElementById("btn-start-bot").addEventListener("click", () => {
  startGame("bot");
});

document.getElementById("reset").addEventListener("click", backToSetup);

// ---- Flip board ----
document.getElementById("flip").addEventListener("click", () => {
  flipped = !flipped;
  render();
});

// ---- Resign ----
document.getElementById("resign").addEventListener("click", () => {
  if (state.result || botBusy) return;
  confirmDialog(t("ch.confirmResign"), () => {
    // Distinct result strings so render()'s status mapping uses the correct
    // localized message (see the state.result.includes("resign") branch).
    state.result = state.turn === "w" ? "resign-w" : "resign-b";
    fx.play("lose"); fx.haptic("lose");
    render();
  });
});

// ---- Offer / accept draw ----
document.getElementById("draw-btn").addEventListener("click", () => {
  if (state.result || botBusy) return;

  if (botMode) {
    // Bot decides: accept only if its evaluation favors the human (or dead equal).
    // Using a simple material-count heuristic here keeps this lightweight.
    const bal = materialBalance(state);
    const humanSign = humanColor === "w" ? 1 : -1;
    // If the bot is at least slightly worse or drawish from its own POV, accept.
    const botPerspective = -humanSign * bal;
    if (botPerspective <= 0.5) {
      state.result = "½-½ (agreement)";
      fx.play("lose"); fx.haptic("tap");
      render(); // render() sets the status text AND hides end-game buttons
    } else {
      // Bot declines — show a banner that clears on next move.
      showTransient(t("ch.drawDeclined"));
    }
    return;
  }

  // 2-player hotseat: one side offers, the other accepts by tapping Draw too.
  if (drawOfferedBy && drawOfferedBy !== state.turn) {
    state.result = "½-½ (agreement)";
    statusEl.hidden = false;
    statusEl.className = "status-banner draw";
    statusEl.textContent = t("ch.drawAgreed");
    drawOfferedBy = null;
    render();
    return;
  }
  drawOfferedBy = state.turn;
  showTransient(t("ch.drawOffered"));
});

function materialBalance(s) {
  // Positive = white ahead, negative = black ahead. Kings excluded.
  const V = { P: 1, N: 3, B: 3, R: 5, Q: 9 };
  let bal = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c];
      if (!p || p.type === "K") continue;
      bal += (p.color === "w" ? 1 : -1) * (V[p.type] || 0);
    }
  }
  return bal;
}

function showTransient(message) {
  statusEl.hidden = false;
  statusEl.className = "status-banner draw";
  statusEl.textContent = message;
}

document.getElementById("undo").addEventListener("click", () => {
  if (!state.history.length) return;
  if (botBusy) return;
  // In bot mode, confirm so a tap doesn't accidentally rewind.
  if (botMode) {
    confirmDialog(t("ch.confirmTakeback"), () => doUndo());
    return;
  }
  doUndo();
});

function doUndo() {
  if (!state.history.length) return;
  undoMove();
  if (botMode && state.history.length && state.turn === botColor) {
    undoMove();
  }
  selected = null;
  selectedMoves = [];
  render();
}

// Drag-and-drop support — reuses tap-to-select logic by firing clicks.
enableDrag(boardEl, {
  pieceSelector: ".ch-piece",
  cellFromPoint: (x, y) => document.elementFromPoint(x, y)?.closest(".ch-sq"),
  onDragStart: (cell) => cell.click(),
  onDrop: (cell) => cell.click(),
});

// Start on setup screen
turnPill.hidden = true;
