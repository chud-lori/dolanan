<h1 align="center">Dolanan</h1>

<p align="center">
  <strong>An offline-first PWA games hub for hanging out with friends.</strong>
</p>

<p align="center">
  <em>Dolanan</em> — Javanese for <em>playing / games / toy</em>.
</p>

<p align="center">
  <a href="https://dolanan.lori.my.id">dolanan.lori.my.id</a>
</p>

---

## What is this

A single installable web app bundling ten casual local-multiplayer games —
chess, ludo, connect four, werewolf, battleship, hangman, and more — designed
for **pass-the-device** or **one-screen hotseat** play. Fully offline after
the first visit, no accounts, no backend, no telemetry.

Built for the moments when you're sitting around with friends and someone
says "what should we play?"

## Games

| # | Game            | Players | Highlights                                                              |
| - | --------------- | ------- | ----------------------------------------------------------------------- |
| 1 | Tic-Tac-Toe     | 2       | Series score persisted, starts alternate                                |
| 2 | Connect Four    | 2       | Gravity drop animation, win line highlight                              |
| 3 | Checkers        | 2       | Forced captures, multi-jump chains, promotion to king                   |
| 4 | Chess           | 2       | Full rules — castling, en passant, promotion, check, mate, stalemate, threefold repetition, 50-move |
| 5 | Ludo            | 2–4     | Traditional cross board, capture opponents, safe squares, bonus on 6 / capture, 3-6s forfeit |
| 6 | Werewolf        | 5+      | Pass-phone moderator — role reveal, night prompts, day voting           |
| 7 | Battleship      | 2       | Hotseat placement + attack phases with pass screens between turns       |
| 8 | Hangman         | 1+      | EN + ID word lists, device keyboard input, category switch              |
| 9 | Dots & Boxes    | 2       | Variable board size (4×4 to 7×7), bonus turn on completion              |
| 10| Truth or Dare   | 2+      | Pass-phone picker with EN + ID prompt pools                             |

## Principles

- **Offline-first** — Service Worker caches every game on first visit.
- **Vanilla HTML / CSS / ES modules** — no framework, no build step.
- **Mobile-first** — safe-area insets, 44px tap targets, fits a single phone screen.
- **EN + ID** — every game speaks English and Indonesian; toggle persists across pages.
- **No accounts, no tracking** — `localStorage` only for language preference and small scores.

## Project layout

```
dolanan/
├── index.html                 # hub page
├── hub.js · hub.css           # hub catalog + install prompt
├── games.js                   # single source of truth for the game list
├── manifest.webmanifest
├── sw.js                      # service worker (auto-generated)
├── offline.html               # offline fallback page
├── robots.txt · sitemap.xml
├── style.css                  # shared design tokens + base styles
├── shared/
│   ├── i18n.js                # EN + ID, per-game scope registration
│   ├── game-head.js           # injects the language toggle into each game
│   ├── storage.js             # namespaced localStorage wrapper
│   ├── board.js               # grid helpers (tic-tac-toe, c4, etc.)
│   ├── dice.js                # roll + face rendering
│   ├── pass.js                # "pass the device" modal helper
│   └── ui.css                 # shared in-game UI (boards, pills, scores)
├── games/
│   ├── tictactoe/             # each game has its own index.html + game.js + game.css
│   ├── connect-four/
│   ├── checkers/
│   ├── chess/
│   ├── ludo/
│   ├── werewolf/
│   ├── battleship/
│   ├── hangman/ (+ words.js offline list)
│   ├── dots-and-boxes/
│   └── truth-or-dare/ (+ prompts.js)
├── icons/
│   ├── favicon.svg · favicon.ico
│   ├── icon-192.png · icon-512.png (+ maskable variants)
│   ├── apple-touch-icon.png
│   └── games/*.svg            # per-game tile icons
├── og-image.png
├── scripts/
│   ├── _gen_icons.py          # regenerates all icons + OG image
│   ├── build-sw.mjs           # rewrites sw.js precache list from disk
│   ├── smoke-test.mjs         # Playwright functional + visual checks
│   └── visual-audit.mjs       # screenshots every game for quick review
└── deploy/
    ├── dolanan.nginx.conf     # nginx site config
    └── deploy.sh              # regen sw + icons, reload nginx
```

## Running locally

```bash
# Static server — nothing else needed.
python3 -m http.server 8765

# Open:
open http://localhost:8765/
```

Optional scripts:

```bash
python3 scripts/_gen_icons.py   # regenerate PWA icons + OG image (needs Pillow)
node scripts/build-sw.mjs       # regenerate sw.js precache list (bumps VERSION)
npm install && npm test         # Playwright smoke tests (installs playwright)
npm run audit                   # take a screenshot of every game for manual review
```

## Deploying

Target: `dolanan.lori.my.id` behind Cloudflare + nginx on the same host as
`ethok.lori.my.id`. Everything is static — `git pull` and a `sw.js` version
bump is the deploy.

**First-time setup on the VM** (as a user with sudo):

```bash
git clone https://github.com/chud-lori/dolanan ~/dolanan
sudo chmod o+x /home/ubuntu                 # let nginx traverse
bash ~/dolanan/deploy/deploy.sh --install   # symlinks site + reload nginx
```

The installer will:

1. Run `scripts/build-sw.mjs` to freshen `sw.js`.
2. Run `scripts/_gen_icons.py` if Pillow is present.
3. Copy `deploy/dolanan.nginx.conf` into `sites-available` and enable it.
4. Symlink `~/dolanan` → `/var/www/dolanan`.
5. `nginx -t && systemctl reload nginx`.

**Subsequent updates:**

```bash
cd ~/dolanan && git pull && bash deploy/deploy.sh
```

Service-worker clients pick up the new `VERSION` automatically on their next
visit — the `activate` handler purges old cache buckets and `clients.claim()`
takes over.

**Cloudflare:** add an A record for `dolanan.lori.my.id` pointing to the VM
(proxied). For HTTPS: `sudo certbot --nginx -d dolanan.lori.my.id`.

## Adding a new game

1. Create `games/<slug>/index.html`, `game.js`, `game.css` (copy an existing
   small game like `tictactoe/` as a template).
2. Register game-specific i18n strings via
   `import { register, t } from "/shared/i18n.js"`.
3. Call `wireGameHead({ titleEn, titleId, subtitleKey })` at the top of your
   `game.js` so the language toggle + back link show up.
4. Add an entry to `games.js` (slug, icon path, players string, EN+ID name
   and blurb).
5. Drop an SVG tile icon into `icons/games/<slug>.svg`.
6. Append a URL line to `sitemap.xml`.
7. Regenerate the service worker: `node scripts/build-sw.mjs` (it walks the
   file tree, so the new files get picked up automatically).

## Testing

- `npm test` runs `scripts/smoke-test.mjs` in headless Chromium at an
  iPhone-13 viewport. Each game is loaded, console errors + 404s are caught,
  and key interactions (TTT win, C4 vertical line, Chess pawn move, Ludo
  dice roll, Hangman round, Werewolf stepper, etc.) are asserted. 26 cases
  currently pass.
- `scripts/visual-audit.mjs` walks every game, plays a few turns, and dumps
  screenshots to `scripts/audit/` — useful for manual UI review.

## Credits

Created by [Lori](https://profile.lori.my.id). Design system shared with
[Ethok-Ethok](https://ethok.lori.my.id) — a sister pass-the-phone party app.

## License

MIT. See [LICENSE](./LICENSE) if present, otherwise permissive reuse is fine.
