import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 600, height: 1000 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto("http://localhost:8765/games/ludo/", { waitUntil: "networkidle" });
await p.click('button[data-n="2"]');
await p.waitForTimeout(300);

// Capture die class transitions during a roll
const dieClassChanges = [];
for (let i = 0; i < 20; i++) {
  if (i === 0) await p.locator("#roll").click();
  const cls = await p.locator("#die").getAttribute("class");
  dieClassChanges.push(`t=${i*60}ms cls="${cls}"`);
  await p.waitForTimeout(60);
}
console.log(dieClassChanges.join("\n"));
await b.close();
