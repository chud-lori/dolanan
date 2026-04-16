// Board helpers: grid creation + common utilities for square-grid games.

export function createGrid(rows, cols, fill = null) {
  return Array.from({ length: rows }, () => Array(cols).fill(fill));
}

export function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

export function inBounds(grid, r, c) {
  return r >= 0 && c >= 0 && r < grid.length && c < grid[0].length;
}

/**
 * Render an HTML grid into `container`. Returns the array of button cells
 * indexed [row][col] so callers can update them imperatively.
 */
export function renderGrid(container, rows, cols, onCellClick, opts = {}) {
  container.innerHTML = "";
  container.classList.add("board");
  container.style.gridTemplateColumns = `repeat(${cols}, ${opts.cellSize || "minmax(0, 1fr)"})`;
  container.style.width = opts.width || "min(92vw, 460px)";

  const cells = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.setAttribute("aria-label", `row ${r + 1} column ${c + 1}`);
      cell.addEventListener("click", () => onCellClick(r, c, cell));
      container.appendChild(cell);
      row.push(cell);
    }
    cells.push(row);
  }
  return cells;
}

/**
 * Check for N-in-a-row from (r, c) in `grid`.
 * Returns the winning cells array or null.
 */
export function checkLine(grid, r, c, player, need = 3) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    const cells = [[r, c]];
    for (let step = 1; step < need; step++) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (!inBounds(grid, nr, nc) || grid[nr][nc] !== player) break;
      cells.push([nr, nc]);
    }
    for (let step = 1; step < need; step++) {
      const nr = r - dr * step;
      const nc = c - dc * step;
      if (!inBounds(grid, nr, nc) || grid[nr][nc] !== player) break;
      cells.push([nr, nc]);
    }
    if (cells.length >= need) return cells;
  }
  return null;
}
