#!/usr/bin/env node
// Regenerate sitemap.xml from the file tree.
// Run: node scripts/build-sitemap.mjs
//
// Walks games/* and writes a sitemap covering the hub + every game folder.
// Set BASE_URL env to override the production origin.

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE_URL = (process.env.BASE_URL || "https://dolanan.lori.my.id").replace(/\/$/, "");

const games = readdirSync(join(ROOT, "games"))
  .filter((n) => {
    try {
      return statSync(join(ROOT, "games", n)).isDirectory();
    } catch {
      return false;
    }
  })
  .sort();

const today = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: `${BASE_URL}/`,        priority: "1.0", lastmod: today },
  { loc: `${BASE_URL}/about/`,  priority: "0.6", lastmod: today },
  ...games.map((slug) => ({
    loc: `${BASE_URL}/games/${slug}/`,
    priority: "0.8",
    lastmod: today,
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>
`;

writeFileSync(join(ROOT, "sitemap.xml"), xml);
console.log(`Wrote sitemap.xml — ${urls.length} URLs`);
