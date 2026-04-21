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

A single installable web app bundling twelve casual local-multiplayer games —
chess, ludo, halma, connect four, werewolf, battleship, hangman, congklak,
and more — designed for **pass-the-device** or **one-screen hotseat** play.
Fully offline after the first visit, no accounts, no backend, no telemetry.

Built for the moments when you're sitting around with friends and someone
says "what should we play?"

## Games

| #  | Game            | Players | Highlights                                                                        |
| -- | --------------- | ------- | --------------------------------------------------------------------------------- |
| 1  | Tic-Tac-Toe     | 2       | Series score persisted, starts alternate                                          |
| 2  | Connect Four    | 2       | Gravity drop animation, win line highlight                                        |
| 3  | Checkers        | 2       | Forced captures, multi-jump chains, promotion to king                             |
| 4  | Chess           | 1–2     | Full rules + **bot opponent** (minimax + alpha-beta, 3 difficulty levels)         |
| 5  | Ludo            | 2–4     | Traditional cross board, step-by-step pawn walk, capture kick-back animation      |
| 6  | Halma           | 2–6     | Classical 16×16 (2p) + Chinese-Checkers star variant (2/3/4/6 players)            |
| 7  | Werewolf        | 5+      | Pass-phone moderator — role reveal, night prompts, day voting                     |
| 8  | Battleship      | 2       | Hotseat placement + attack phases with pass screens between turns                 |
| 9  | Hangman         | 1+      | EN + ID + JW word lists, device-keyboard input, category switch                   |
| 10 | Dots & Boxes    | 2       | Variable board size (4×4 to 7×7), bonus turn on completion                        |
| 11 | Truth or Dare   | 2+      | Pass-phone picker with EN + ID + JW prompt pools                                  |
| 12 | Congklak        | 2       | Traditional Indonesian mancala — sow, relay, capture ("tembak") into your store   |

## Principles

- **Offline-first** — Service Worker precaches every game on first visit.
- **Vanilla HTML / CSS / ES modules** — no framework, no build step.
- **Mobile-first** — safe-area insets, 44px tap targets, full-viewport game pages, no footer chrome.
- **EN + ID + JW** — every game speaks English, Indonesian, and Javanese; toggle persists across pages.
- **Light + dark** — 2-state theme toggle, light default, respects the `prefers-color-scheme` meta so iOS Safari doesn't force-invert.
- **Polish** — sound effects (Web Audio), haptics (`navigator.vibrate`), screen wake-lock during games, name autosuggest from recent games.
- **No accounts, no tracking** — `localStorage` only for language, theme, mute, recent names, and per-game scores.

For the internals (project layout, shared modules, SW mechanics, i18n
fallback chain, how to add a new game, testing) see
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Running locally

```bash
# Static server — nothing else needed.
python3 -m http.server 8765

# Open:
open http://localhost:8765/
```

Optional tooling:

```bash
python3 scripts/_gen_icons.py   # regenerate PWA icons + OG image (needs Pillow)
node scripts/build-sw.mjs       # regenerate sw.js precache list (bumps VERSION)
npm install && npm test         # Playwright smoke tests (installs playwright)
npm run audit                   # take a screenshot of every game for manual review
```

## Settings

Settings live on the **hub only** — they're global and apply everywhere:

- **Language** (EN / ID / JW segmented toggle)
- **Theme** (light / dark — click to flip)
- **Sound** (🔇 mute toggle)

Each game page reads the stored state — no duplicate controls cluttering the
game header. Only the game-specific **how-to (?)** button stays on each game.

## Service worker + updates

The SW uses cache-first with a precached app shell. After every deploy, users
get the new version **automatically on next visit** — no hard-refresh needed:

1. On load (and when the PWA returns to foreground), `reg.update()` asks the
   browser to re-check `/sw.js`. Registration uses `updateViaCache: 'none'`
   and nginx serves it `no-store`, so the check is always fresh (no stale
   HTTP/CDN cache can mask an update).
2. If a new SW version exists, it installs in the background and precaches
   every asset from origin.
3. The page sends `SKIP_WAITING` so the new SW activates immediately.
4. `controllerchange` fires → page reloads once. User sees a blink, now on
   the new version.
5. Fallback: if the auto-reload doesn't fire within ~3s (mobile SW lifecycle
   quirks can defer `controllerchange`), a small "Update available — tap to
   reload" toast appears. Tapping it forces the switch-over without the user
   having to clear cache.

If you're offline: `reg.update()` silently fails, cached assets continue to
serve. The SW never reloads the page without a confirmed new version.

See [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-service-worker--how-it-stays-fresh)
for the full mechanism + `VERSION` hash formula.

### Publishing a change (IMPORTANT)

**Every time you change any file the SW precaches** (anything under the repo
root except `scripts/`, `node_modules/`, `deploy/`, `.git/`), you must
regenerate `sw.js` so its `VERSION` hash bumps. Without a bump, browsers
keep serving the old cached copies and users see no update.

The precache list is computed from disk, so the workflow is:

```bash
# from the repo root, after making your changes
node scripts/build-sw.mjs        # walks the tree, rewrites sw.js + bumps VERSION
git add -A && git commit -m "…"  # commit sw.js ALONGSIDE your changes
git push
```

Then on the server:

```bash
ssh tencent
cd ~/dolanan && git pull
```

That's it — no nginx reload, no sudo. The `/var/www/dolanan` symlink means
nginx picks up the new files instantly, and the committed `sw.js` is served
as-is.

## Deploying

Target: `dolanan.lori.my.id` behind Cloudflare + nginx on the same host as
`ethok.lori.my.id`. Everything is static — `git pull` is the deploy.

**Runtime footprint is ~900 KB** (HTML + CSS + JS + icons + OG image). The
rest of what you see in the repo is development tooling:

| Thing                  | Size   | Purpose                       | Ships to server? |
| ---------------------- | ------ | ----------------------------- | ---------------- |
| site files (runtime)   | ~900 KB| what the browser actually loads | **yes**        |
| `.git/`                | ~17 MB | commit history                | no               |
| `node_modules/`        | ~14 MB | Playwright for local tests    | no               |
| `scripts/audit/`       | varies | visual-audit screenshots      | no (gitignored)  |

`.gitignore` keeps the last three out of commits. On the server, the nginx
config also explicitly blocks `/node_modules/`, `/scripts/`, `/deploy/`,
`package.json`, `README.md`, and dotfiles in case any of them end up in the
deploy tree.

### First-time setup on a new VM

```bash
# Shallow clone — avoids pulling 17 MB of history onto a small VM.
git clone --depth=1 https://github.com/chud-lori/dolanan ~/dolanan
sudo chmod o+x /home/ubuntu              # let nginx traverse $HOME

# Install + enable nginx site
sudo cp deploy/dolanan.nginx.conf /etc/nginx/sites-available/dolanan.lori.my.id
sudo ln -s /etc/nginx/sites-available/dolanan.lori.my.id /etc/nginx/sites-enabled/
sudo ln -sfn ~/dolanan /var/www/dolanan
sudo nginx -t && sudo systemctl reload nginx

# HTTPS via certbot, then add a Cloudflare A record (proxied)
sudo certbot --nginx -d dolanan.lori.my.id
```

> `deploy/dolanan.nginx.conf` is the reference config. The live config on
> the server has been hand-tuned since initial setup — check both before
> copy-pasting.

### Subsequent updates

```bash
cd ~/dolanan && git pull
```

Nothing else. The committed `sw.js` is served as-is; the SW auto-update
flow (above) pushes it to users on their next visit. **Don't forget** to
run `node scripts/build-sw.mjs` locally before every `git push` — see
*Publishing a change* above.

> `deploy/deploy.sh` exists as an optional server-side helper (regenerates
> `sw.js` if Node is installed, regenerates icons if Pillow is installed,
> reloads nginx). It's not part of the standard workflow — our server has
> neither Node nor Pillow, and the hand-tuned nginx config wouldn't tolerate
> `--install` overwriting it. Treat it as a convenience, not a requirement.

## Credits

Created by [Lori](https://profile.lori.my.id). Design system shared with
[Ethok-Ethok](https://ethok.lori.my.id) — a sister pass-the-phone party app.

## License

MIT. See [LICENSE](./LICENSE) if present, otherwise permissive reuse is fine.
