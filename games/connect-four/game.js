// Connect Four — 7 cols × 6 rows, gravity drop, 4-in-a-row win detection.
//
// Rendering note: the drop animation is triggered only on the newly placed
// disc, not on every render — otherwise existing pieces re-animate each turn.

import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";

register("c4", {
  en: {
    subtitle: "2 players · line up four to win",
    red: "Red",
    yellow: "Yellow",
    turn: "{p}'s turn",
    win: "{p} wins!",
    draw: "Draw.",
  },
  id: {
    subtitle: "2 pemain · sejajarkan empat",
    red: "Merah",
    yellow: "Kuning",
    turn: "Giliran {p}",
    win: "{p} menang!",
    draw: "Seri.",
  },
  jw: {
    subtitle: "2 pemain · urutake papat sebaris",
    red: "Abang",
    yellow: "Kuning",
    turn: "Giliran {p}",
    win: "{p} menang!",
    draw: "Seri.",
  },
});

wireGameHead({
  titleEn: "Connect Four",
  titleId: "Connect Four",
  titleJw: "Connect Four",
  subtitleKey: "c4.subtitle",
  rules: {
    en: `
      <h3>Goal</h3>
      <p>Line up four of your discs in a row — horizontal, vertical, or diagonal.</p>
      <h3>Play</h3>
      <ul>
        <li>Red goes first. Tap a column to drop your disc; it slides to the lowest empty slot.</li>
        <li>If the board fills with no four-in-a-row, it's a draw.</li>
      </ul>`,
    id: `
      <h3>Tujuan</h3>
      <p>Sejajarkan empat bidakmu — horizontal, vertikal, atau diagonal.</p>
      <h3>Cara main</h3>
      <ul>
        <li>Merah duluan. Tap kolom buat jatuhin bidak — otomatis ke slot paling bawah.</li>
        <li>Kalau papan penuh tanpa empat sebaris, seri.</li>
      </ul>`,
    jw: `
      <h3>Tujuan</h3>
      <p>Urutake papat bidakmu sebaris — horizontal, vertikal, utawa diagonal.</p>
      <h3>Carane dolanan</h3>
      <ul>
        <li>Abang mlaku dhisik. Pencet kolom kanggo ngedhokake bidak — otomatis mudhun menyang slot paling ngisor.</li>
        <li>Yen papan kebak ora ana papat sebaris, seri.</li>
      </ul>`,
  },
});

const ROWS = 6;
const COLS = 7;
const NEED = 4;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");
const turnDot = document.querySelector("#turn-pill .turn-dot");

let grid, slots, current, done;

function pName(p) { return t(p === "R" ? "c4.red" : "c4.yellow"); }

function renderStatusBar() {
  turnLabel.textContent = done ? "—" : t("c4.turn", { p: pName(current) });
  turnDot.className = "turn-dot " + (current === "R" ? "red" : "yellow");
}

function syncSlotsDisabled() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      slots[r][c].disabled = done || !!grid[r][c] || lowestEmpty(c) !== r;
    }
  }
}

function lowestEmpty(col) {
  for (let r = ROWS - 1; r >= 0; r--) if (!grid[r][col]) return r;
  return -1;
}

function checkWin(r, c, p) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const line = [[r, c]];
    for (let s = 1; s < NEED; s++) {
      const nr = r + dr * s, nc = c + dc * s;
      if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || grid[nr][nc] !== p) break;
      line.push([nr, nc]);
    }
    for (let s = 1; s < NEED; s++) {
      const nr = r - dr * s, nc = c - dc * s;
      if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || grid[nr][nc] !== p) break;
      line.push([nr, nc]);
    }
    if (line.length >= NEED) return line;
  }
  return null;
}

function placeDisc(r, col, player, { animate }) {
  const slot = slots[r][col];
  slot.innerHTML = "";
  const disc = document.createElement("span");
  disc.className = `c4-disc ${player === "R" ? "red" : "yellow"}`;
  if (animate) disc.style.setProperty("--drop-distance", `${(r + 1) * 100}%`);
  else disc.classList.add("no-anim");
  slot.appendChild(disc);
}

function drop(col) {
  if (done) return;
  const r = lowestEmpty(col);
  if (r < 0) return;
  grid[r][col] = current;
  placeDisc(r, col, current, { animate: true });
  fx.play("place"); fx.haptic("tap");

  const win = checkWin(r, col, current);
  if (win) {
    done = true;
    statusEl.textContent = t("c4.win", { p: pName(current) });
    statusEl.className = "status-banner win";
    statusEl.hidden = false;
    for (const [rr, cc] of win) {
      slots[rr][cc].querySelector(".c4-disc")?.classList.add("win");
    }
    fx.play("win"); fx.haptic("win");
    syncSlotsDisabled();
    renderStatusBar();
    return;
  }
  if (grid.flat().every(Boolean)) {
    done = true;
    statusEl.textContent = t("c4.draw");
    statusEl.className = "status-banner draw";
    statusEl.hidden = false;
    syncSlotsDisabled();
    renderStatusBar();
    return;
  }
  current = current === "R" ? "Y" : "R";
  syncSlotsDisabled();
  renderStatusBar();
}

function buildBoard() {
  boardEl.innerHTML = "";
  slots = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "c4-slot";
      btn.setAttribute("aria-label", `row ${r + 1} column ${c + 1}`);
      btn.addEventListener("click", () => drop(c));
      boardEl.appendChild(btn);
      row.push(btn);
    }
    slots.push(row);
  }
}

function newRound() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  current = "R";
  done = false;
  statusEl.hidden = true;
  buildBoard();
  syncSlotsDisabled();
  renderStatusBar();
}

document.getElementById("reset").addEventListener("click", newRound);
// Language change only affects text; board state is preserved.
document.addEventListener("langchange", renderStatusBar);
newRound();
