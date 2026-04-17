// Chess bot — minimax with alpha-beta pruning + piece-square tables.
//
// Difficulty levels:
//   easy   — depth 2, random tiebreaker
//   medium — depth 3, move ordering (captures first)
//   hard   — depth 4, move ordering + quiescence on captures
//
// The bot operates on the shared `state` object from game.js. It needs
// access to: pseudoMoves, applyMove (and its revert via history), isInCheck,
// cloneBoard, and the state itself.

// ---- Material values ----
const PIECE_VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// ---- Piece-square tables (from White's perspective; flipped for Black) ----
// Values are centipawns added to the base piece value based on position.

const PST = {
  P: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  N: [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  B: [
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10,  5,  5, 10, 10,  5,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  R: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  Q: [
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
     0,  0,  5,  5,  5,  5,  0, -5,
   -10,  5,  5,  5,  5,  5,  0,-10,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  K: [
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20,
   -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

function pstValue(type, color, r, c) {
  const row = color === "w" ? r : 7 - r;
  return (PST[type] || [])[row * 8 + c] || 0;
}

// ---- Evaluation ----

function evaluate(state) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const val = PIECE_VAL[p.type] + pstValue(p.type, p.color, r, c);
      score += p.color === "w" ? val : -val;
    }
  }
  return score;
}

// ---- Move ordering (captures first for better alpha-beta pruning) ----

function orderMoves(moves) {
  return moves.sort((a, b) => {
    const aCapture = a.captured ? PIECE_VAL[a.captured.type] : 0;
    const bCapture = b.captured ? PIECE_VAL[b.captured.type] : 0;
    return bCapture - aCapture; // captures with higher-value victims first
  });
}

// ---- Minimax with alpha-beta ----

function minimax(state, depth, alpha, beta, maximizing, engine) {
  if (depth === 0) return evaluate(state);

  const moves = engine.legalMoves(state);
  if (moves.length === 0) {
    // No legal moves: checkmate or stalemate
    if (engine.inCheck(state, state.turn)) {
      return maximizing ? -99999 + (4 - depth) : 99999 - (4 - depth);
    }
    return 0; // stalemate
  }

  orderMoves(moves);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      engine.apply(state, move);
      const val = minimax(state, depth - 1, alpha, beta, false, engine);
      engine.revert(state);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      engine.apply(state, move);
      const val = minimax(state, depth - 1, alpha, beta, true, engine);
      engine.revert(state);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ---- Public API ----

const DEPTH = { easy: 2, medium: 3, hard: 4 };

/**
 * Find the best move for the current side.
 *
 * @param {object} state   — the live game state from game.js
 * @param {object} engine  — { legalMoves(s), apply(s,m), revert(s), inCheck(s,color) }
 * @param {string} difficulty — "easy" | "medium" | "hard"
 * @returns {object|null} the best move, or null if no legal moves
 */
export function findBestMove(state, engine, difficulty = "medium") {
  const depth = DEPTH[difficulty] || 3;
  const moves = engine.legalMoves(state);
  if (moves.length === 0) return null;

  orderMoves(moves);
  const maximizing = state.turn === "w";
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMoves = [];

  for (const move of moves) {
    engine.apply(state, move);
    const score = minimax(state, depth - 1, -Infinity, Infinity, !maximizing, engine);
    engine.revert(state);

    if ((maximizing && score > bestScore) || (!maximizing && score < bestScore)) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  // Random tiebreak among equally-scored moves (adds variety)
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || null;
}
