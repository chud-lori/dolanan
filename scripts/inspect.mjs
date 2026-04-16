// Ad-hoc inspector: visit hub, dump body innerText to verify i18n resolves.
import { chromium, devices } from "playwright";

const BASE = "http://localhost:8765";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();

page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE ERROR:", m.text());
});
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto(BASE + "/", { waitUntil: "networkidle" });
const text = await page.evaluate(() => document.body.innerText);
console.log("=== HUB innerText ===");
console.log(text);
console.log("\n=== Raw-key scan ===");
const hits = text.match(/\b(btn|nav|hub|ttt|c4|ck|ch|lu|ww|hm|bs|db|td|players)\.\w+/g);
console.log(hits || "no raw keys");

await browser.close();
