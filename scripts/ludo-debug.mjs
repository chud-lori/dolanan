import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 800, height: 1100 } });
const p = await ctx.newPage();
await p.goto("http://localhost:8765/games/ludo/", { waitUntil: "networkidle" });
await p.click('button[data-n="4"]');
await p.waitForTimeout(400);

// Inspect the (0,0) and (1,1) cells
const info = await p.evaluate(() => {
  const board = document.querySelector(".lu-board");
  const cells = board.querySelectorAll(".lu-cell");
  return {
    cellCount: cells.length,
    overlayCount: board.querySelectorAll(".lu-base-overlay").length,
    cell00Class: cells[0]?.className,
    cell00Bg: getComputedStyle(cells[0]).backgroundColor,
    cell00Pos: cells[0]?.getBoundingClientRect ? (() => {
      const r = cells[0].getBoundingClientRect();
      return `x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)}`;
    })() : null,
    boardChildrenSample: Array.from(board.children).slice(0, 3).map(c => c.className),
    boardLastChildren: Array.from(board.children).slice(-5).map(c => c.className),
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
