// Halma — 2 players on a 9×9 grid with 6 pieces per side.
// (Simplified for mobile from the classic 16×16, 19-piece variant.)
//
// Rules:
//   • Each player has 6 pieces in opposite triangular corners.
//     Red starts in the bottom-left corner, Blue in the top-right.
//   • On your turn, move ONE piece. Two move types:
//       - Step: into any of 8 adjacent empty cells.
//       - Jump: over an adjacent piece (own or opponent's) to the empty
//         cell directly beyond. Multi-jumps allowed — you can keep jumping
//         with the same piece. Tap "End jump" or click an unrelated cell
//         to commit the chain.
//   • No captures — pieces are never removed.
//   • Win: get all 6 of your pieces into the opponent's starting corner.

import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";

register("hl", {
  en: {
    subtitle: "2 players · step or jump · fill the far corner",
    red: "Red", blue: "Blue",
    turn: "{p}'s turn",
    win: "{p} wins!",
    keepJumping: "Keep jumping or tap End jump.",
    endJump: "End jump",
  },
  id: {
    subtitle: "2 pemain · jalan atau loncat · isi sudut seberang",
    red: "Merah", blue: "Biru",
    turn: "Giliran {p}",
    win: "{p} menang!",
    keepJumping: "Lanjut loncat atau tekan Selesai loncat.",
    endJump: "Selesai loncat",
  },
  jw: {
    subtitle: "2 pemain · mlaku utawa mlumpat · kebak sudut sebrang",
    red: "Abang", blue: "Biru",
    turn: "Giliran {p}",
    win: "{p} menang!",
    keepJumping: "Terusna mlumpat utawa pencet Mari mlumpat.",
    endJump: "Mari mlumpat",
  },
});

wireGameHead({
  titleEn: "Halma",
  titleId: "Halma",
  subtitleKey: "hl.subtitle",
  rules: {
    en: `
      <h3>Goal</h3>
      <p>Be the first to move all 6 of your pieces into the opponent's starting corner.</p>
      <h3>Movement</h3>
      <ul>
        <li><strong>Step</strong> — move one piece into any of the 8 adjacent empty cells.</li>
        <li><strong>Jump</strong> — leap over an adjacent piece (your own or opponent's) into the empty cell directly beyond. You can chain multiple jumps with the same piece.</li>
        <li>No captures — pieces stay on the board.</li>
        <li>Mid-chain, tap <em>End jump</em> to commit, or just keep jumping if more landings are available.</li>
      </ul>`,
    id: `
      <h3>Tujuan</h3>
      <p>Pindahkan keenam bidakmu ke sudut awal lawan duluan.</p>
      <h3>Gerakan</h3>
      <ul>
        <li><strong>Jalan</strong> — pindah satu bidak ke salah satu dari 8 kotak tetangga yang kosong.</li>
        <li><strong>Loncat</strong> — lompati bidak tetangga (sendiri atau lawan) ke kotak kosong tepat di seberangnya. Bisa loncat berantai dengan bidak yang sama.</li>
        <li>Tidak ada makan — semua bidak tetap di papan.</li>
        <li>Saat loncat berantai, tekan <em>Selesai loncat</em> untuk mengakhiri, atau terus loncat selama masih bisa.</li>
      </ul>`,
    jw: `
      <h3>Tujuan</h3>
      <p>Pindhah enem bidakmu kabeh menyang pojok wiwitan lawan luwih dhisik.</p>
      <h3>Gerakan</h3>
      <ul>
        <li><strong>Mlaku</strong> — pindhah siji bidak menyang salah siji saka 8 kothak jejer sing kosong.</li>
        <li><strong>Mlumpat</strong> — mlumpati bidak jejer (dhewe utawa lawan) menyang kothak kosong ing sebrang. Bisa nyambung mlumpat karo bidak sing padha.</li>
        <li>Ora ana mati — kabeh bidak tetep ana papan.</li>
      </ul>`,
  },
});

// ---- Constants ----
const N = 9;
// Each player's home corner — also their goal (must fill the OPPONENT's home).
const RED_HOME  = [[8,0],[8,1],[8,2],[7,0],[7,1],[6,0]];
const BLUE_HOME = [[0,8],[0,7],[0,6],[1,8],[1,7],[2,8]];

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");
const turnDot = document.querySelector("#turn-pill .turn-dot");
const endJumpBtn = document.getElementById("end-jump");

let board, current, selected, legalDests, jumpChain, done;
// Set membership for quick "is this cell in zone X" checks
const RED_ZONE  = new Set(RED_HOME.map(([r,c]) => `${r},${c}`));
const BLUE_ZONE = new Set(BLUE_HOME.map(([r,c]) => `${r},${c}`));

function inB(r, c) { return r >= 0 && c >= 0 && r < N && c < N; }
function key(r, c) { return `${r},${c}`; }
function pieceAt(r, c) { return inB(r, c) ? board[r][c] : null; }
function colorName(p) { return t(p === "R" ? "hl.red" : "hl.blue"); }

const DIRS = [
  [-1,-1],[-1,0],[-1,1],
  [ 0,-1],       [ 0,1],
  [ 1,-1],[ 1,0],[ 1,1],
];

function newGame() {
  board = Array.from({ length: N }, () => Array(N).fill(null));
  for (const [r, c] of RED_HOME)  board[r][c] = "R";
  for (const [r, c] of BLUE_HOME) board[r][c] = "B";
  current = "R";
  selected = null;
  legalDests = [];
  jumpChain = null; // { startR, startC, lastR, lastC, visited:Set } when in a jump chain
  done = false;
  statusEl.hidden = true;
  endJumpBtn.hidden = true;
  render();
}

// ---- Move generation ----

function legalStepsFrom(r, c) {
  const out = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (inB(nr, nc) && !pieceAt(nr, nc)) {
      out.push({ to: [nr, nc], jump: false });
    }
  }
  return out;
}

function legalJumpsFrom(r, c, visited = new Set([key(r, c)])) {
  const out = [];
  for (const [dr, dc] of DIRS) {
    const mr = r + dr, mc = c + dc;
    const lr = r + dr * 2, lc = c + dc * 2;
    if (!inB(lr, lc)) continue;
    if (!pieceAt(mr, mc)) continue;       // need a piece to jump
    if (pieceAt(lr, lc)) continue;        // landing must be empty
    if (visited.has(key(lr, lc))) continue;
    out.push({ to: [lr, lc], jump: true });
  }
  return out;
}

function checkWin() {
  // Red wins by occupying every BLUE_HOME cell with red pieces.
  const redIn = BLUE_HOME.every(([r, c]) => board[r][c] === "R");
  const blueIn = RED_HOME.every(([r, c]) => board[r][c] === "B");
  if (redIn) return "R";
  if (blueIn) return "B";
  return null;
}

// ---- Click logic ----

function selectPiece(r, c) {
  selected = [r, c];
  legalDests = [...legalStepsFrom(r, c), ...legalJumpsFrom(r, c)];
  render();
}

function attemptMove(r, c) {
  if (!selected) return;
  const dest = legalDests.find((m) => m.to[0] === r && m.to[1] === c);
  if (!dest) return;

  const [fr, fc] = selected;
  board[fr][fc] = null;
  board[r][c] = current;
  fx.play(dest.jump ? "capture" : "place");
  fx.haptic(dest.jump ? "capture" : "tap");

  if (dest.jump) {
    // Start (or continue) a jump chain
    if (!jumpChain) {
      jumpChain = { startR: fr, startC: fc, visited: new Set([key(fr, fc)]) };
    }
    jumpChain.visited.add(key(r, c));
    jumpChain.lastR = r;
    jumpChain.lastC = c;
    selected = [r, c];
    legalDests = legalJumpsFrom(r, c, jumpChain.visited);
    if (legalDests.length === 0) {
      // No more jumps available — auto-end the turn
      finishTurn();
      return;
    }
    endJumpBtn.hidden = false;
    statusEl.hidden = false;
    statusEl.className = "status-banner";
    statusEl.textContent = t("hl.keepJumping");
    render();
    return;
  }

  // Simple step — turn ends.
  finishTurn();
}

function finishTurn() {
  selected = null;
  legalDests = [];
  jumpChain = null;
  endJumpBtn.hidden = true;

  const winner = checkWin();
  if (winner) {
    done = true;
    statusEl.hidden = false;
    statusEl.className = "status-banner win";
    statusEl.textContent = t("hl.win", { p: colorName(winner) });
    fx.play("win"); fx.haptic("win");
  } else {
    current = current === "R" ? "B" : "R";
    statusEl.hidden = true;
    statusEl.textContent = "";
    statusEl.className = "status-banner";
  }
  render();
}

function onCellClick(r, c) {
  if (done) return;

  // Mid-jump-chain — only the moving piece can land on a valid jump destination.
  if (jumpChain) {
    const dest = legalDests.find((m) => m.to[0] === r && m.to[1] === c);
    if (dest) attemptMove(r, c);
    return;
  }

  const p = pieceAt(r, c);

  // If a piece is already selected, this click is either a destination or
  // a re-selection of another own piece.
  if (selected) {
    const dest = legalDests.find((m) => m.to[0] === r && m.to[1] === c);
    if (dest) {
      attemptMove(r, c);
      return;
    }
    if (p === current) {
      selectPiece(r, c);
      return;
    }
    // Click on something irrelevant — deselect
    selected = null;
    legalDests = [];
    render();
    return;
  }

  // Nothing selected — pick our own piece.
  if (p === current) selectPiece(r, c);
}

// ---- Render ----

function render() {
  boardEl.innerHTML = "";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "hl-cell";
      if (RED_ZONE.has(key(r, c))) cell.classList.add("zone-R");
      if (BLUE_ZONE.has(key(r, c))) cell.classList.add("zone-B");
      cell.setAttribute("aria-label", `row ${r + 1} col ${c + 1}`);

      if (selected && selected[0] === r && selected[1] === c) {
        cell.classList.add("selected");
      }
      if (legalDests.some((m) => m.to[0] === r && m.to[1] === c)) {
        cell.classList.add("hint");
      }
      if (jumpChain && jumpChain.startR === r && jumpChain.startC === c) {
        cell.classList.add("last");
      }

      const p = board[r][c];
      if (p) {
        const piece = document.createElement("span");
        piece.className = `hl-piece ${p}`;
        cell.appendChild(piece);
      }

      cell.addEventListener("click", () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }

  turnLabel.textContent = done ? "—" : t("hl.turn", { p: colorName(current) });
  turnDot.className = "turn-dot " + (current === "R" ? "red" : "blue");

  // Hide the New-game-only safety: the End jump button is only useful mid-chain
  endJumpBtn.hidden = done || !jumpChain;

  // Hide Reset isn't needed — it always shows
}

// ---- Wiring ----

endJumpBtn.addEventListener("click", () => {
  if (!jumpChain) return;
  finishTurn();
});

document.getElementById("reset").addEventListener("click", newGame);
document.addEventListener("langchange", render);

newGame();
