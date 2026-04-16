import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 800, height: 1100 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto("http://localhost:8765/games/ludo/", { waitUntil: "networkidle" });
await p.click('button[data-n="4"]');
await p.waitForTimeout(700);
const board = await p.locator(".lu-board").boundingBox();
console.log("board bbox:", board);
await p.screenshot({ path: "/tmp/ludo-active-glow.png", clip: {
  x: Math.max(0, board.x - 30),
  y: Math.max(0, board.y - 30),
  width: board.width + 60, height: board.height + 60,
}});
await b.close();
