#!/usr/bin/env node
// One-shot builder that deploys Dolanan under a URL sub-path (e.g. /private).
//
//   BASE=/private node scripts/build-subpath.mjs [outDir]
//
// Produces a `dist/` (or chosen outDir) ready to rsync to the server. All
// root-absolute asset references ("/shared/…", "/games/…", "/icons/…",
// "/style.css", etc.) are rewritten to "<BASE>/shared/…" and the service
// worker is regenerated so its precache list + scope honor the same BASE.

import {
  readFileSync, writeFileSync, statSync, mkdirSync, readdirSync,
  copyFileSync, rmSync, existsSync,
} from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, process.argv[2] || "dist");
const BASE = (process.env.BASE || "").replace(/\/$/, "");
if (!BASE || !BASE.startsWith("/")) {
  console.error("Usage: BASE=/private node scripts/build-subpath.mjs");
  process.exit(1);
}

// Paths at the repo root that should be rewritten to BASE-prefixed forms.
// Anything matching /(one-of-these) inside a string/attr/URL gets the prefix.
const ASSET_PREFIXES = [
  "shared", "games", "icons",
  "style.css", "hub.css", "hub.js", "games.js",
  "sw.js", "offline.html", "manifest.webmanifest",
  "og-image.png", "robots.txt", "sitemap.xml",
];
const PREFIX_RE = new RegExp(
  `(^|["'(\\s=])\\/(${ASSET_PREFIXES
    .map((p) => p.replace(/\./g, "\\."))
    .join("|")})\\b`,
  "g",
);

const TEXT_EXTS = new Set([
  ".html", ".css", ".js", ".mjs", ".json", ".webmanifest",
  ".svg", ".xml", ".txt",
]);

// Directories to skip when mirroring the source tree.
const SKIP = new Set([
  "node_modules", ".git", ".github", "dist", "build",
  "scripts",                 // tooling — not served
]);

// Files at the repo root that should not be deployed.
const SKIP_FILES = new Set([
  "package.json", "package-lock.json", "future.md",
  ".gitignore",
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    if (dir === ROOT && SKIP_FILES.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function rewrite(src) {
  return src
    // Absolute asset refs
    .replace(PREFIX_RE, (_, pre, asset) => `${pre}${BASE}/${asset}`)
    // Canonical / og:url and sitemap URLs
    .replace(/(https:\/\/dolanan\.lori\.my\.id)\//g, `$1${BASE}/`)
    // manifest "start_url" / "scope" are bare "/"
    .replace(/"start_url":\s*"\/?"/g, `"start_url": "${BASE}/"`)
    .replace(/"scope":\s*"\/?"/g, `"scope": "${BASE}/"`);
}

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// --- Mirror tree --------------------------------------------------
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
ensureDir(OUT);

let rewriteCount = 0;
let copyCount = 0;
for (const src of walk(ROOT)) {
  const rel = relative(ROOT, src);
  const dst = join(OUT, rel);
  ensureDir(dirname(dst));
  const ext = rel.slice(rel.lastIndexOf("."));
  if (TEXT_EXTS.has(ext)) {
    const before = readFileSync(src, "utf8");
    const after = rewrite(before);
    writeFileSync(dst, after);
    if (after !== before) rewriteCount++;
  } else {
    copyFileSync(src, dst);
  }
  copyCount++;
}

// --- Regenerate sw.js with BASE-prefixed precache list ------------
// The committed sw.js copy (already in OUT) has had its precache list string-
// replaced above, so this is only necessary if you want the VERSION bumped.
// We'll import build-sw.mjs with BASE set via env.
process.env.BASE = BASE;
process.env.SW_OUT = join(OUT, "sw.js");
await import("./build-sw.mjs");

console.log(`\n✓ Built ${copyCount} files into ${OUT}`);
console.log(`  ${rewriteCount} rewritten, BASE=${BASE}`);
console.log(`\nNext:`);
console.log(`  rsync -av --delete ${OUT}/ user@vm:/var/www/dolanan/`);
