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

// Inline pawn silhouette. Shared across all 4 colors — CSS per-color rules
// fill `.p-base / .p-body / .p-neck / .p-head` with the team palette.
const PAWN_SVG = `<svg class="lu-pawn" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <ellipse class="p-base" cx="12" cy="28" rx="10" ry="2.5"/>
  <path class="p-body" d="M 5.5 24 C 4 16 9 13 12 13 C 15 13 20 16 18.5 24 Z"/>
  <ellipse class="p-neck" cx="12" cy="13" rx="5.5" ry="1.2"/>
  <circle class="p-head" cx="12" cy="7.5" r="5.5"/>
  <ellipse class="p-shine" cx="10" cy="6" rx="1.8" ry="1.2"/>
</svg>`;

// Once-only callback wrapper — used to guard the FLIP transitionend handler
// from firing twice (the fallback setTimeout is a safety net).
function doOnce(fn) {
  let called = false;
  return () => { if (!called) { called = true; fn(); } };
}

// Step-by-step pawn walk + kick-back animation for captured pawns.
//
// The walker transform-translates through each waypoint along its path. Any
// pawn that moveToken sent back to base (`capturedInfo`) has already been
// re-rendered at its base cell; we snap each of those back to the capture
// cell visually (so they're *there* while the walker is approaching), and
// once the walker arrives we release the snap and let them slide — with a
// slight overshoot — to their natural base position. The "kick" reads as:
// walker lands on cell → opponent(s) launch off toward their base.
async function animatePath(boardEl, color, idx, oldRect, waypointRects, capturedInfo, onDone) {
  const done = onDone ? doOnce(onDone) : null;

  // Respect OS-level "reduce motion" — skip straight to the resting state.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    done?.();
    return;
  }

  // Snap each captured pawn to its pre-capture cell so it stays visible
  // there while the walker is approaching; we'll release these below once
  // the walker arrives at the target cell.
  const capturedEls = [];
  for (const cap of (capturedInfo || [])) {
    if (!cap.fromRect) continue;
    const el = boardEl.querySelector(`.lu-tok.${cap.color}[data-idx="${cap.idx}"]`);
    if (!el) continue;
    const baseRect = el.getBoundingClientRect();
    const dx = cap.fromRect.left - baseRect.left;
    const dy = cap.fromRect.top - baseRect.top;
    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    // Keep captured pawn visually BELOW the walker so the walker appears to
    // land on top and knock it away (rather than obscuring the walker).
    el.style.zIndex = "1";
    void el.offsetWidth;
    capturedEls.push(el);
  }

  if (!oldRect || !waypointRects?.length) {
    // Nothing for the walker to do — still animate any captures out of here.
    await animateKickedHome(capturedEls);
    done?.();
    return;
  }
  const walker = boardEl.querySelector(`.lu-tok.${color}[data-idx="${idx}"]`);
  if (!walker) {
    await animateKickedHome(capturedEls);
    done?.();
    return;
  }
  const finalRect = walker.getBoundingClientRect();
  const baseTransform = walker.style.transform || "";

  // Snap the walker back to its starting cell so the first hop animates
  // from the correct origin.
  const dx0 = oldRect.left - finalRect.left;
  const dy0 = oldRect.top - finalRect.top;
  walker.style.transition = "none";
  walker.style.transform = `translate(${dx0}px, ${dy0}px)`;
  void walker.offsetWidth;

  const total = waypointRects.length;
  const stepMs = total === 1 ? 260 : 140;

  for (let i = 0; i < total; i++) {
    const r = waypointRects[i];
    const isLast = i === total - 1;
    const dx = r.left - finalRect.left;
    const dy = r.top - finalRect.top;
    const easing = total === 1
      ? "cubic-bezier(0.4, 0, 0.2, 1)"
      : (isLast ? "cubic-bezier(0.2, 0.7, 0.3, 1)" : "linear");

    walker.style.transition = `transform ${stepMs}ms ${easing}`;
    walker.style.transform = isLast
      ? baseTransform
      : `translate(${dx}px, ${dy}px)`;

    await new Promise((resolve) => {
      let called = false;
      const finish = () => {
        if (called) return;
        called = true;
        walker.removeEventListener("transitionend", finish);
        resolve();
      };
      walker.addEventListener("transitionend", finish);
      setTimeout(finish, stepMs + 120);
    });
  }

  // Walker has landed — kick the captured pawns off toward their home bases.
  await animateKickedHome(capturedEls);

  done?.();
}

// Each captured pawn was pre-snapped to its capture cell. Transitioning
// transform back to "" releases it to its natural (base cell) position.
// The overshoot easing gives a satisfying "bounced back" feel.
function animateKickedHome(els) {
  if (!els?.length) return Promise.resolve();
  return Promise.all(els.map((el) => new Promise((resolve) => {
    el.style.transition = "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "";
    let called = false;
    const finish = () => {
      if (called) return;
      called = true;
      el.removeEventListener("transitionend", finish);
      el.style.transition = "";
      el.style.zIndex = "";
      resolve();
    };
    el.addEventListener("transitionend", finish);
    setTimeout(finish, 550);
  })));
}
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
  jw: {
    subtitle: "2–4 pemain · kocok 6 kanggo metu · balapan mulih",
    red: "Abang", green: "Ijo", yellow: "Kuning", blue: "Biru",
    turn: "Giliran {p}",
    win: "{p} menang!",
    hintTap: "Pencet Kocok kanggo miwiti.",
    hintPick: "Entuk {n} — pilih bidak sing arep dipindhah.",
    hintNoMove6: "Ora isa mlaku. Kocok maneh giliran ngarep.",
    hintNoMove: "Entuk {n} — ora ana sing isa mlaku.",
    hintForfeit: "Ping telu 6 — giliran ilang.",
    hintSix: "Entuk 6 — kocok maneh!",
    hintCapture: "Mangan lawan! Kocok maneh.",
  },
});

wireGameHead({
  titleEn: "Ludo",
  titleId: "Ludo",
  titleJw: "Ludo",
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
    jw: `
      <h3>Tujuan</h3>
      <p>Gawa kabeh bidakmu papat ngubengi papan tekan tengah dhisik.</p>
      <h3>Gerakan</h3>
      <ul>
        <li>Kocok <strong>6</strong> kanggo ngetokake bidak saka home base.</li>
        <li>Bidak mlaku ngubengi jarum jam ing 52 kothak track, banjur mlebu jalur werna dhewe menyang tengah.</li>
        <li>Kudu entuk angka pas kanggo tekan finish.</li>
      </ul>
      <h3>Mangan lan aman</h3>
      <ul>
        <li>Mudhun ing kothak bidak lawan = lawan bali menyang home base.</li>
        <li><strong>Kothak aman</strong> (entry + lintang) ora isa dipangan.</li>
        <li>Loro bidak werna padha ora isa ing kothak padha.</li>
      </ul>
      <h3>Bonus kocok</h3>
      <ul>
        <li>Entuk 6 → kocok maneh.</li>
        <li>Mangan lawan → kocok maneh.</li>
        <li>Ping telu 6 turutan → giliran ilang.</li>
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
    // `animating` is true during the FLIP slide so clicks/rolls are locked
    // out — otherwise a second click during the 360ms slide would trigger a
    // re-render that wipes the in-flight animation.
    animating: false,
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
  if (state.done || state.rolledThisTurn || state.animating) return;
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

  // UX: when there's only one possible move, don't ask the player to pick —
  // auto-select it after a short pause so they still see the glow + hint
  // update. Runs through the same onTokenClick path so the walk animation
  // and bonus/turn logic stay identical to a manual click.
  if (movable.length === 1) {
    setTimeout(() => {
      if (state.animating || state.done) return;
      onTokenClick(currentColor(), movable[0]);
    }, 500);
  }
}

// Compute the pixel rect for every cell the pawn passes through on this move.
// Must be called BEFORE moveToken+render mutate state/DOM (we read rects off
// the currently-rendered cells). For a token leaving base the path is a single
// hop onto the entry square; otherwise the pawn walks through positions
// startPos+1, startPos+2, ..., startPos+roll (which may cross from the track
// into the home column — cellForPos handles that seamlessly).
function computeWaypointRects(color, tokenIdx, startPos, roll) {
  const stops = [];
  if (startPos === -1) {
    stops.push(0);
  } else {
    for (let s = 1; s <= roll; s++) stops.push(startPos + s);
  }
  const rects = [];
  for (const pos of stops) {
    const [r, c] = cellForPos(color, tokenIdx, pos);
    const cellEl = boardEl.querySelector(`.lu-cell[data-r="${r}"][data-c="${c}"]`);
    if (cellEl) rects.push(cellEl.getBoundingClientRect());
  }
  return rects;
}

function onTokenClick(color, idx) {
  if (state.done) return;
  if (state.animating) return;
  if (color !== currentColor()) return;
  if (!state.rolledThisTurn) return;
  const movable = movableTokens(color, state.roll);
  if (!movable.includes(idx)) return;

  // --- Snapshot everything the animation needs BEFORE state mutates. ---
  const startPos = state.players[color].tokens[idx];
  const oldEl = boardEl.querySelector(`.lu-tok.${color}[data-idx="${idx}"]`);
  const oldRect = oldEl ? oldEl.getBoundingClientRect() : null;
  const waypointRects = computeWaypointRects(color, idx, startPos, state.roll);
  const rolledSix = state.roll === 6;

  // Snapshot every opponent pawn's current state + DOM rect. We don't know
  // yet which (if any) moveToken will knock back to base; we diff afterwards.
  const beforeTokens = {};
  const opponentRects = new Map();
  for (const c of state.colors) {
    beforeTokens[c] = [...state.players[c].tokens];
    if (c === color) continue;
    for (let j = 0; j < 4; j++) {
      const el = boardEl.querySelector(`.lu-tok.${c}[data-idx="${j}"]`);
      if (el) opponentRects.set(`${c}:${j}`, el.getBoundingClientRect());
    }
  }

  const { captured } = moveToken(color, idx, state.roll);

  // Diff: any opponent token that moved from on-track to -1 was captured.
  const capturedInfo = [];
  for (const c of state.colors) {
    if (c === color) continue;
    for (let j = 0; j < 4; j++) {
      if (beforeTokens[c][j] !== -1 && state.players[c].tokens[j] === -1) {
        capturedInfo.push({
          color: c,
          idx: j,
          fromRect: opponentRects.get(`${c}:${j}`) || null,
        });
      }
    }
  }

  const gameOver = state.done;
  const bonus = !gameOver && (rolledSix || captured);

  if (bonus) {
    hintEl.textContent = rolledSix ? t("lu.hintSix") : t("lu.hintCapture");
    state.rolledThisTurn = false;
    state.roll = null;
  }

  // Lock out concurrent clicks/rolls until the walk + kicks finish.
  state.animating = true;
  render();
  animatePath(boardEl, color, idx, oldRect, waypointRects, capturedInfo, () => {
    state.animating = false;
    if (gameOver) { render(); return; }
    if (bonus) render();      // refresh so rollBtn re-enables + glow updates
    else endTurn();           // advance turn + re-render
  });
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
        // dataset attrs used by animateFlip() to find the moved token after render
        el.dataset.color = tok.color;
        el.dataset.idx = tok.idx;
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
        el.innerHTML = PAWN_SVG;
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
  rollBtn.disabled = state.done || state.rolledThisTurn || state.animating;
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
