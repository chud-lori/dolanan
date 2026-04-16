// Dots and Boxes — 2 players. Draw one edge per turn; complete a box
// to earn a point and a bonus turn. Whoever owns most boxes wins.

import { register, t } from "/shared/i18n.js";
import { wireGameHead } from "/shared/game-head.js";
import { fx } from "/shared/fx.js";

register("db", {
  en: {
    subtitle: "2 players · draw edges, claim boxes, bonus turn",
    p1: "Blue", p2: "Orange",
    turn: "{p}'s turn",
    win: "{p} wins with {n}!",
    tie: "Tie — {n}.",
  },
  id: {
    subtitle: "2 pemain · tarik garis, kuasai kotak, giliran bonus",
    p1: "Biru", p2: "Jingga",
    turn: "Giliran {p}",
    win: "{p} menang dengan {n}!",
    tie: "Seri — {n}.",
  },
});

wireGameHead({
  titleEn: "Dots & Boxes",
  titleId: "Titik & Kotak",
  subtitleKey: "db.subtitle",
  rules: {
    en: `
      <h3>Goal</h3>
      <p>Own more boxes than your opponent when every edge is drawn.</p>
      <h3>Play</h3>
      <ul>
        <li>Take turns drawing one edge between two adjacent dots.</li>
        <li>Completing the 4th side of a box claims it for you and gives a <strong>bonus turn</strong> — keep drawing.</li>
        <li>Game ends when all edges are drawn. Most boxes wins.</li>
        <li>Use the size button (4×4 → 7×7) to adjust the board between rounds.</li>
      </ul>`,
    id: `
      <h3>Tujuan</h3>
      <p>Kuasai lebih banyak kotak dari lawan saat semua garis sudah ditarik.</p>
      <h3>Cara main</h3>
      <ul>
        <li>Gantian tarik satu garis antara dua titik bersebelahan.</li>
        <li>Menutup sisi ke-4 sebuah kotak = kotak jadi milikmu + <strong>giliran bonus</strong> — terus tarik.</li>
        <li>Game selesai saat semua garis sudah ditarik. Kotak terbanyak menang.</li>
        <li>Tombol ukuran (4×4 → 7×7) untuk ganti papan antar ronde.</li>
      </ul>`,
  },
});

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnLabel = document.getElementById("turn-label");
const turnDot = document.querySelector("#turn-pill .turn-dot");
const score1El = document.getElementById("score-1");
const score2El = document.getElementById("score-2");
const sizeBtn = document.getElementById("size-btn");

const SIZES = [4, 5, 6, 7];
let size;
let hEdges, vEdges, boxes, current, scores, done;

function start(n) {
  size = n;
  hEdges = Array.from({ length: n + 1 }, () => Array(n).fill(null));
  vEdges = Array.from({ length: n }, () => Array(n + 1).fill(null));
  boxes = Array.from({ length: n }, () => Array(n).fill(null));
  current = 1;
  scores = { 1: 0, 2: 0 };
  done = false;
  statusEl.hidden = true;
  render();
}

function playerName(p) { return t(p === 1 ? "db.p1" : "db.p2"); }

function render() {
  const n = size;
  const S = 100 / n;
  const dotR = Math.max(0.8, S * 0.08);
  boardEl.setAttribute("viewBox", `-${S*0.3} -${S*0.3} ${100 + S*0.6} ${100 + S*0.6}`);
  boardEl.innerHTML = "";

  // Boxes
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const owner = boxes[r][c];
      if (!owner) continue;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", c * S);
      rect.setAttribute("y", r * S);
      rect.setAttribute("width", S);
      rect.setAttribute("height", S);
      rect.setAttribute("class", "db-box p" + owner);
      boardEl.appendChild(rect);
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", c * S + S / 2);
      txt.setAttribute("y", r * S + S / 2 + S * 0.04);
      txt.setAttribute("class", "db-box-label");
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("dominant-baseline", "middle");
      txt.textContent = owner === 1 ? "B" : "O";
      boardEl.appendChild(txt);
    }
  }

  // Horizontal edges
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c < n; c++) {
      const owner = hEdges[r][c];
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", c * S);
      line.setAttribute("y1", r * S);
      line.setAttribute("x2", (c + 1) * S);
      line.setAttribute("y2", r * S);
      line.setAttribute("class", `db-edge${owner ? " locked p" + owner : ""}`);
      line.setAttribute("stroke-linecap", "round");
      boardEl.appendChild(line);

      // Larger hit area for touch
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      hit.setAttribute("x", c * S + S * 0.1);
      hit.setAttribute("y", r * S - S * 0.18);
      hit.setAttribute("width", S * 0.8);
      hit.setAttribute("height", S * 0.36);
      hit.setAttribute("class", "db-hit");
      if (!owner && !done) hit.addEventListener("click", () => drawEdge("h", r, c));
      boardEl.appendChild(hit);
    }
  }

  // Vertical edges
  for (let r = 0; r < n; r++) {
    for (let c = 0; c <= n; c++) {
      const owner = vEdges[r][c];
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", c * S);
      line.setAttribute("y1", r * S);
      line.setAttribute("x2", c * S);
      line.setAttribute("y2", (r + 1) * S);
      line.setAttribute("class", `db-edge${owner ? " locked p" + owner : ""}`);
      line.setAttribute("stroke-linecap", "round");
      boardEl.appendChild(line);

      const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      hit.setAttribute("x", c * S - S * 0.18);
      hit.setAttribute("y", r * S + S * 0.1);
      hit.setAttribute("width", S * 0.36);
      hit.setAttribute("height", S * 0.8);
      hit.setAttribute("class", "db-hit");
      if (!owner && !done) hit.addEventListener("click", () => drawEdge("v", r, c));
      boardEl.appendChild(hit);
    }
  }

  // Dots on top
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c <= n; c++) {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", c * S);
      dot.setAttribute("cy", r * S);
      dot.setAttribute("r", dotR);
      dot.setAttribute("class", "db-dot");
      boardEl.appendChild(dot);
    }
  }

  score1El.textContent = scores[1];
  score2El.textContent = scores[2];
  turnLabel.textContent = done ? "—" : t("db.turn", { p: playerName(current) });
  turnDot.className = "turn-dot " + (current === 1 ? "blue" : "yellow");
  sizeBtn.textContent = `${size} × ${size}`;
}

function drawEdge(kind, r, c) {
  if (done) return;
  if (kind === "h") hEdges[r][c] = current;
  else vEdges[r][c] = current;

  let claimed = 0;
  // Boxes adjacent to this edge
  if (kind === "h") {
    if (r > 0) claimed += maybeClaim(r - 1, c);
    if (r < size) claimed += maybeClaim(r, c);
  } else {
    if (c > 0) claimed += maybeClaim(r, c - 1);
    if (c < size) claimed += maybeClaim(r, c);
  }

  if (claimed === 0) current = current === 1 ? 2 : 1;

  // Done?
  if (scores[1] + scores[2] === size * size) {
    done = true;
    const total = `${scores[1]}–${scores[2]}`;
    if (scores[1] === scores[2]) {
      statusEl.textContent = t("db.tie", { n: total });
      statusEl.className = "status-banner draw";
    } else {
      const winner = scores[1] > scores[2] ? 1 : 2;
      statusEl.textContent = t("db.win", { p: playerName(winner), n: total });
      statusEl.className = "status-banner win";
    }
    statusEl.hidden = false;
  }

  render();
}

function maybeClaim(r, c) {
  if (boxes[r][c]) return 0;
  const top = hEdges[r][c];
  const bottom = hEdges[r + 1][c];
  const left = vEdges[r][c];
  const right = vEdges[r][c + 1];
  if (top && bottom && left && right) {
    boxes[r][c] = current;
    scores[current]++;
    return 1;
  }
  return 0;
}

sizeBtn.addEventListener("click", () => {
  const idx = SIZES.indexOf(size);
  start(SIZES[(idx + 1) % SIZES.length]);
});

document.getElementById("reset").addEventListener("click", () => start(size));
document.addEventListener("langchange", render);

start(6);
