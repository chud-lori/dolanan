// Pointer-based drag-and-drop for board games.
//
// Tap-to-select stays as the primary interaction (no breakage), but if the
// user starts dragging a piece (>5px movement after pointerdown on a piece),
// we follow the finger with a "ghost" element and trigger a click on the
// target cell when they release.
//
// Usage: in your game.js, after wiring click handlers, call:
//   enableDrag(boardEl, {
//     pieceSelector: ".ch-piece",  // child of a clickable cell
//     cellFromPoint: (x, y) => document.elementFromPoint(x, y)?.closest(".ch-sq"),
//     onDragStart: (cellEl) => cellEl.click(),  // re-uses existing select logic
//     onDrop: (targetCell) => targetCell.click(),
//     onCancel: () => { /* optional: clear selection */ },
//   });

const DRAG_THRESHOLD = 5; // px before tap becomes drag

export function enableDrag(boardEl, opts) {
  const { pieceSelector, cellFromPoint, onDragStart, onDrop, onCancel } = opts;
  let dragging = false;
  let startX = 0, startY = 0;
  let originPiece = null;
  let originCell = null;
  let ghost = null;

  boardEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return; // left button only
    const piece = e.target.closest(pieceSelector);
    if (!piece) return;
    const cell = piece.closest("button, [role='button'], div");
    if (!cell) return;
    originPiece = piece;
    originCell = cell;
    startX = e.clientX;
    startY = e.clientY;
    dragging = false;
    // Don't preventDefault — taps must still register normally.
  });

  function startDrag(e) {
    dragging = true;
    // Trigger selection logic so legal-move hints render before the user
    // even drops the piece.
    if (originCell && onDragStart) onDragStart(originCell);

    // Make a visual ghost following the pointer.
    ghost = originPiece.cloneNode(true);
    ghost.classList.add("drag-ghost");
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "9999";
    ghost.style.opacity = "0.85";
    const rect = originPiece.getBoundingClientRect();
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    moveGhost(e.clientX, e.clientY);
    document.body.appendChild(ghost);
    originPiece.style.opacity = "0.3";
    // Capture so subsequent moves outside the cell still fire here.
    try { boardEl.setPointerCapture(e.pointerId); } catch { /* may fail in some browsers */ }
  }

  function moveGhost(x, y) {
    if (!ghost) return;
    const r = ghost.getBoundingClientRect();
    ghost.style.left = (x - r.width / 2) + "px";
    ghost.style.top = (y - r.height / 2) + "px";
  }

  boardEl.addEventListener("pointermove", (e) => {
    if (!originPiece) return;
    if (!dragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
        startDrag(e);
      }
      return;
    }
    moveGhost(e.clientX, e.clientY);
    e.preventDefault();
  });

  function cleanup() {
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    if (originPiece) {
      originPiece.style.opacity = "";
    }
    originPiece = null;
    originCell = null;
    dragging = false;
  }

  boardEl.addEventListener("pointerup", (e) => {
    if (!dragging) {
      // Plain click — already handled by element listener
      cleanup();
      return;
    }
    const target = cellFromPoint(e.clientX, e.clientY);
    if (target && target !== originCell && onDrop) {
      onDrop(target);
    } else if (onCancel) {
      onCancel();
    }
    cleanup();
  });

  boardEl.addEventListener("pointercancel", () => {
    if (dragging && onCancel) onCancel();
    cleanup();
  });

  // Prevent native browser drag (image drag, text selection) from interfering.
  boardEl.addEventListener("dragstart", (e) => e.preventDefault());
}
