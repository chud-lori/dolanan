// Tic-Tac-Toe — 3x3, X starts, series score persisted in localStorage.

import { storage } from "/shared/storage.js";
import { renderGrid, createGrid } from "/shared/board.js";
import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";

register("ttt", {
  en: {
    subtitle: "2 players · first to three in a row",
    turn: "{p}'s turn",
    win: "{p} wins!",
    draw: "Draw.",
    draws: "Draws",
  },
  id: {
    subtitle: "2 pemain · tiga sebaris duluan",
    turn: "Giliran {p}",
    win: "{p} menang!",
    draw: "Seri.",
    draws: "Seri",
  },
  jw: {
    subtitle: "2 pemain · telu sebaris dhisik",
    turn: "Giliran {p}",
    win: "{p} menang!",
    draw: "Seri.",
    draws: "Seri",
  },
});

wireGameHead({
  titleEn: "Tic-Tac-Toe",
  titleId: "Tik-Tak-Toe",
  titleJw: "Tik-Tak-Toe",
  subtitleKey: "ttt.subtitle",
  rules: {
    en: `
      <h3>Goal</h3>
      <p>Be first to line up three of your marks in a row — horizontally,
      vertically, or diagonally.</p>
      <h3>Play</h3>
      <ul>
        <li>X goes first. Take turns tapping any empty square.</li>
        <li>The board fills with no three-in-a-row — it's a draw.</li>
        <li>Series score is kept automatically across rounds.</li>
      </ul>`,
    id: `
      <h3>Tujuan</h3>
      <p>Sejajarkan tiga tandamu duluan — horizontal, vertikal, atau diagonal.</p>
      <h3>Cara main</h3>
      <ul>
        <li>X main duluan. Gantian tap kotak kosong.</li>
        <li>Kalau papan penuh tanpa tiga sebaris — seri.</li>
        <li>Skor ronde disimpan otomatis.</li>
      </ul>`,
    jw: `
      <h3>Tujuan</h3>
      <p>Dhisiki ngurutake tandhane telu sebaris — horizontal, vertikal, utawa diagonal.</p>
      <h3>Carane dolanan</h3>
      <ul>
        <li>X mlaku dhisik. Gantian pencet kothak kosong.</li>
        <li>Yen papan kebak ora ana telu sebaris — seri.</li>
        <li>Skor ronde disimpen otomatis.</li>
      </ul>`,
  },
});

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const boardEl = document.getElementById("board");
const turnLabel = document.getElementById("turn-label");
const turnDot = document.querySelector("#turn-pill .turn-dot");
const statusEl = document.getElementById("status");
const scoreX = document.getElementById("score-x");
const scoreO = document.getElementById("score-o");
const scoreD = document.getElementById("score-d");

const series = storage.get("ttt:series", { x: 0, o: 0, d: 0 });

let grid, cells, current, done, startPlayer;
startPlayer = storage.get("ttt:next-start", "X");

function render() {
  scoreX.textContent = series.x;
  scoreO.textContent = series.o;
  scoreD.textContent = series.d;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const v = grid[r][c];
      const cell = cells[r][c];
      cell.textContent = v || "";
      cell.classList.toggle("x", v === "X");
      cell.classList.toggle("o", v === "O");
      cell.classList.remove("win");
      cell.disabled = done || !!v;
    }
  }
  turnLabel.textContent = done ? "—" : t("ttt.turn", { p: current });
  turnDot.className = "turn-dot " + (current === "X" ? "blue" : "yellow");
}

function checkWinner() {
  const flat = grid.flat();
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (flat[a] && flat[a] === flat[b] && flat[b] === flat[c]) {
      return { winner: flat[a], line };
    }
  }
  if (flat.every(Boolean)) return { winner: null, line: null };
  return null;
}

function handleClick(r, c) {
  if (done || grid[r][c]) return;
  grid[r][c] = current;
  fx.play("place"); fx.haptic("tap");
  const result = checkWinner();
  if (result) {
    done = true;
    if (result.winner) {
      series[result.winner.toLowerCase()]++;
      statusEl.textContent = t("ttt.win", { p: result.winner });
      statusEl.className = "status-banner win";
      for (const i of result.line) {
        const rr = Math.floor(i / 3), cc = i % 3;
        cells[rr][cc].classList.add("win");
      }
      fx.play("win"); fx.haptic("win");
    } else {
      series.d++;
      statusEl.textContent = t("ttt.draw");
      statusEl.className = "status-banner draw";
    }
    statusEl.hidden = false;
    storage.set("ttt:series", series);
    startPlayer = result.winner
      ? result.winner === "X" ? "O" : "X"
      : startPlayer === "X" ? "O" : "X";
    storage.set("ttt:next-start", startPlayer);
  } else {
    current = current === "X" ? "O" : "X";
  }
  render();
}

function newRound() {
  grid = createGrid(3, 3);
  current = startPlayer;
  done = false;
  statusEl.hidden = true;
  cells = renderGrid(boardEl, 3, 3, handleClick, { width: "min(92vw, 360px)" });
  boardEl.classList.add("ttt-board");
  render();
}

document.getElementById("reset").addEventListener("click", newRound);
document.getElementById("reset-series").addEventListener("click", () => {
  series.x = series.o = series.d = 0;
  storage.set("ttt:series", series);
  newRound();
});

document.addEventListener("langchange", () => {
  // Refresh dynamic text
  if (done) {
    const w = grid.flat();
    // simpler: leave status as-is until next round; just refresh turn label
  }
  render();
});

newRound();
