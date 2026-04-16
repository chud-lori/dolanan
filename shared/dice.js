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
 * Animate a dice roll: the cube tumbles + bounces, faces flicker through
 * random values, then it settles on `final` with a small landing bounce.
 * Returns a promise that resolves with `final` once the animation ends.
 *
 * Requires `.die-rolling` and `.die-settle` keyframes in CSS (defined in
 * the consuming page's stylesheet — ludo/game.css ships them).
 */
export function animateRoll(el, final, duration = 800) {
  return new Promise((resolve) => {
    el.classList.remove("die-settle");
    el.classList.add("die-rolling");

    const start = performance.now();
    let lastFlicker = 0;

    function tick(now) {
      // Flicker faces every ~70ms so the eye sees a tumbling die.
      if (now - lastFlicker > 70) {
        renderFace(el, 1 + Math.floor(Math.random() * 6));
        lastFlicker = now;
      }
      if (now - start < duration) {
        requestAnimationFrame(tick);
      } else {
        el.classList.remove("die-rolling");
        renderFace(el, final);
        // Landing bounce
        el.classList.add("die-settle");
        setTimeout(() => el.classList.remove("die-settle"), 280);
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
