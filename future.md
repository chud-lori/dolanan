# Dolanan — Build Plan

> **Instruction to Claude**: Read this entire doc before proposing anything. This is the spec. Follow the design system and the phased plan. When asked to "build the next game" or "start phase X", pick up from wherever the codebase left off.

---

## 1. Vision

A single installable **offline-first PWA** with a hub of casual multiplayer party games. Designed for hanging out with friends — mostly **local pass-the-device** or **one-screen hotseat** play, no accounts, no backend. First visit downloads everything; after that, works with zero connectivity.

**Name:** *Dolanan* — Javanese for "playing / games / toy", a warm colloquial word that fits the "casual, for hanging out" vibe.

**Domain plan:** `dolanan.lori.my.id`, deployed behind Cloudflare + nginx on the same host as `ethok.lori.my.id`.

---

## 2. Scope — Games to Build

Build in this order. Each game is self-contained in `/games/<name>/` and pluggable into the hub.

| # | Game | Players | Core mechanic | Priority |
| - | ---- | ------- | ------------- | -------- |
| 1 | **Tic-Tac-Toe** | 2 | Grid, 3-in-a-row | P0 (warmup / validate pattern) |
| 2 | **Connect Four** | 2 | Gravity-drop, 4-in-a-row | P0 |
| 3 | **Checkers** | 2 | Diagonal moves, forced capture | P1 |
| 4 | **Chess** | 2 | Full rules: castling, en passant, promotion, check/mate/stalemate | P1 |
| 5 | **Ludo** | 2–4 | Dice, captures, blocking, home | P1 |
| 6 | **Werewolf / Mafia (moderator app)** | 5+ | Pass-phone role assign, night/day prompts | P2 |
| 7 | **Battleship (hotseat)** | 2 | Place ships, pass device to attack | P2 |
| 8 | **Hangman / Word Guess** | 1+ | Offline word list (EN + ID) | P2 |
| 9 | **Dots and Boxes** | 2 | Draw edges, claim squares | P3 |
| 10 | **Casual card games** (Generic Shedding Clone / Hearts / Truth-or-Dare) | 2–4 | Shuffle, pass phone | P3 (avoid trademark names like "Uno") |

**Definition of done per game:**
- Rule enforcement correct (no illegal moves reach the board).
- Win/draw/stalemate detection.
- Reset / new game within one tap.
- Responsive (mobile-first).
- Works offline once cached.
- Follows the design system (Section 4).

---

## 3. Tech Stack & Architecture

**Stack:** Vanilla HTML / CSS / ES modules. No framework. No build step initially. If complexity grows, migrate to Vite + preact — not before.

**Why:** Same reasoning as Ethok — static, cacheable, zero-dependency, fast to iterate.

**Directory layout:**
```
dolanan/
├── index.html                  # hub grid: cards linking to games
├── style.css                   # shared theme tokens + components
├── hub.js                      # routing / launcher
├── sw.js                       # service worker (cache-first)
├── manifest.webmanifest        # PWA manifest
├── offline.html                # fallback page (rare)
├── shared/
│   ├── ui.css                  # buttons, cards, modals (reusable)
│   ├── board.js                # grid-based board helpers (used by chess/checkers/c4/tictactoe)
│   ├── dice.js                 # dice roll + render (ludo + future)
│   ├── i18n.js                 # EN/ID strings (all games share)
│   ├── storage.js              # localStorage wrapper
│   └── sounds/                 # tap, win, shuffle (optional, small)
├── games/
│   ├── tictactoe/
│   │   ├── index.html
│   │   ├── game.js
│   │   └── meta.json           # { name, emoji, players: "2", tags: ["quick"] }
│   ├── connect-four/
│   ├── checkers/
│   ├── chess/
│   ├── ludo/
│   └── ...
├── icons/                      # favicons, apple-touch, pwa icons
├── og-image.png
├── robots.txt
├── sitemap.xml
└── README.md
```

**Routing:** plain multi-page — each game is its own `index.html` under `/games/<name>/`. Hub links directly. No SPA router, no JS framework, no history API gymnastics. Offline caching handles everything.

**Game discovery:** Hub reads `/games/*/meta.json` at build time (or a manual manifest in `hub.js`). Start with a hardcoded list in `hub.js`; revisit once games stabilize.

---

## 4. Design System

**Theme — reuse Ethok's light-blue palette for consistency across Lori's apps:**

```css
:root {
  --bg: #eff6ff;
  --bg-2: #dbeafe;
  --card: #ffffff;
  --card-2: #f1f5f9;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --secondary: #cbd5e1;
  --accent: #0ea5e9;
  --accent-warm: #f59e0b;
  --danger: #ef4444;
  --success: #10b981;
  --text: #0f172a;
  --text-muted: #64748b;
  --border: #dbeafe;
  --radius: 14px;
  --radius-lg: 20px;
  --shadow: 0 10px 30px rgba(59, 130, 246, 0.15);
}
```

**Background:** `linear-gradient(135deg, #e0f2fe 0%, #eff6ff 50%, #dbeafe 100%)` fixed attachment.

**Typography:** system font stack (`-apple-system, Segoe UI, Roboto, ...`). No external fonts — offline-first.

**Logo style:** word mark in the primary/accent gradient, bold, letter-spacing 3–4px. Match Ethok's look.

**Component rules:**
- **Buttons**: `.btn` base; variants `.btn-primary` (blue gradient), `.btn-secondary` (bg-2), `.btn-ghost` (transparent + primary border).
- **Cards**: white bg, soft blue shadow, 14–20px radius, 1px light border.
- **Modals**: centered card, backdrop `rgba(15,23,42,0.4)`.
- **Icons**: emoji when possible (offline-safe, no download). SVG otherwise, inline.
- **Animations**: ≤300ms, ease-out. No bouncy animations during gameplay (distracting).
- **Game boards**: center the board, generous margins, ensure it fits in a single viewport on a 360×640 phone.

**Accessibility:**
- Tap targets ≥ 44×44.
- Color contrast ≥ 4.5 for text.
- All interactive elements reachable by keyboard.
- `aria-label` for icon-only buttons.

**Credit footer:** always include `Created by Lori` (link to `https://profile.lori.my.id`) — global footer, same as Ethok.

---

## 5. Offline Strategy (Service Worker)

**Strategy:** cache-first for all app shell and game assets. Network only as fallback for updates.

**Skeleton (`sw.js`):**
```js
const VERSION = 'dolanan-v1';
const ASSETS = [
  '/', '/index.html', '/style.css', '/hub.js', '/manifest.webmanifest',
  '/shared/ui.css', '/shared/board.js', '/shared/dice.js', '/shared/i18n.js', '/shared/storage.js',
  '/games/tictactoe/', '/games/tictactoe/index.html', '/games/tictactoe/game.js',
  // ... list every game's files
  '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/offline.html')))
  );
});
```

**Rules:**
- Bump `VERSION` every time assets change — otherwise clients keep stale copies.
- Register SW from `hub.js` only after page load to avoid blocking.
- Include every game's files in `ASSETS` — missing one breaks that game offline.
- Consider a build script that auto-generates `ASSETS` from the file tree before deploy.

**Manifest (`manifest.webmanifest`):**
```json
{
  "name": "Dolanan",
  "short_name": "Dolanan",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#eff6ff",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## 6. Per-Game Specs (brief)

### Tic-Tac-Toe (P0)
- 3×3 grid, X goes first.
- Win detection: 8 winning lines.
- Detect draw when board full & no winner.
- Optional: "best of 3" series counter.

### Connect Four (P0)
- 7 cols × 6 rows. Click column → piece drops to lowest empty.
- Win: 4-in-a-row horizontal/vertical/diagonal.
- Animate drop (transform transition, ~200ms).

### Checkers (P1)
- 8×8 board, 12 pieces per side.
- Diagonal moves, mandatory captures (implement as forced), kings.
- Win: opponent has no legal moves or zero pieces.

### Chess (P1)
- Full rules. Use piece chars or SVG sprites (SVG preferred for clarity).
- Required: castling (both), en passant, pawn promotion (modal for piece choice), check detection, checkmate, stalemate, 50-move rule, threefold repetition.
- No AI in v1 — human vs human only (pass device).
- Move representation: store as `{from, to, piece, captured?, promotion?, castling?, enPassant?}` in a moves array; makes undo trivial.
- Legal move gen: pseudo-legal first, then filter by "does this leave own king in check".

### Ludo (P1)
- 2–4 players, 4 tokens each.
- Roll dice → can move token out on 6, capture on land, safe squares.
- Bonus roll on 6 (max 3 consecutive 6s → turn forfeited).
- Win: all 4 tokens home.
- Dice visuals: CSS 3D cube OR static face PNGs. Animate roll (0.5s spin + settle).

### Werewolf Moderator (P2)
- Pass-phone reveal like Ethok.
- Roles: villager, werewolf, seer, doctor/healer, cupid (optional).
- Night prompts (moderator sees): "Werewolves pick a target", "Seer check a player", etc.
- Day phase: voting UI.
- Win: werewolves = villagers, or all werewolves dead.

### Battleship (P2)
- 10×10 boards, hotseat.
- Phase 1: Player A places ships (pass phone). Phase 2: Player B places. Phase 3: alternate attacks with "pass phone" screens between turns so opponent doesn't see the board.

### Hangman (P2)
- Offline word list per language (~500 words EN + 500 ID).
- Classic 6-wrong-guesses rule.
- Category hints optional.

### Dots and Boxes (P3)
- N×M grid, click edges.
- Complete a box = claim + bonus turn.
- Win: most boxes when all drawn.

### Casual cards (P3)
- Rename "Uno" to "Shedding" or similar — avoid trademark.
- Standard deck games: Hearts, Go Fish, War.
- "Truth or Dare" as pass-phone category picker with EN + ID prompt pools.

---

## 7. Build Plan — Phased

**Phase 0 — Scaffold (1 session)**
1. Create `index.html` with empty game grid.
2. Theme tokens (`style.css`) copied from this doc.
3. Shared helpers (`shared/storage.js`, `shared/i18n.js` with EN + ID).
4. Service worker + manifest + icons (reuse generator pattern from Ethok's `_gen_icons.py` — see [github.com/chud-lori/ethok/blob/main/_gen_icons.py](https://github.com/chud-lori/ethok/blob/main/_gen_icons.py) — with a game-controller emoji or "D" monogram).
5. Hub grid renders static tile placeholders.
6. Global footer "Created by Lori".

**Phase 1 — First 3 games (validates pattern)**
1. Tic-Tac-Toe — simplest, confirms routing & theme.
2. Connect Four — confirms shared board helper.
3. Chess — stress-tests the architecture. If chess works cleanly, everything else will.

**Phase 2 — Family expansion**
1. Checkers (reuses chess board helper).
2. Ludo (first 4-player game, introduces dice module).
3. Hangman (introduces offline word list pattern).

**Phase 3 — Party games**
1. Werewolf moderator (pass-phone like Ethok).
2. Battleship (hotseat).
3. Dots and Boxes.

**Phase 4 — Polish + optional**
1. Cards / party prompts.
2. Sound effects (small .ogg files, respect mute toggle).
3. Haptics on mobile (`navigator.vibrate` short pulses).
4. Shareable "best of" session scores (localStorage only).
5. Consider per-game settings (timer on chess, word categories on hangman).

Each phase ends with a working deploy.

---

## 8. Deployment

**Domain:** add `dolanan.lori.my.id` A record on Cloudflare (proxied) → the same origin IP you use for the other `*.lori.my.id` records (see Cloudflare dashboard; do NOT commit the IP to the repo).

**Nginx config** (follow the same pattern as `ethok.lori.my.id`):
```nginx
server {
    listen 80;
    server_name dolanan.lori.my.id;
    root /var/www/dolanan;
    index index.html;

    gzip on;
    gzip_types text/html text/css application/javascript image/svg+xml application/json;

    # Drop `immutable` so icon updates don't require CF purges
    location ~* \.(jpg|jpeg|png|svg|ico|webp)$ {
        expires 30d;
        add_header Cache-Control "public";
    }

    # Service worker must NEVER be cached at edge/browser
    location = /sw.js {
        expires off;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Block .git leak
    location ~ /\.git { deny all; return 404; }

    location / { try_files $uri $uri/ =404; }
}
```

**Steps:**
1. Clone repo to `~/dolanan` on the VM.
2. `sudo ln -sfn /home/ubuntu/dolanan /var/www/dolanan` (symlink pattern).
3. Copy/symlink the nginx config to `sites-available`, enable, `nginx -t`, reload.
4. Cloudflare DNS A record.
5. Updates: `cd ~/dolanan && git pull` — service worker version bump handles clients.

**Add link to Lori's profile** — both the Projects grid and the Links/Apps section in `profile.lori.my.id/index.html` (follow how Ethok was added).

---

## 9. Constraints & Anti-Patterns

- **No backend.** If you're tempted to add one, stop. It's a local/hotseat hub.
- **No accounts or logins.** localStorage only for language + minor prefs.
- **No external CDNs / fonts / analytics.** Breaks offline.
- **No framework until it's actually needed.** Vanilla JS scales to 10 small games fine.
- **No copyrighted names** (Uno, Monopoly, Scrabble). Rename or reimagine.
- **Mobile-first always.** Design board sizes for 360×640 portrait first, scale up.
- **No trackers, no telemetry.** Respect the "offline, private" positioning.
- **Service Worker version discipline.** Bump `VERSION` on every asset change — forgetting this is the #1 "it's broken" bug.

---

## 10. Reference: what Ethok already proved

Source: [github.com/chud-lori/ethok](https://github.com/chud-lori/ethok) · Live: [ethok.lori.my.id](https://ethok.lori.my.id)

This hub leans heavily on patterns validated in the Ethok repo:
- Single-page, vanilla JS, section-based screens.
- Light-blue theme + palette tokens.
- Pass-device UX (works great for party games).
- PWA icon + OG image generation via a small Python script.
- Symlink-based nginx deploy + Cloudflare DNS.
- localStorage anti-repeat pattern (useful for Hangman word selection, party prompts).

When stuck on a pattern, check the Ethok repo at [github.com/chud-lori/ethok](https://github.com/chud-lori/ethok) for prior art — clone it or browse on GitHub.

---

## 11. Starting Prompts Claude Can Use

- **"Start Phase 0 from future.md"** — scaffold the hub, theme, SW, manifest, icons, footer, and an empty game grid.
- **"Build Tic-Tac-Toe into the hub"** — add `/games/tictactoe/` with the game and wire it into the grid.
- **"Build chess into the hub with full rules"** — implement the full rule set, validate, add promotion modal.
- **"Add Ludo for 2–4 players"** — implement with dice module in `shared/dice.js`.
- **"Deploy Phase N"** — set up nginx, symlink, update profile links.

Keep commits small and phase-aligned. One commit per game shipped is fine.
