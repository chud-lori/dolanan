// Dice module: roll + render. Used by Ludo and future games.

export function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Render a 3x3 dot grid into `el` for the given face. */
export function renderFace(el, face) {
  el.innerHTML = "";
  el.classList.add("die");
  el.setAttribute("aria-label", `Die showing ${face}`);
  const pips = PIPS[face] || [];
  for (let i = 0; i < 9; i++) {
    const spot = document.createElement("span");
    spot.className = "die-spot";
    if (pips.includes(i)) spot.classList.add("die-pip");
    el.appendChild(spot);
  }
}

/**
 * Animate a roll, then settle on `final`. Returns a promise.
 */
export function animateRoll(el, final, duration = 500) {
  return new Promise((resolve) => {
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      renderFace(el, 1 + Math.floor(Math.random() * 6));
      if (elapsed < duration) {
        requestAnimationFrame(tick);
      } else {
        renderFace(el, final);
        resolve(final);
      }
    }
    requestAnimationFrame(tick);
  });
}

// CSS you can include where needed:
export const DIE_CSS = `
.die {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 72px;
  height: 72px;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  gap: 2px;
}
.die-spot { display: block; }
.die-pip {
  background: var(--text);
  border-radius: 50%;
  width: 10px; height: 10px;
  place-self: center;
}
`;
