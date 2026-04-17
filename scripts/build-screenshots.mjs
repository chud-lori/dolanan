// Regenerate PWA install-prompt screenshots. These appear in the Play Store /
// iOS add-to-home-screen preview via manifest.webmanifest `screenshots[]`.
//
// Captures narrow (phone, 390×844) + wide (desktop/tablet, 1280×800) shots
// of the hub and a representative game.
//
// Run: node scripts/build-screenshots.mjs
// Requires Playwright + a local server on http://localhost:8765.

import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "icons", "screenshots");
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:8765";

const SHOTS = [
  { name: "hub-narrow",    url: "/",                 w: 390,  h: 844, form: "narrow" },
  { name: "chess-narrow",  url: "/games/chess/",     w: 390,  h: 844, form: "narrow" },
  { name: "ludo-narrow",   url: "/games/ludo/",      w: 390,  h: 844, form: "narrow", action: "ludo" },
  { name: "hub-wide",      url: "/",                 w: 1280, h: 800, form: "wide" },
];

const b = await chromium.launch();
for (const s of SHOTS) {
  const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(BASE + s.url, { waitUntil: "networkidle" });
  if (s.action === "ludo") {
    // Get to the actual board, not the "how many players?" setup card
    await p.click('button[data-n="2"]');
    await p.waitForTimeout(500);
  }
  await p.screenshot({ path: join(OUT, s.name + ".png") });
  console.log(" ✓ " + s.name);
  await ctx.close();
}
await b.close();
