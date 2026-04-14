<h1 align="center">Dolanan</h1>

<p align="center">An offline-first PWA games hub for hanging out with friends.</p>

<p align="center"><em>Dolanan</em> — Javanese for <em>playing</em> / <em>games</em> / <em>toy</em>.</p>

---

## What is this

A single installable web app that collects casual local-multiplayer games — chess, ludo, connect four, werewolf, and more — designed for pass-the-device or one-screen hotseat play with friends. Fully offline after the first visit, no accounts, no backend.

## Status

🚧 **Planning.** Not built yet. The full build plan lives in [`future.md`](./future.md) — scope, design system, deployment, and phased delivery.

To kick things off in a new Claude session:

```bash
cd /Users/nurchudlori/Projects/dolanan
# open a Claude session in this folder, then:
# "Start Phase 0 from future.md"
```

## Planned games

Tic-Tac-Toe · Connect Four · Checkers · Chess · Ludo · Werewolf · Battleship · Hangman · Dots and Boxes · Card games

See [`future.md`](./future.md) for priorities and specs.

## Principles

- Offline-first (Service Worker + PWA manifest)
- Vanilla HTML/CSS/JS — no framework until it's actually needed
- Light-blue theme shared with [Ethok-Ethok](https://ethok.lori.my.id/) for visual consistency
- Mobile-first, installable, zero external dependencies
- Local-only state (`localStorage`), no accounts, no telemetry

## Deployment

Target domain: `dolanan.lori.my.id` — nginx + Cloudflare, same pattern as Ethok-Ethok. See [`future.md` § 8](./future.md#8-deployment) for the exact config.

## Credits

Created by [Lori](https://profile.lori.my.id).

## License

MIT
