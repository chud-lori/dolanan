#!/usr/bin/env python3
"""Generate Dolanan PWA icons + OG image + favicon.

Run:
    python3 scripts/_gen_icons.py

Design concept — "One dice, one tile":
    Inspired by Postman's icon — a single bold shape on a single brand-colored
    tile. Nothing else. At a glance you see "games hub" and move on.

    * Rounded tile with a brand-blue gradient (matches the app's primary palette)
    * One large white dice, gently tilted, showing the 5-face
    * Subtle drop shadow under the dice for lift
    * Soft inner gloss on the tile for depth — no confetti, no corner pips

Outputs into ./icons/ and ./og-image.png.
Requires Pillow: pip install Pillow
"""
from __future__ import annotations

import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    raise SystemExit("Pillow required: pip install Pillow")

ROOT = Path(__file__).resolve().parents[1]
ICONS_DIR = ROOT / "icons"
ICONS_DIR.mkdir(exist_ok=True)

# Brand palette — same tokens as style.css
PRIMARY = (59, 130, 246)     # #3b82f6
PRIMARY_DARK = (37, 99, 235) # #2563eb
ACCENT = (14, 165, 233)      # #0ea5e9
DEEP = (30, 58, 138)         # #1e3a8a
WHITE = (255, 255, 255)
INK = (15, 23, 42)           # #0f172a — pip color
BG_LIGHT = (239, 246, 255)
BG_MID = (219, 234, 254)
TEXT = (15, 23, 42)


def _font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in paths:
        if p and os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


# ---------- layers ----------------------------------------------------------

def _tile(size: int, safe_pad: int) -> Image.Image:
    """Rounded-square tile with a diagonal brand-blue gradient."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [safe_pad, safe_pad, size - safe_pad, size - safe_pad],
        radius=int(size * 0.22), fill=255,
    )
    # Vertical gradient: primary (top) → accent cyan (bottom)
    grad = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    gdraw = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / size
        r = int(PRIMARY[0] * (1 - t) + ACCENT[0] * t)
        g = int(PRIMARY[1] * (1 - t) + ACCENT[1] * t)
        b = int(PRIMARY[2] * (1 - t) + ACCENT[2] * t)
        gdraw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    img.paste(grad, (0, 0), mask)

    # A soft top highlight for depth — stays subtle so the tile feels flat.
    gloss = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(gloss)
    gdraw.ellipse(
        [-size * 0.3, -size * 0.55, size * 1.3, size * 0.45],
        fill=(255, 255, 255, 30),
    )
    gloss = gloss.filter(ImageFilter.GaussianBlur(size * 0.02))
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(gloss, (0, 0), mask)
    img.alpha_composite(out)
    return img


def _dice(size: int) -> Image.Image:
    """One big white dice, gently tilted, centered on the tile.

    The face shows five pips — the most iconic dice face. A soft drop
    shadow underneath lifts it off the tile.
    """
    # Draw the dice on a square canvas sized 85% of the tile so rotation
    # doesn't clip the corners.
    die_size = int(size * 0.56)
    pad = int(size * 0.10)  # room for shadow + rotation bleed
    canvas = Image.new("RGBA", (die_size + pad * 2, die_size + pad * 2),
                       (0, 0, 0, 0))

    # Drop shadow
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [pad, pad + int(size * 0.02),
         pad + die_size, pad + die_size + int(size * 0.02)],
        radius=int(die_size * 0.20), fill=(15, 23, 42, 110),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.025))
    canvas.alpha_composite(shadow)

    # The dice body
    die = ImageDraw.Draw(canvas)
    die.rounded_rectangle(
        [pad, pad, pad + die_size, pad + die_size],
        radius=int(die_size * 0.20),
        fill=WHITE,
    )

    # Thin bottom edge shadow inside the dice for a touch of depth
    die.rounded_rectangle(
        [pad, pad + die_size * 0.97,
         pad + die_size, pad + die_size],
        radius=int(die_size * 0.20),
        fill=(219, 234, 254, 255),
    )
    # Redraw crisp body over the edge so only a hairline remains
    die.rounded_rectangle(
        [pad, pad, pad + die_size, pad + die_size * 0.97],
        radius=int(die_size * 0.20),
        fill=WHITE,
    )

    # Pips — classic 5 face
    pip_r = int(die_size * 0.09)
    face = [(0.28, 0.28), (0.72, 0.28),
            (0.50, 0.50),
            (0.28, 0.72), (0.72, 0.72)]
    for fx, fy in face:
        cx = pad + fx * die_size
        cy = pad + fy * die_size
        die.ellipse([cx - pip_r, cy - pip_r, cx + pip_r, cy + pip_r],
                    fill=INK)

    # Gentle tilt keeps it playful without looking askew.
    canvas = canvas.rotate(-8, resample=Image.BICUBIC, expand=True)

    # Center the rotated dice on a transparent tile-sized layer.
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - canvas.width) // 2
    y = (size - canvas.height) // 2
    layer.alpha_composite(canvas, (x, y))
    return layer


# ---------- compose ---------------------------------------------------------

def draw_icon(size: int, *, maskable: bool = False) -> Image.Image:
    safe_pad = int(size * 0.10) if maskable else int(size * 0.015)
    img = _tile(size, safe_pad)
    img.alpha_composite(_dice(size))
    return img


def draw_og() -> Image.Image:
    w, h = 1200, 630
    bg = Image.new("RGB", (w, h), BG_LIGHT)
    for y in range(h):
        t = y / h
        r = int(BG_LIGHT[0] * (1 - t) + BG_MID[0] * t)
        g = int(BG_LIGHT[1] * (1 - t) + BG_MID[1] * t)
        b = int(BG_LIGHT[2] * (1 - t) + BG_MID[2] * t)
        ImageDraw.Draw(bg).line([(0, y), (w, y)], fill=(r, g, b))

    icon = draw_icon(360).convert("RGBA")
    bg.paste(icon, (80, (h - 360) // 2), icon)

    draw = ImageDraw.Draw(bg)
    draw.text((500, 200), "Dolanan", font=_font(96), fill=PRIMARY)
    draw.text((500, 320), "Offline-first party games hub",
              font=_font(36, bold=False), fill=TEXT)
    draw.text((500, 380),
              "Chess · Ludo · Connect Four · Werewolf · Hangman",
              font=_font(28, bold=False), fill=(100, 116, 139))
    draw.text((500, 428),
              "Battleship · Dots & Boxes · Checkers · Truth or Dare",
              font=_font(28, bold=False), fill=(100, 116, 139))
    return bg


def favicon_svg() -> str:
    """Matches the PNG exactly — blue tile + one white dice, tilted."""
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="62" height="62" rx="14" fill="url(#g)"/>
  <g transform="translate(32 32) rotate(-8) translate(-17 -17)">
    <rect x="1" y="2" width="34" height="34" rx="7" fill="#0f172a" opacity="0.25"/>
    <rect x="0" y="0" width="34" height="34" rx="7" fill="#ffffff"/>
    <circle cx="9"  cy="9"  r="3" fill="#0f172a"/>
    <circle cx="25" cy="9"  r="3" fill="#0f172a"/>
    <circle cx="17" cy="17" r="3" fill="#0f172a"/>
    <circle cx="9"  cy="25" r="3" fill="#0f172a"/>
    <circle cx="25" cy="25" r="3" fill="#0f172a"/>
  </g>
</svg>"""


def main() -> None:
    for size in (192, 512):
        draw_icon(size).save(ICONS_DIR / f"icon-{size}.png")
        draw_icon(size, maskable=True).save(ICONS_DIR / f"icon-{size}-maskable.png")
    draw_icon(180).save(ICONS_DIR / "apple-touch-icon.png")
    draw_icon(64).save(ICONS_DIR / "favicon.png")
    (ICONS_DIR / "favicon.svg").write_text(favicon_svg())
    try:
        draw_icon(48).save(
            ICONS_DIR / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
        )
    except OSError:
        pass
    draw_og().save(ROOT / "og-image.png", optimize=True)
    print("Icons written to", ICONS_DIR)
    print("OG image:", ROOT / "og-image.png")


if __name__ == "__main__":
    main()
