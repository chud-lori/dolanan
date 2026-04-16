// Battleship — hotseat 2-player. Pass-phone between phases:
//   1. P1 places fleet → 2. pass → 3. P2 places → 4. pass →
//   5. alternate attacks with a pass screen between each turn.
//
// Standard fleet: Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2.

import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";

register("bs", {
  en: {
    subtitle: "2 players · hotseat · hide fleet, sink theirs",
    p1: "Player 1",
    p2: "Player 2",
    placingFleet: "{p} — place your fleet",
    placingShip: "Place: {name} ({len})",
    rotate: "Rotate",
    undo: "Undo last",
    ready: "Ready",
    pass: "Pass device to {p}",
    tapPrivately: "Tap only when in your hands.",
    tapReady: "Tap when ready",
    yourTurn: "{p} — your turn to attack",
    hit: "Hit!",
    miss: "Miss.",
    sunkShip: "You sunk the {name}!",
    yourBoard: "Your board",
    enemyBoard: "Enemy board",
    win: "{p} wins!",
    shipCarrier: "Carrier",
    shipBattleship: "Battleship",
    shipCruiser: "Cruiser",
    shipSubmarine: "Submarine",
    shipDestroyer: "Destroyer",
    allPlaced: "Fleet ready",
    done: "Done",
  },
  id: {
    subtitle: "2 pemain · estafet · sembunyikan armada",
    p1: "Pemain 1",
    p2: "Pemain 2",
    placingFleet: "{p} — taruh kapal-kapalmu",
    placingShip: "Pasang: {name} ({len})",
    rotate: "Putar",
    undo: "Batalkan",
    ready: "Siap",
    pass: "Kasih HP ke {p}",
    tapPrivately: "Tekan kalau HP sudah di tanganmu.",
    tapReady: "Tekan kalau siap",
    yourTurn: "{p} — giliranmu nyerang",
    hit: "Kena!",
    miss: "Meleset.",
    sunkShip: "Kapal {name} tenggelam!",
    yourBoard: "Papanmu",
    enemyBoard: "Papan lawan",
    win: "{p} menang!",
    shipCarrier: "Kapal Induk",
    shipBattleship: "Kapal Perang",
    shipCruiser: "Penjelajah",
    shipSubmarine: "Kapal Selam",
    shipDestroyer: "Perusak",
    allPlaced: "Armada siap",
    done: "Selesai",
  },
});

wireGameHead({ titleEn: "Battleship", titleId: "Kapal Perang", subtitleKey: "bs.subtitle" });

const N = 10;
const FLEET = [
  { key: "Carrier", len: 5 },
  { key: "Battleship", len: 4 },
  { key: "Cruiser", len: 3 },
  { key: "Submarine", len: 3 },
  { key: "Destroyer", len: 2 },
];

const root = document.getElementById("bs-root");
const resetBtn = document.getElementById("reset");

let state;

function newGame() {
  state = {
    phase: "cover",
    whose: 0, // 0 or 1
    players: [makePlayer(), makePlayer()],
    placing: { shipIdx: 0, vertical: false },
    attackResultMessage: "",
    winner: null,
  };
  state.phase = "placePass";
  render();
}

function makePlayer() {
  return {
    board: Array.from({ length: N }, () => Array(N).fill(null)), // null | ship index
    hits: Array.from({ length: N }, () => Array(N).fill(null)), // null | 'H' | 'M'
    ships: [], // [{ key, len, cells:[[r,c]...], sunk: false }]
  };
}

function render() {
  root.innerHTML = "";
  if (state.phase === "placePass") renderPlacePass();
  else if (state.phase === "place") renderPlace();
  else if (state.phase === "attackPass") renderAttackPass();
  else if (state.phase === "attack") renderAttack();
  else if (state.phase === "done") renderDone();
}

function shipName(key) {
  return t("bs.ship" + key);
}
function playerName(i) { return t(i === 0 ? "bs.p1" : "bs.p2"); }

/* ---------------- Place phase ---------------- */

function renderPlacePass() {
  const btn = document.createElement("button");
  btn.className = "bs-cover";
  btn.innerHTML = `${t("bs.pass", { p: playerName(state.whose) })}<small>${t("bs.tapPrivately")}</small>`;
  btn.addEventListener("click", () => {
    state.placing = { shipIdx: 0, vertical: false, ghost: null };
    state.phase = "place";
    render();
  });
  root.appendChild(btn);
}

function renderPlace() {
  const player = state.players[state.whose];
  const shipIdx = state.placing.shipIdx;
  const ship = FLEET[shipIdx];

  const info = document.createElement("div");
  info.className = "bs-info";
  info.innerHTML = `
    <strong>${t("bs.placingFleet", { p: playerName(state.whose) })}</strong>
    <div>${ship ? t("bs.placingShip", { name: shipName(ship.key), len: ship.len }) : t("bs.allPlaced")}</div>
    <div class="bs-fleet">
      ${FLEET
        .map((f, i) => {
          const done = i < shipIdx;
          const current = i === shipIdx;
          return `<span class="bs-ship-chip ${current ? "placing" : ""} ${done ? "placed" : ""}">${shipName(f.key)} (${f.len})</span>`;
        })
        .join("")}
    </div>
    <div class="bs-controls">
      <button id="rotate" class="btn btn-secondary" type="button" ${shipIdx >= FLEET.length ? "disabled" : ""}>🔄 ${t("bs.rotate")}</button>
      <button id="undo" class="btn btn-ghost" type="button" ${player.ships.length === 0 ? "disabled" : ""}>↶ ${t("bs.undo")}</button>
      <button id="done" class="btn btn-primary" type="button" ${shipIdx < FLEET.length ? "disabled" : ""}>${t("bs.done")}</button>
    </div>
  `;
  root.appendChild(info);

  const board = document.createElement("div");
  board.className = "bs-board";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "bs-cell";
      if (player.board[r][c] !== null) cell.classList.add("ship");
      cell.setAttribute("aria-label", `${"ABCDEFGHIJ"[r]}${c + 1}`);

      cell.addEventListener("pointerenter", () => showGhost(r, c));
      cell.addEventListener("pointerleave", () => clearGhost());
      cell.addEventListener("click", () => tryPlace(r, c));

      board.appendChild(cell);
    }
  }
  root.appendChild(board);

  function cellAt(r, c) {
    return board.children[r * N + c];
  }

  function placementCells(r, c) {
    if (!ship) return null;
    const out = [];
    for (let i = 0; i < ship.len; i++) {
      const nr = r + (state.placing.vertical ? i : 0);
      const nc = c + (state.placing.vertical ? 0 : i);
      if (nr >= N || nc >= N) return null;
      out.push([nr, nc]);
    }
    return out;
  }

  function isValid(cells) {
    if (!cells) return false;
    for (const [r, c] of cells) if (player.board[r][c] !== null) return false;
    return true;
  }

  function showGhost(r, c) {
    clearGhost();
    const cells = placementCells(r, c);
    if (!cells) return;
    const valid = isValid(cells);
    for (const [rr, cc] of cells) {
      cellAt(rr, cc).classList.add(valid ? "ghost" : "invalid");
    }
  }

  function clearGhost() {
    board.querySelectorAll(".ghost, .invalid").forEach((c) => c.classList.remove("ghost", "invalid"));
  }

  function tryPlace(r, c) {
    if (!ship) return;
    const cells = placementCells(r, c);
    if (!isValid(cells)) return;
    for (const [rr, cc] of cells) player.board[rr][cc] = player.ships.length;
    player.ships.push({ key: ship.key, len: ship.len, cells, sunk: false });
    state.placing.shipIdx++;
    clearGhost();
    render();
  }

  info.querySelector("#rotate").addEventListener("click", () => {
    state.placing.vertical = !state.placing.vertical;
  });
  info.querySelector("#undo").addEventListener("click", () => {
    const last = player.ships.pop();
    if (last) {
      for (const [r, c] of last.cells) player.board[r][c] = null;
      state.placing.shipIdx--;
      render();
    }
  });
  info.querySelector("#done").addEventListener("click", () => {
    if (state.placing.shipIdx < FLEET.length) return;
    if (state.whose === 0) {
      state.whose = 1;
      state.phase = "placePass";
    } else {
      state.whose = 0;
      state.phase = "attackPass";
    }
    render();
  });
}

/* ---------------- Attack phase ---------------- */

function renderAttackPass() {
  const btn = document.createElement("button");
  btn.className = "bs-cover";
  btn.innerHTML = `${t("bs.pass", { p: playerName(state.whose) })}<small>${t("bs.tapPrivately")}</small>`;
  btn.addEventListener("click", () => {
    state.phase = "attack";
    render();
  });
  root.appendChild(btn);
}

function renderAttack() {
  const attacker = state.players[state.whose];
  const defender = state.players[1 - state.whose];

  const info = document.createElement("div");
  info.className = "bs-info";
  info.innerHTML = `
    <strong>${t("bs.yourTurn", { p: playerName(state.whose) })}</strong>
    <div>${state.attackResultMessage || "—"}</div>
    <div class="bs-fleet">
      ${defender.ships
        .map((s) => `<span class="bs-ship-chip ${s.sunk ? "sunk" : ""}">${shipName(s.key)} (${s.len})</span>`)
        .join("")}
    </div>
  `;
  root.appendChild(info);

  // Enemy board (where we attack)
  const title1 = document.createElement("div");
  title1.style.fontWeight = "700";
  title1.textContent = t("bs.enemyBoard");
  root.appendChild(title1);

  const enemy = document.createElement("div");
  enemy.className = "bs-board";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "bs-cell";
      const shot = attacker.hits[r][c];
      if (shot === "H") cell.classList.add("hit");
      if (shot === "M") cell.classList.add("miss");
      if (shot === "S") cell.classList.add("sunk");
      cell.disabled = shot !== null;
      cell.addEventListener("click", () => fire(r, c));
      enemy.appendChild(cell);
    }
  }
  root.appendChild(enemy);

  // Your own board (read-only) below
  const title2 = document.createElement("div");
  title2.style.fontWeight = "700";
  title2.textContent = t("bs.yourBoard");
  root.appendChild(title2);

  const self = document.createElement("div");
  self.className = "bs-board";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = document.createElement("div");
      cell.className = "bs-cell";
      if (attacker.board[r][c] !== null) cell.classList.add("ship");
      const incoming = defender.hits[r][c]; // opponent's shots against us
      if (incoming === "H") cell.classList.add("hit");
      if (incoming === "M") cell.classList.add("miss");
      if (incoming === "S") cell.classList.add("sunk");
      self.appendChild(cell);
    }
  }
  root.appendChild(self);

  function fire(r, c) {
    if (attacker.hits[r][c] !== null) return;
    const ship = defender.board[r][c];
    if (ship === null) {
      attacker.hits[r][c] = "M";
      state.attackResultMessage = t("bs.miss");
    } else {
      attacker.hits[r][c] = "H";
      const s = defender.ships[ship];
      const allHit = s.cells.every(([rr, cc]) => attacker.hits[rr][cc] !== null);
      if (allHit) {
        s.sunk = true;
        for (const [rr, cc] of s.cells) attacker.hits[rr][cc] = "S";
        state.attackResultMessage = t("bs.sunkShip", { name: shipName(s.key) });
      } else {
        state.attackResultMessage = t("bs.hit");
      }
    }

    // Win?
    if (defender.ships.every((s) => s.sunk)) {
      state.winner = state.whose;
      state.phase = "done";
      render();
      return;
    }
    state.whose = 1 - state.whose;
    state.phase = "attackPass";
    render();
  }
}

function renderDone() {
  const div = document.createElement("div");
  div.className = "bs-info";
  div.innerHTML = `<h2>${t("bs.win", { p: playerName(state.winner) })}</h2>`;
  root.appendChild(div);
}

resetBtn.addEventListener("click", newGame);
document.addEventListener("langchange", render);

newGame();
