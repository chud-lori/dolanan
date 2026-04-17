#!/usr/bin/env python3
"""Generate per-game Open Graph images (1200x630 PNGs).

Each game gets ./og/<slug>.png showing:
  - a characteristic glyph (chess knight, dice, etc.)
  - its name + blurb
  - Dolanan wordmark + URL

Run:
    python3 scripts/_gen_og.py

Requires only Pillow. No external system libs.
"""
from __future__ import annotations

import os
import re
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    raise SystemExit("Pillow required: pip install Pillow")

ROOT = Path(__file__).resolve().parents[1]
OG_DIR = ROOT / "og"
OG_DIR.mkdir(exist_ok=True)

PRIMARY = (59, 130, 246)
ACCENT = (14, 165, 233)
DEEP = (30, 58, 138)
TEXT = (15, 23, 42)
MUTED = (100, 116, 139)
BG_A = (239, 246, 255)
BG_B = (219, 234, 254)

# Per-game visual: a glyph and accent colors for the icon tile.
GAME_VISUALS = {
    "tictactoe":     {"glyph": "×○",  "tile": (59, 130, 246)},   # blue
    "connect-four":  {"glyph": "●",   "tile": (30, 58, 138)},    # deep blue
    "checkers":      {"glyph": "●",   "tile": (30, 41, 59)},
    "chess":         {"glyph": "\u265e", "tile": (120, 83, 44)}, # ♞ walnut
    "ludo":          {"glyph": "🎲",  "tile": (59, 130, 246)},
    "werewolf":      {"glyph": "🐺",  "tile": (15, 23, 42)},
    "battleship":    {"glyph": "⛵",  "tile": (30, 58, 138)},
    "hangman":       {"glyph": "A_",  "tile": (59, 130, 246)},
    "dots-and-boxes":{"glyph": "◼",   "tile": (59, 130, 246)},
    "truth-or-dare": {"glyph": "🎯",  "tile": (239, 68, 68)},
    "congklak":      {"glyph": "⬣",   "tile": (139, 94, 52)},
    "halma":         {"glyph": "◆",   "tile": (30, 58, 138)},
}


def _load_font(size: int, *, bold: bool = True, symbol: bool = False) -> ImageFont.FreeTypeFont:
    """Pick a font. For `symbol` (chess pieces, mathematical glyphs), try
    Arial Unicode first since it has coverage for the miscellaneous-symbols block."""
    if symbol:
        paths = [
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
            "/System/Library/Fonts/Apple Symbols.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    else:
        paths = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/HelveticaNeue.ttc",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _parse_games_js() -> list[dict]:
    """Pull slug + name + blurb out of games.js without needing a JS runtime."""
    src = (ROOT / "games.js").read_text()
    out = []
    for m in re.finditer(
        r"\{\s*slug:\s*\"([^\"]+)\",\s*icon:\s*\"([^\"]+)\","
        r"\s*name:\s*\{[^}]*en:\s*\"([^\"]+)\"[^}]*\},"
        r"\s*players:\s*\"([^\"]+)\","
        r"\s*blurb:\s*\{[^}]*en:\s*\"([^\"]+)\"",
        src,
        re.DOTALL,
    ):
        out.append({
            "slug": m.group(1),
            "name": m.group(3),
            "players": m.group(4),
            "blurb": m.group(5),
        })
    return out


def _gradient_bg(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), BG_A)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        ratio = y / h
        r = int(BG_A[0] * (1 - ratio) + BG_B[0] * ratio)
        g = int(BG_A[1] * (1 - ratio) + BG_B[1] * ratio)
        b = int(BG_A[2] * (1 - ratio) + BG_B[2] * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def _game_tile(slug: str, size: int) -> Image.Image:
    """Draw a branded tile with the game's glyph in white."""
    vis = GAME_VISUALS.get(slug, {"glyph": "●", "tile": PRIMARY})
    tile_color = vis["tile"]
    glyph = vis["glyph"]

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = int(size * 0.22)
    # Subtle gradient: tile_color → 80% brightness of it
    grad = Image.new("RGBA", (size, size))
    gdraw = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / size
        r = int(tile_color[0] * (1 - t * 0.3))
        g = int(tile_color[1] * (1 - t * 0.3))
        b = int(tile_color[2] * (1 - t * 0.3))
        gdraw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size, size], radius=radius, fill=255,
    )
    img.paste(grad, (0, 0), mask)

    # Glyph (symbol / emoji / short text)
    is_emoji = any(ord(c) > 0x2FFF for c in glyph)
    font_size = int(size * (0.58 if is_emoji else 0.62))
    font = _load_font(font_size, symbol=not is_emoji)
    bbox = draw.textbbox((0, 0), glyph, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = (size - th) / 2 - bbox[1] - int(size * 0.04)

    # Drop shadow for depth
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).text(
        (tx + size * 0.01, ty + size * 0.015), glyph, font=font, fill=(0, 0, 0, 130),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.015))
    img.alpha_composite(shadow)

    draw.text((tx, ty), glyph, font=font, fill=(255, 255, 255, 255))
    return img


def _generate_one(entry: dict) -> Path:
    w, h = 1200, 630
    bg = _gradient_bg(w, h).convert("RGBA")

    tile = _game_tile(entry["slug"], 360)
    bg.alpha_composite(tile, (100, (h - 360) // 2))

    draw = ImageDraw.Draw(bg)

    brand_font = _load_font(34, bold=True)
    tag_font = _load_font(22, bold=False)
    title_font = _load_font(88, bold=True)
    sub_font = _load_font(30, bold=False)
    url_font = _load_font(24, bold=False)

    draw.text((540, 90), "DOLANAN", font=brand_font, fill=PRIMARY)
    draw.text((540, 130),
              "Casual games for hanging out with friends.",
              font=tag_font, fill=MUTED)

    draw.text((540, 210), entry["name"], font=title_font, fill=TEXT)

    draw.text((540, 320), f'{entry["players"]} players',
              font=sub_font, fill=PRIMARY)
    draw.text((540, 375), entry["blurb"], font=sub_font, fill=TEXT)

    draw.text((540, 520), "dolanan.lori.my.id", font=url_font, fill=MUTED)

    out = OG_DIR / f"{entry['slug']}.png"
    bg.convert("RGB").save(out, optimize=True)
    return out


def main() -> None:
    games = _parse_games_js()
    print(f"Found {len(games)} games")
    for g in games:
        out = _generate_one(g)
        print(f"  ✓ {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
