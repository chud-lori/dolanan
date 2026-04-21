# Dolanan — Architecture

Technical reference for how the codebase is organised, what shared
infrastructure every game relies on, and how to add a new one.

User-facing docs (deploy flow, features, running locally) live in
[README.md](./README.md).

---

## 1. Tech stack

Vanilla HTML + CSS + native ES modules. No framework, no bundler, no
transpile step. Every file in the repo is the file that ships to the browser.

**Why:** the app is twelve small games that each fit in a screen. A build
step would buy nothing and break "copy the repo, open `index.html`" for
contributors. The service worker is the one generated artifact — produced
by `scripts/build-sw.mjs`.

Runtime deps: zero. Dev deps: Playwright (smoke tests + visual audit) and
Pillow (icon regeneration). Neither ships to the server.

---

## 2. Project layout

```
dolanan/
├── index.html                 # hub page (game catalog)
├── hub.js · hub.css           # hub logic — catalog grid, install prompt, settings
├── games.js                   # single source of truth for the game list
├── manifest.webmanifest       # PWA manifest + app shortcuts
├── sw.js                      # service worker — AUTO-GENERATED, do not hand-edit
├── offline.html               # fallback when a navigation misses cache
├── robots.txt · sitemap.xml
├── style.css                  # design tokens + light/dark palettes + base styles
│
├── shared/                    # modules every game imports
│   ├── i18n.js                # EN + ID + JW, per-game scope registration
│   ├── game-head.js           # title bar + how-to button + wake lock + SW register
│   ├── theme.js               # light/dark toggle, persisted, system-aware on first visit
│   ├── fx.js                  # Web Audio sounds + haptics + global mute
│   ├── how-to.js              # shared rules modal; each game registers content
│   ├── names.js               # remember player names across sessions (autocomplete)
│   ├── wake-lock.js           # keep the screen awake during gameplay
│   ├── sw-register.js         # register /sw.js + auto-update + fallback toast
│   ├── storage.js             # namespaced localStorage wrapper
│   ├── board.js               # grid helpers (TTT, C4, etc.)
│   ├── dice.js                # dice tumble + bounce animation
│   ├── drag.js                # pointer-based drag-and-drop (chess/checkers/halma)
│   └── ui.css                 # shared in-game UI (boards, pills, modals)
│
├── games/                     # one folder per game, each self-contained
│   ├── tictactoe/             # each game: index.html + game.js + game.css
│   ├── connect-four/
│   ├── checkers/
│   ├── chess/ (+ bot.js)      # minimax + alpha-beta, piece-square tables
│   ├── ludo/
│   ├── halma/                 # Classical 16×16 + Chinese Checkers star variant
│   ├── werewolf/
│   ├── battleship/
│   ├── hangman/ (+ words.js)  # offline word list (en/id/jw × categories)
│   ├── dots-and-boxes/
│   ├── truth-or-dare/ (+ prompts.js)
│   └── congklak/              # Indonesian mancala
│
├── icons/
│   ├── favicon.{svg,ico,png}
│   ├── icon-192.png · icon-512.png (+ maskable variants)
│   ├── apple-touch-icon.png
│   ├── screenshots/           # PWA install screenshots
│   └── games/*.svg            # per-game tile icons shown on the hub
│
├── og-image.png               # social preview
│
├── scripts/                   # dev tooling — NOT served in prod
│   ├── _gen_icons.py          # regenerate PWA icons + OG image (Pillow)
│   ├── build-sw.mjs           # rewrite sw.js precache list from disk
│   ├── build-subpath.mjs      # optional builder for /private-style sub-path deploys
│   ├── smoke-test.mjs         # Playwright functional tests
│   └── visual-audit.mjs       # screenshot every game for manual review
│
└── deploy/
    ├── dolanan.nginx.conf     # reference nginx config (live config may differ)
    └── deploy.sh              # optional server-side regen + reload helper
```

---

## 3. Shared modules

Every game page imports from `/shared/` — no framework, just small focused
helpers. `wireGameHead()` pulls most of this in for you.

| Module            | Purpose                                                                               |
| ----------------- | ------------------------------------------------------------------------------------- |
| `i18n.js`         | `register(scope, dict)` + `t(key)`; handles language switch, emits `langchange`.      |
| `game-head.js`    | `wireGameHead({ titleEn, titleId, titleJw?, rules })` — title, how-to, wake, SW.      |
| `theme.js`        | 2-state light/dark, persisted; applies `data-theme` to `<html>`, syncs theme-color.  |
| `fx.js`           | `fx.play(name)` Web Audio sounds, `fx.haptic(pattern)` vibration, global mute.        |
| `how-to.js`       | Modal shell + `setRules({ en, id, jw? })` per-game.                                   |
| `names.js`        | `rememberNames()` + `attachNameSuggestions(inputs)` — datalist autocomplete.          |
| `wake-lock.js`    | `engage()` acquires screen wake lock; re-acquires on `visibilitychange`.              |
| `sw-register.js`  | Registers `/sw.js` (`updateViaCache: 'none'`), auto-reloads on update, fallback toast.|
| `storage.js`      | `storage.get/set/remove` — namespaced `localStorage` keys (`dolanan:<key>`).          |
| `board.js`        | Grid geometry helpers for square boards (TTT, C4, etc.).                              |
| `dice.js`         | Dice tumble + settle animation; used by Ludo.                                         |
| `drag.js`         | Pointer-based drag-and-drop over board games (chess/checkers/halma).                  |
| `ui.css`          | Shared in-game UI (boards, pills, modals, game-header chrome).                        |

---

## 4. Service worker — how it stays fresh

### What `sw.js` does

Cache-first for **everything** in the precache list, including HTML. When a
user visits, the SW serves cached assets; the origin is only hit for things
that weren't precached (first visit, missing file).

Why HTML is cached too: if HTML were network-first while JS/CSS is
cache-first, a deploy produces a brief window where new HTML (with new
`data-i18n` keys) renders against old cached JS — users see raw keys like
`hub.about` flash through. Tying HTML to the same cache generation as the
code that consumes it makes every deploy atomic.

### How updates reach users

1. **Registration** — every page imports `shared/sw-register.js` (via
   `game-head.js` on game pages, directly on the hub). It calls
   `navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })`.
   `updateViaCache: 'none'` means the browser never HTTP-caches `sw.js`
   itself — every update check fetches fresh, independent of nginx/CDN cache
   headers. nginx also sends `Cache-Control: no-store` for `/sw.js`,
   belt-and-suspenders.
2. **Update check** — fires on `load` and again on `visibilitychange` when
   the tab becomes visible. Without the visibility handler, browsers only
   re-check `sw.js` roughly every 24h.
3. **Version change** — if `sw.js` content differs (its `VERSION` string
   changed), the new SW installs in the background and precaches all assets.
4. **Skip waiting** — `sw-register.js` posts `SKIP_WAITING` to the new SW so
   it activates immediately instead of waiting for every tab to close.
5. **Controller change → reload** — once the new SW takes control, the page
   reloads once. The user sees a blink and is now on the new build.
6. **Fallback toast** — if the auto-reload doesn't fire within 3s (mobile
   Safari sometimes defers `controllerchange` when the tab was backgrounded
   during install), a pill appears: *"Update available — tap to reload"*.
   Tapping it re-posts `SKIP_WAITING` and force-reloads.

### How `VERSION` is computed

```
VERSION = "dolanan-" + <git-short-sha> + "-" + <content-hash>
```

`content-hash` is an 8-char slice of SHA-256 over every precached asset's
path + bytes. So the version bumps when **any** precached file changes, even
on uncommitted edits during dev. `build-sw.mjs` walks the file tree — you
don't maintain the ASSETS list by hand.

### Offline behaviour

`reg.update()` failing (no network) is caught and silently ignored. Cached
assets keep serving. Navigations that miss cache fall back to `/offline.html`.

---

## 5. i18n

Three languages: English (`en`), Indonesian (`id`), Javanese (`jw`).

**Fallback chain:** `jw → id → en`. Javanese speakers read Indonesian, so
missing `jw` keys fall back to `id` before hitting `en`. This keeps the
Javanese experience fluent even before every single string is translated.

**Scopes:** each game calls `register("<slug>", { en: {...}, id: {...}, jw: {...} })`
at module load. `t("<scope>.<key>")` resolves via the fallback chain. There
is a shared `common` scope (registered in `i18n.js`) for buttons, status
messages, modal headers.

**Persistence:** language choice persists in `localStorage` under
`dolanan:lang`. Changes emit a `langchange` CustomEvent that re-renders any
element marked `data-i18n="<scope>.<key>"` via `applyI18n()`.

---

## 6. Design tokens

Defined once in `style.css` and consumed by every game via CSS variables.
Light/dark variants are selected by `[data-theme="dark"]` on `<html>`, set
by `theme.js`. Key variables: `--bg`, `--card`, `--primary`, `--accent`,
`--text`, `--text-muted`, `--border`, `--radius`, `--shadow`.

**First-paint flash prevention:** each HTML file inlines a tiny script in
`<head>` that reads `localStorage["dolanan:theme"]` and sets
`data-theme` before first paint. Without it, system-dark users saw a
light-flash while `theme.js` loaded.

Typography is the system font stack — no external fonts, because
offline-first.

---

## 7. Adding a new game

1. **Scaffold** — `games/<slug>/{index.html, game.js, game.css}`. Easiest
   is copying a small existing game like `tictactoe/`. Include
   `<meta name="color-scheme" content="light dark">` in the head.
2. **Register i18n** — import `{ register, t } from "/shared/i18n.js"` and
   call `register("<slug>", { en: {...}, id: {...}, jw: {...} })` at top level.
3. **Wire the game head** — at the top of `game.js`:
   ```js
   import { wireGameHead } from "/shared/game-head.js";
   wireGameHead({
     titleEn: "My Game",
     titleId: "Permainan Saya",
     titleJw: "Dolanan-Ku",
     rules: { en: "…", id: "…", jw: "…" },
   });
   ```
   You get the how-to modal, wake lock, and SW auto-update for free.
4. **Hook up effects** — `import { fx } from "/shared/fx.js"` and sprinkle
   `fx.play("place" | "capture" | "win" | …)` + `fx.haptic("tap" | "win" | …)`.
5. **Player names** — if your game asks for names, use
   `attachNameSuggestions(inputs)` and `rememberNames([...])` from
   `/shared/names.js` for autocomplete across games.
6. **Register in the hub** — add an entry to `games.js` (slug, icon path,
   players string, EN+ID+JW name and blurb).
7. **Add a tile icon** — `icons/games/<slug>.svg`, square, uses CSS
   `currentColor` so it picks up theme.
8. **Update `sitemap.xml`** — append a `<url>` line for the new path.
9. **Regenerate the service worker** — `node scripts/build-sw.mjs`. It walks
   the tree and picks up the new files automatically. Commit `sw.js`
   alongside the new game files.

---

## 8. Testing

**Smoke test — `npm test`** (`scripts/smoke-test.mjs`):

- Headless Chromium, iPhone-13 viewport.
- Boots a local `python3 -m http.server`, loads every game.
- Asserts: no console errors, no 404s, a few key interactions per game
  (TTT win, C4 vertical line, Chess pawn move, Ludo dice roll, Hangman
  round, Werewolf stepper, etc.).

**Visual audit — `npm run audit`** (`scripts/visual-audit.mjs`):

- Walks every game, plays a few turns, dumps PNGs to `scripts/audit/`.
- Useful for catching layout regressions before commit. Gitignored output.

Run `npm install` once to fetch Playwright; it's heavy (~14 MB) but only
needed locally. The server doesn't touch it.

---

## 9. Scripts reference

| Script                         | Runs on     | Purpose                                           |
| ------------------------------ | ----------- | ------------------------------------------------- |
| `scripts/build-sw.mjs`         | Node        | Walk tree → rewrite `sw.js` + bump `VERSION`. **Run before every commit.** |
| `scripts/_gen_icons.py`        | Python 3    | Regenerate all PWA icons + OG image from sources. Needs Pillow. |
| `scripts/build-subpath.mjs`    | Node        | Optional: rebuild for `/private`-style sub-path deploys.       |
| `scripts/smoke-test.mjs`       | Playwright  | `npm test` — headless functional check.           |
| `scripts/visual-audit.mjs`     | Playwright  | `npm run audit` — screenshots for manual review.  |
| `deploy/deploy.sh`             | Bash, server| Optional: regen sw + icons + reload nginx. Skipped steps warn when a tool is missing. |
