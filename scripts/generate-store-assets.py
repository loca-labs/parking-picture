#!/usr/bin/env python3
"""
Generates store-ready visual assets for Apple App Store and Google Play Store:
  - store-assets/app-store/icon-1024x1024.png                 (1024x1024, RGB PNG, no alpha)
  - store-assets/app-store/iphone-6.9-1320x2868/01..05-*.png  (1320x2868, RGB PNG, no alpha)
  - store-assets/app-store/iphone-6.5-1284x2778/01..05-*.png  (1284x2778, RGB PNG, no alpha)
  - store-assets/google-play/icon-512x512.png                 (512x512, RGBA PNG, <=1024 KB)
  - store-assets/google-play/feature-graphic-1024x500.png     (1024x500, RGB PNG, no alpha)
  - store-assets/google-play/phone-1080x1920/01..05-*.png     (1080x1920, RGB PNG, no alpha)

All in-app screens match the real React Native components in:
  - src/App.tsx
  - src/components/PhotoViewer.tsx
  - src/widgets/RecentPhotosWidget.ios.tsx
  - src/widgets/RecentPhotosWidget.android.tsx
"""

from __future__ import annotations

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = ROOT / "assets"
# Optional `raw-parking-*.jpg` inputs; if missing, uses committed copies in store-assets/source-photos/.
RAW_PHOTO_DIR = ASSETS_DIR
OUT_DIR = ROOT / "store-assets"
SOURCE_PHOTOS_OUT = OUT_DIR / "source-photos"

SF_FONT_PATH = "/System/Library/Fonts/SFNS.ttf"
FALLBACK_FONT_PATH = "/System/Library/Fonts/HelveticaNeue.ttc"


def get_font(size: int, weight: int = 400, optical: int = 28) -> ImageFont.FreeTypeFont:
    try:
        font = ImageFont.truetype(SF_FONT_PATH, size)
        # Axes: Width (30..150), Optical Size (17..96), GRAD (400..1000), Weight (1..1000)
        font.set_variation_by_axes(
            [100, max(17, min(96, optical)), 400, max(100, min(900, weight))]
        )
        return font
    except Exception:
        return ImageFont.truetype(FALLBACK_FONT_PATH, size)


def cover_crop(img: Image.Image, target_w: int, target_h: int, zoom: float = 1.0, focus: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    """Center/focus-crops and resizes `img` to fill `(target_w, target_h)` with optional zoom."""
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h) * zoom
    new_w = max(target_w, int(round(src_w * scale)))
    new_h = max(target_h, int(round(src_h * scale)))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    max_x = new_w - target_w
    max_y = new_h - target_h
    left = int(round(max_x * focus[0]))
    top = int(round(max_y * focus[1]))
    return resized.crop((left, top, left + target_w, top + target_h))


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    """Supersampled 2x anti-aliased rounded rectangle alpha mask."""
    w, h = size
    ss = 2
    mask = Image.new("L", (w * ss, h * ss), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), radius=radius * ss, fill=255)
    return mask.resize((w, h), Image.Resampling.LANCZOS)


def paste_rounded(base: Image.Image, img: Image.Image, xy: tuple[int, int], radius: int) -> None:
    mask = rounded_mask(img.size, radius)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    # Combine existing alpha if any
    r, g, b, a = img.split()
    combined_a = Image.composite(a, Image.new("L", img.size, 0), mask)
    img_masked = Image.merge("RGBA", (r, g, b, combined_a))
    base.alpha_composite(img_masked, xy)


def draw_pill_badge(
    canvas: Image.Image,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    bg_rgba: tuple[int, int, int, int] = (0, 0, 0, 150),
    fg_rgba: tuple[int, int, int, int] = (255, 255, 255, 255),
    pad_x: int = 16,
    pad_y: int = 9,
    radius: int = 16,
    anchor_right: bool = False,
    anchor_bottom: bool = False,
) -> tuple[int, int, int, int]:
    probe = ImageDraw.Draw(canvas)
    bbox = probe.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    bw = tw + pad_x * 2
    bh = th + pad_y * 2
    x, y = xy
    if anchor_right:
        x -= bw
    if anchor_bottom:
        y -= bh

    pill = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pill)
    pd.rounded_rectangle((0, 0, bw - 1, bh - 1), radius=radius, fill=bg_rgba)
    pd.text((pad_x - bbox[0], pad_y - bbox[1]), text, font=font, fill=fg_rgba)
    # Anti-alias outer corners
    paste_rounded(canvas, pill, (x, y), radius)
    return (x, y, x + bw, y + bh)


def draw_lightning_icon(canvas: Image.Image, center: tuple[int, int], size: int, color: tuple[int, int, int, int]) -> None:
    """Draws a crisp vector lightning bolt icon matching `⚡︎` in src/App.tsx."""
    ss = 3
    box = size * ss
    layer = Image.new("RGBA", (box, box), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = [
        (box * 0.56, box * 0.10),
        (box * 0.22, box * 0.54),
        (box * 0.47, box * 0.54),
        (box * 0.40, box * 0.90),
        (box * 0.78, box * 0.44),
        (box * 0.53, box * 0.44),
    ]
    d.polygon(pts, fill=color)
    layer = layer.resize((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(layer, (center[0] - size // 2, center[1] - size // 2))


def draw_checkmark(canvas: Image.Image, center: tuple[int, int], size: int, color: tuple[int, int, int, int], stroke: int = 4) -> None:
    ss = 3
    box = size * ss
    layer = Image.new("RGBA", (box, box), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = [
        (box * 0.22, box * 0.52),
        (box * 0.42, box * 0.73),
        (box * 0.78, box * 0.29),
    ]
    d.line(pts, fill=color, width=stroke * ss, joint="curve")
    layer = layer.resize((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(layer, (center[0] - size // 2, center[1] - size // 2))


def draw_close_x(canvas: Image.Image, center: tuple[int, int], size: int, color: tuple[int, int, int, int], stroke: int = 3) -> None:
    ss = 3
    box = size * ss
    layer = Image.new("RGBA", (box, box), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    m = box * 0.26
    d.line([(m, m), (box - m, box - m)], fill=color, width=stroke * ss)
    d.line([(box - m, m), (m, box - m)], fill=color, width=stroke * ss)
    layer = layer.resize((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(layer, (center[0] - size // 2, center[1] - size // 2))


def create_gradient_bg(w: int, h: int, accent: tuple[int, int, int] = (24, 98, 235)) -> Image.Image:
    """Creates a deep navy studio background matching `#081632` with subtle radial glow."""
    # Render at 1/4 resolution and upscale smoothly to avoid banding and run fast
    gw, gh = max(128, w // 4), max(128, h // 4)
    grad = Image.new("RGB", (gw, gh))
    px = grad.load()
    cx, cy = gw * 0.5, gh * 0.22
    c2x, c2y = gw * 0.5, gh * 0.72
    for y in range(gh):
        t = y / max(1, gh - 1)
        base_r = 5 + int(8 * (1 - t))
        base_g = 14 + int(18 * (1 - t))
        base_b = 34 + int(36 * (1 - t))
        for x in range(gw):
            d1 = math.hypot((x - cx) / gw, (y - cy) / gh)
            glow1 = max(0.0, 1.0 - d1 * 2.1) ** 2.2
            d2 = math.hypot((x - c2x) / gw, (y - c2y) / gh)
            glow2 = max(0.0, 1.0 - d2 * 1.9) ** 2.4
            r = min(255, int(base_r + accent[0] * (0.34 * glow1 + 0.20 * glow2)))
            g = min(255, int(base_g + accent[1] * (0.34 * glow1 + 0.20 * glow2)))
            b = min(255, int(base_b + accent[2] * (0.38 * glow1 + 0.25 * glow2)))
            px[x, y] = (r, g, b)
    return grad.resize((w, h), Image.Resampling.BICUBIC).convert("RGBA")


def draw_status_bar(
    screen: Image.Image,
    platform: str,
    s: float,
) -> int:
    """Draws realistic iOS (Dynamic Island) or Android (punch-hole) status bar. Returns top safe inset."""
    sw, _ = screen.size
    d = ImageDraw.Draw(screen)
    time_font = get_font(int(30 * s), weight=650)

    if platform == "ios":
        top_inset = int(106 * s)
        # Time on left of Dynamic Island
        d.text((int(68 * s), int(36 * s)), "9:41", font=time_font, fill=(255, 255, 255, 255))
        # Dynamic Island pill
        di_w, di_h = int(236 * s), int(66 * s)
        di_x = (sw - di_w) // 2
        di_y = int(22 * s)
        d.rounded_rectangle((di_x, di_y, di_x + di_w, di_y + di_h), radius=di_h // 2, fill=(0, 0, 0, 255))
        d.rounded_rectangle((di_x, di_y, di_x + di_w, di_y + di_h), radius=di_h // 2, outline=(32, 36, 44, 200), width=max(1, int(2 * s)))
        # Signal bars + Wi-Fi + battery on right
        bx = sw - int(112 * s)
        by = int(42 * s)
        # Signal bars
        for i in range(4):
            bh = int((10 + i * 5) * s)
            bar_x = bx - int((64 - i * 11) * s)
            d.rounded_rectangle(
                (bar_x, by + int(24 * s) - bh, bar_x + int(7 * s), by + int(24 * s)),
                radius=max(1, int(2 * s)),
                fill=(255, 255, 255, 245),
            )
        # Battery body
        bat_w, bat_h = int(48 * s), int(24 * s)
        d.rounded_rectangle((bx, by, bx + bat_w, by + bat_h), radius=int(7 * s), outline=(255, 255, 255, 190), width=max(2, int(2.5 * s)))
        d.rounded_rectangle((bx + int(4 * s), by + int(4 * s), bx + bat_w - int(8 * s), by + bat_h - int(4 * s)), radius=int(4 * s), fill=(255, 255, 255, 255))
        d.rounded_rectangle((bx + bat_w + int(2 * s), by + int(7 * s), bx + bat_w + int(6 * s), by + bat_h - int(7 * s)), radius=int(2 * s), fill=(255, 255, 255, 180))
        return top_inset
    else:
        top_inset = int(84 * s)
        d.text((int(48 * s), int(24 * s)), "9:41", font=get_font(int(27 * s), weight=600), fill=(255, 255, 255, 245))
        # Center punch-hole camera
        cam_r = int(17 * s)
        cx, cy = sw // 2, int(40 * s)
        d.ellipse((cx - cam_r, cy - cam_r, cx + cam_r, cy + cam_r), fill=(0, 0, 0, 255), outline=(38, 42, 52, 220), width=max(1, int(2 * s)))
        # Right status icons (signal triangle + battery)
        bx = sw - int(84 * s)
        by = int(28 * s)
        for i in range(4):
            bh = int((9 + i * 4.5) * s)
            bar_x = bx - int((54 - i * 10) * s)
            d.rounded_rectangle(
                (bar_x, by + int(22 * s) - bh, bar_x + int(6 * s), by + int(22 * s)),
                radius=max(1, int(2 * s)),
                fill=(255, 255, 255, 240),
            )
        bat_w, bat_h = int(38 * s), int(20 * s)
        d.rounded_rectangle((bx, by + int(2 * s), bx + bat_w, by + int(2 * s) + bat_h), radius=int(5 * s), fill=(255, 255, 255, 245))
        return top_inset


def draw_home_indicator(screen: Image.Image, platform: str, s: float) -> int:
    sw, sh = screen.size
    d = ImageDraw.Draw(screen)
    if platform == "ios":
        w, h = int(268 * s), int(10 * s)
        x = (sw - w) // 2
        y = sh - int(24 * s)
        d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=(255, 255, 255, 210))
        return int(52 * s)
    else:
        w, h = int(210 * s), int(8 * s)
        x = (sw - w) // 2
        y = sh - int(22 * s)
        d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=(255, 255, 255, 190))
        return int(44 * s)


def render_main_screen(
    sw: int,
    sh: int,
    platform: str,
    camera_photo: Image.Image,
    saved_photo: Image.Image,
    parked_time: str = "2:15 PM",
    age_text: str = "18 min",
    counter_text: str = "1/3",
    torch_on: bool = False,
    cam_focus: tuple[float, float] = (0.5, 0.45),
    saved_focus: tuple[float, float] = (0.5, 0.45),
) -> Image.Image:
    """Renders exact replica of `MainScreen` in `src/App.tsx`."""
    s = sw / 780.0
    screen = Image.new("RGBA", (sw, sh), (0, 0, 0, 255))
    top_inset = draw_status_bar(screen, platform, s)
    bottom_inset = draw_home_indicator(screen, platform, s)

    margin_x = int(16 * s)
    pane_r = int(32 * s)
    shutter_row_h = int(176 * s)
    avail_h = sh - top_inset - bottom_inset - shutter_row_h
    pane_h = avail_h // 2
    pane_w = sw - margin_x * 2

    label_font = get_font(int(23 * s), weight=700)

    # --- Top pane: live camera ---
    top_y = top_inset
    cam_crop = cover_crop(camera_photo, pane_w, pane_h, zoom=1.02, focus=cam_focus)
    paste_rounded(screen, cam_crop, (margin_x, top_y), pane_r)

    # CAMERA badge (top-left)
    draw_pill_badge(
        screen,
        (margin_x + int(20 * s), top_y + int(20 * s)),
        "CAMERA",
        label_font,
        bg_rgba=(0, 0, 0, 148),
        pad_x=int(16 * s),
        pad_y=int(9 * s),
        radius=int(15 * s),
    )

    # Torch button (top-right, 40pt -> ~76px)
    tb_size = int(76 * s)
    tb_x = margin_x + pane_w - int(20 * s) - tb_size
    tb_y = top_y + int(20 * s)
    tb_layer = Image.new("RGBA", (tb_size, tb_size), (0, 0, 0, 0))
    td = ImageDraw.Draw(tb_layer)
    tb_bg = (255, 214, 10, 255) if torch_on else (0, 0, 0, 148)
    tb_fg = (0, 0, 0, 255) if torch_on else (255, 255, 255, 255)
    td.ellipse((0, 0, tb_size - 1, tb_size - 1), fill=tb_bg)
    draw_lightning_icon(tb_layer, (tb_size // 2, tb_size // 2), int(tb_size * 0.52), tb_fg)
    paste_rounded(screen, tb_layer, (tb_x, tb_y), tb_size // 2)

    # --- Shutter button row ---
    shutter_cy = top_y + pane_h + shutter_row_h // 2
    shutter_cx = sw // 2
    outer_r = int(70 * s)
    inner_r = int(53 * s)
    # Supersampled shutter circle for ultra-smooth anti-aliasing
    ss = 3
    sb_dim = (outer_r * 2 + 8) * ss
    sb_layer = Image.new("RGBA", (sb_dim, sb_dim), (0, 0, 0, 0))
    sbd = ImageDraw.Draw(sb_layer)
    c = sb_dim // 2
    sbd.ellipse(
        (c - outer_r * ss, c - outer_r * ss, c + outer_r * ss, c + outer_r * ss),
        outline=(255, 255, 255, 255),
        width=int(7.5 * s * ss),
    )
    sbd.ellipse(
        (c - inner_r * ss, c - inner_r * ss, c + inner_r * ss, c + inner_r * ss),
        fill=(255, 255, 255, 255),
    )
    sb_small = sb_layer.resize((sb_dim // ss, sb_dim // ss), Image.Resampling.LANCZOS)
    screen.alpha_composite(sb_small, (shutter_cx - sb_small.width // 2, shutter_cy - sb_small.height // 2))

    # --- Bottom pane: saved photo ---
    bot_y = top_y + pane_h + shutter_row_h
    saved_crop = cover_crop(saved_photo, pane_w, pane_h, zoom=1.0, focus=saved_focus)
    paste_rounded(screen, saved_crop, (margin_x, bot_y), pane_r)

    # PARKED HERE · time (top-left)
    draw_pill_badge(
        screen,
        (margin_x + int(20 * s), bot_y + int(20 * s)),
        f"PARKED HERE · {parked_time}",
        label_font,
        bg_rgba=(0, 0, 0, 152),
        pad_x=int(16 * s),
        pad_y=int(9 * s),
        radius=int(15 * s),
    )

    # Counter (top-right)
    if counter_text:
        draw_pill_badge(
            screen,
            (margin_x + pane_w - int(20 * s), bot_y + int(20 * s)),
            counter_text,
            label_font,
            bg_rgba=(0, 0, 0, 152),
            pad_x=int(16 * s),
            pad_y=int(9 * s),
            radius=int(15 * s),
            anchor_right=True,
        )

    # Elapsed age badge (bottom-left)
    draw_pill_badge(
        screen,
        (margin_x + int(20 * s), bot_y + pane_h - int(20 * s)),
        age_text,
        label_font,
        bg_rgba=(0, 0, 0, 152),
        pad_x=int(16 * s),
        pad_y=int(9 * s),
        radius=int(15 * s),
        anchor_bottom=True,
    )

    return screen


def render_photo_viewer_screen(
    sw: int,
    sh: int,
    platform: str,
    main_photo: Image.Image,
    thumbs: list[Image.Image],
    selecting: bool = False,
    zoom: float = 1.65,
    focus: tuple[float, float] = (0.52, 0.42),
    caption_text: str = "1/3 · 2:15 PM",
) -> Image.Image:
    """Renders exact replica of `PhotoViewer` in `src/components/PhotoViewer.tsx`."""
    s = sw / 780.0
    screen = Image.new("RGBA", (sw, sh), (0, 0, 0, 255))

    # Fullscreen zoomed or fit photo
    photo_h = int(sh * (0.78 if not selecting else 0.70))
    photo_y = (sh - photo_h) // 2 - (int(30 * s) if selecting else 0)
    cropped = cover_crop(main_photo, sw, photo_h, zoom=zoom, focus=focus)
    screen.alpha_composite(cropped.convert("RGBA"), (0, photo_y))

    top_inset = draw_status_bar(screen, platform, s)
    bottom_inset = draw_home_indicator(screen, platform, s)

    caption_font = get_font(int(23 * s), weight=700)
    btn_font = get_font(int(28 * s), weight=700)

    # Top-left caption
    draw_pill_badge(
        screen,
        (int(32 * s), top_inset + int(28 * s)),
        "2 selected" if selecting else caption_text,
        caption_font,
        bg_rgba=(0, 0, 0, 155),
        pad_x=int(16 * s),
        pad_y=int(9 * s),
        radius=int(15 * s),
    )

    # Top-right Close (✕) or Cancel
    if selecting:
        draw_pill_badge(
            screen,
            (sw - int(32 * s), top_inset + int(16 * s)),
            "Cancel",
            btn_font,
            bg_rgba=(0, 0, 0, 155),
            pad_x=int(30 * s),
            pad_y=int(15 * s),
            radius=int(38 * s),
            anchor_right=True,
        )
    else:
        cb_size = int(76 * s)
        cb_x = sw - int(32 * s) - cb_size
        cb_y = top_inset + int(16 * s)
        cb = Image.new("RGBA", (cb_size, cb_size), (0, 0, 0, 0))
        cbd = ImageDraw.Draw(cb)
        cbd.ellipse((0, 0, cb_size - 1, cb_size - 1), fill=(0, 0, 0, 155))
        draw_close_x(cb, (cb_size // 2, cb_size // 2), int(cb_size * 0.5), (255, 255, 255, 255), stroke=max(2, int(3.2 * s)))
        paste_rounded(screen, cb, (cb_x, cb_y), cb_size // 2)

    if not selecting:
        # Bottom bar: Share | Select | Delete
        bar_y = sh - bottom_inset - int(112 * s)
        labels = [
            ("Share", (0, 0, 0, 165), (255, 255, 255, 255)),
            ("Select", (0, 0, 0, 165), (255, 255, 255, 255)),
            ("Delete", (0, 0, 0, 165), (255, 69, 58, 255)),
        ]
        probe = ImageDraw.Draw(screen)
        widths = []
        pad_x, pad_y = int(38 * s), int(18 * s)
        for text, _, _ in labels:
            bb = probe.textbbox((0, 0), text, font=btn_font)
            widths.append((bb[2] - bb[0]) + pad_x * 2)
        gap = int(22 * s)
        total_w = sum(widths) + gap * (len(labels) - 1)
        cur_x = (sw - total_w) // 2
        for (text, bg, fg), w_item in zip(labels, widths):
            draw_pill_badge(
                screen,
                (cur_x, bar_y),
                text,
                btn_font,
                bg_rgba=bg,
                fg_rgba=fg,
                pad_x=pad_x,
                pad_y=pad_y,
                radius=int(38 * s),
            )
            cur_x += w_item + gap
    else:
        # Selecting mode: blue check circle + thumbnail strip + Select all / Share (2)
        bar_y = sh - bottom_inset - int(104 * s)

        # Bottom buttons: Select all | Share (2)
        btns = [
            ("Select all", (32, 36, 44, 210), (255, 255, 255, 255)),
            ("Share (2)", (255, 255, 255, 255), (0, 0, 0, 255)),
        ]
        probe = ImageDraw.Draw(screen)
        pad_x, pad_y = int(38 * s), int(18 * s)
        b_widths = []
        for t, _, _ in btns:
            bb = probe.textbbox((0, 0), t, font=btn_font)
            b_widths.append((bb[2] - bb[0]) + pad_x * 2)
        gap = int(24 * s)
        cur_x = (sw - (sum(b_widths) + gap)) // 2
        for (t, bg, fg), bw in zip(btns, b_widths):
            draw_pill_badge(
                screen,
                (cur_x, bar_y),
                t,
                btn_font,
                bg_rgba=bg,
                fg_rgba=fg,
                pad_x=pad_x,
                pad_y=pad_y,
                radius=int(38 * s),
            )
            cur_x += bw + gap

        # Thumbnail strip above bar
        thumb_sz = int(108 * s)
        strip_y = bar_y - thumb_sz - int(28 * s)
        t_gap = int(16 * s)
        strip_w = len(thumbs) * thumb_sz + (len(thumbs) - 1) * t_gap
        tx = (sw - strip_w) // 2
        selected_indices = {0, 1}
        for idx, th_img in enumerate(thumbs):
            tc = cover_crop(th_img, thumb_sz, thumb_sz, zoom=1.05).convert("RGBA")
            if idx not in selected_indices:
                # Dim unselected (opacity 0.45 in PhotoViewer.tsx)
                dark = Image.new("RGBA", (thumb_sz, thumb_sz), (0, 0, 0, 135))
                tc = Image.alpha_composite(tc, dark)
            paste_rounded(screen, tc, (tx, strip_y), int(16 * s))
            if idx == 0:
                d = ImageDraw.Draw(screen)
                d.rounded_rectangle(
                    (tx, strip_y, tx + thumb_sz - 1, strip_y + thumb_sz - 1),
                    radius=int(16 * s),
                    outline=(255, 255, 255, 255),
                    width=max(2, int(4 * s)),
                )
            if idx in selected_indices:
                badge_sz = int(34 * s)
                bx = tx + thumb_sz - badge_sz - int(6 * s)
                by = strip_y + thumb_sz - badge_sz - int(6 * s)
                bl = Image.new("RGBA", (badge_sz, badge_sz), (0, 0, 0, 0))
                bld = ImageDraw.Draw(bl)
                bld.ellipse((0, 0, badge_sz - 1, badge_sz - 1), fill=(10, 132, 255, 255))
                draw_checkmark(bl, (badge_sz // 2, badge_sz // 2), int(badge_sz * 0.62), (255, 255, 255, 255), stroke=max(2, int(2.6 * s)))
                paste_rounded(screen, bl, (bx, by), badge_sz // 2)
            tx += thumb_sz + t_gap

        # Current photo blue check circle (right-aligned above strip)
        chk_sz = int(68 * s)
        chk_x = sw - int(32 * s) - chk_sz
        chk_y = strip_y - chk_sz - int(24 * s)
        cl = Image.new("RGBA", (chk_sz, chk_sz), (0, 0, 0, 0))
        cld = ImageDraw.Draw(cl)
        cld.ellipse((0, 0, chk_sz - 1, chk_sz - 1), fill=(10, 132, 255, 255))
        draw_checkmark(cl, (chk_sz // 2, chk_sz // 2), int(chk_sz * 0.56), (255, 255, 255, 255), stroke=max(2, int(3.8 * s)))
        paste_rounded(screen, cl, (chk_x, chk_y), chk_sz // 2)

    return screen


def render_widget_card(
    w: int,
    h: int,
    photos: list[Image.Image],
    age_text: str = "18 min",
    layout: str = "medium",
    s: float = 1.0,
) -> Image.Image:
    """Renders RecentPhotosWidget (SwiftUI / Glance) matching `src/widgets/RecentPhotosWidget.*.tsx`."""
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    bg = Image.new("RGBA", (w, h), (6, 8, 12, 255))
    outer_r = int(40 * s)
    pad = int(16 * s)
    gap = int(12 * s)
    inner_r = max(int(22 * s), outer_r - pad // 2)

    cw = w - pad * 2
    ch = h - pad * 2

    if layout == "medium":
        # 3 photos side by side
        n = min(3, len(photos))
        tw = (cw - gap * (n - 1)) // n
        for i in range(n):
            tile = cover_crop(photos[i], tw, ch, zoom=1.05)
            tx = pad + i * (tw + gap)
            paste_rounded(bg, tile, (tx, pad), inner_r)
            if i == 0:
                draw_pill_badge(
                    bg,
                    (tx + int(12 * s), pad + ch - int(12 * s)),
                    age_text,
                    get_font(int(21 * s), weight=650),
                    bg_rgba=(0, 0, 0, 175),
                    pad_x=int(12 * s),
                    pad_y=int(6 * s),
                    radius=int(12 * s),
                    anchor_bottom=True,
                )
    else:
        # Large / square: newest photo on top, 2 older underneath
        bot_h = int(ch * 0.34)
        top_h = ch - gap - bot_h
        top_tile = cover_crop(photos[0], cw, top_h, zoom=1.02, focus=(0.5, 0.45))
        paste_rounded(bg, top_tile, (pad, pad), inner_r)
        draw_pill_badge(
            bg,
            (pad + int(14 * s), pad + top_h - int(14 * s)),
            age_text,
            get_font(int(22 * s), weight=700),
            bg_rgba=(0, 0, 0, 175),
            pad_x=int(14 * s),
            pad_y=int(7 * s),
            radius=int(13 * s),
            anchor_bottom=True,
        )
        tw = (cw - gap) // 2
        for i, p in enumerate(photos[1:3]):
            bt = cover_crop(p, tw, bot_h, zoom=1.05)
            paste_rounded(bg, bt, (pad + i * (tw + gap), pad + top_h + gap), inner_r)

    # Subtle outer border so widget pops against dark wallpaper
    bd = ImageDraw.Draw(bg)
    bd.rounded_rectangle((0, 0, w - 1, h - 1), radius=outer_r, outline=(255, 255, 255, 34), width=max(1, int(2 * s)))
    paste_rounded(card, bg, (0, 0), outer_r)
    return card


def render_home_screen_widget_scene(
    sw: int,
    sh: int,
    platform: str,
    app_icon: Image.Image,
    photos: list[Image.Image],
) -> Image.Image:
    """Renders an iOS or Android Home Screen showcasing the `Recent parking photos` widget + app icon."""
    s = sw / 780.0
    # Rich atmospheric Home Screen wallpaper
    screen = create_gradient_bg(sw, sh, accent=(44, 128, 255))
    top_inset = draw_status_bar(screen, platform, s)
    bottom_inset = draw_home_indicator(screen, platform, s)

    pad_x = int(42 * s)
    content_w = sw - pad_x * 2
    lbl_font = get_font(int(22 * s), weight=500)
    d = ImageDraw.Draw(screen)

    # 1) Medium / 4x2 wide widget at top
    med_y = top_inset + int(34 * s)
    med_h = int(318 * s)
    med_widget = render_widget_card(content_w, med_h, photos, age_text="18 min", layout="medium", s=s)
    screen.alpha_composite(med_widget, (pad_x, med_y))
    w_label = "Parking Picture"
    w_bb = d.textbbox((0, 0), w_label, font=lbl_font)
    d.text(((sw - (w_bb[2] - w_bb[0])) // 2, med_y + med_h + int(12 * s)), w_label, font=lbl_font, fill=(255, 255, 255, 230))

    # 2) Large / 4x4 widget below + app icon row
    lg_y = med_y + med_h + int(68 * s)
    lg_h = int(640 * s)
    lg_widget = render_widget_card(content_w, lg_h, photos, age_text="18 min", layout="large", s=s)
    screen.alpha_composite(lg_widget, (pad_x, lg_y))
    d.text(((sw - (w_bb[2] - w_bb[0])) // 2, lg_y + lg_h + int(12 * s)), w_label, font=lbl_font, fill=(255, 255, 255, 230))

    # 3) Home Screen app icon row near bottom
    row_y = lg_y + lg_h + int(76 * s)
    icon_sz = int(122 * s)
    icon_r = int(28 * s) if platform == "ios" else icon_sz // 2
    col_gap = (content_w - icon_sz * 4) // 3

    placeholder_apps = [
        ("Parking", app_icon, None),
        ("Maps", None, ((34, 197, 94), "M")),
        ("Camera", None, ((71, 85, 105), "C")),
        ("Clock", None, ((30, 41, 59), "9:41")),
    ]

    for idx, (name, real_ic, synth) in enumerate(placeholder_apps):
        ix = pad_x + idx * (icon_sz + col_gap)
        if row_y + icon_sz + int(40 * s) > sh - bottom_inset:
            break
        if real_ic is not None:
            ic_resized = real_ic.resize((icon_sz, icon_sz), Image.Resampling.LANCZOS)
            paste_rounded(screen, ic_resized, (ix, row_y), icon_r)
        else:
            color, glyph = synth
            ic_img = Image.new("RGBA", (icon_sz, icon_sz), (*color, 255))
            icd = ImageDraw.Draw(ic_img)
            gf = get_font(int((30 if len(glyph) > 1 else 52) * s), weight=700)
            gbb = icd.textbbox((0, 0), glyph, font=gf)
            icd.text(
                ((icon_sz - (gbb[2] - gbb[0])) // 2 - gbb[0], (icon_sz - (gbb[3] - gbb[1])) // 2 - gbb[1]),
                glyph,
                font=gf,
                fill=(255, 255, 255, 240),
            )
            paste_rounded(screen, ic_img, (ix, row_y), icon_r)
        nbb = d.textbbox((0, 0), name, font=lbl_font)
        d.text(
            (ix + (icon_sz - (nbb[2] - nbb[0])) // 2, row_y + icon_sz + int(10 * s)),
            name,
            font=lbl_font,
            fill=(255, 255, 255, 225),
        )

    return screen


def frame_device_on_poster(
    canvas_w: int,
    canvas_h: int,
    platform: str,
    eyebrow: str,
    headline: str,
    subtitle: str,
    screen_renderer,
    accent: tuple[int, int, int] = (28, 108, 242),
) -> Image.Image:
    """Composites marketing headline + realistic hardware bezel + drop shadow onto a store screenshot canvas."""
    poster = create_gradient_bg(canvas_w, canvas_h, accent=accent)
    u = canvas_w / 1320.0  # normalized layout scale

    d = ImageDraw.Draw(poster)

    # --- Eyebrow pill ---
    eyebrow_font = get_font(int(28 * u), weight=700, optical=24)
    ebb = d.textbbox((0, 0), eyebrow, font=eyebrow_font)
    ep_w = (ebb[2] - ebb[0]) + int(48 * u)
    ep_h = (ebb[3] - ebb[1]) + int(22 * u)
    ep_x = (canvas_w - ep_w) // 2
    ep_y = int(92 * u) if canvas_h / canvas_w > 1.95 else int(58 * u)

    ep_layer = Image.new("RGBA", (ep_w, ep_h), (0, 0, 0, 0))
    epd = ImageDraw.Draw(ep_layer)
    epd.rounded_rectangle(
        (0, 0, ep_w - 1, ep_h - 1),
        radius=ep_h // 2,
        fill=(*accent, 52),
        outline=(*accent, 145),
        width=max(2, int(2.5 * u)),
    )
    epd.text(
        ((ep_w - (ebb[2] - ebb[0])) // 2 - ebb[0], (ep_h - (ebb[3] - ebb[1])) // 2 - ebb[1]),
        eyebrow,
        font=eyebrow_font,
        fill=(148, 200, 255, 255),
    )
    poster.alpha_composite(ep_layer, (ep_x, ep_y))

    # --- Headline (2 lines) ---
    is_tall = (canvas_h / canvas_w) > 1.95
    head_size = int((86 if is_tall else 76) * u)
    head_font = get_font(head_size, weight=800, optical=72)
    cur_y = ep_y + ep_h + int((34 if is_tall else 24) * u)
    for line in headline.split("\n"):
        lbb = d.textbbox((0, 0), line, font=head_font)
        lw = lbb[2] - lbb[0]
        d.text(((canvas_w - lw) // 2 - lbb[0], cur_y - lbb[1]), line, font=head_font, fill=(255, 255, 255, 255))
        cur_y += int(head_size * 1.13)

    # --- Subtitle ---
    sub_size = int((37 if is_tall else 33) * u)
    sub_font = get_font(sub_size, weight=450, optical=28)
    cur_y += int(14 * u)
    for sline in subtitle.split("\n"):
        sbb = d.textbbox((0, 0), sline, font=sub_font)
        sw_txt = sbb[2] - sbb[0]
        d.text(((canvas_w - sw_txt) // 2 - sbb[0], cur_y - sbb[1]), sline, font=sub_font, fill=(192, 208, 234, 245))
        cur_y += int(sub_size * 1.34)

    # --- Phone Bezel & Screen ---
    phone_top = cur_y + int((54 if is_tall else 36) * u)
    bottom_margin = int((76 if is_tall else 52) * u)
    avail_phone_h = canvas_h - phone_top - bottom_margin
    bezel = int(22 * u)

    # Keep authentic phone screen aspect ratio (~19.5:9 for iOS, ~19.5:9 for modern Android)
    screen_aspect = 2.16 if platform == "ios" else 2.08
    max_phone_w = int(canvas_w * 0.80)
    screen_h = avail_phone_h - bezel * 2
    screen_w = int(round(screen_h / screen_aspect))
    if screen_w + bezel * 2 > max_phone_w:
        screen_w = max_phone_w - bezel * 2
        screen_h = int(round(screen_w * screen_aspect))

    phone_w = screen_w + bezel * 2
    phone_h = screen_h + bezel * 2
    phone_x = (canvas_w - phone_w) // 2
    phone_y = phone_top + (avail_phone_h - phone_h) // 2

    outer_r = int((104 if platform == "ios" else 82) * u)
    inner_r = max(int(24 * u), outer_r - bezel)

    # Soft drop shadow behind phone
    shadow_pad = int(80 * u)
    shadow = Image.new("RGBA", (phone_w + shadow_pad * 2, phone_h + shadow_pad * 2), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        (shadow_pad, shadow_pad + int(24 * u), shadow_pad + phone_w, shadow_pad + phone_h + int(24 * u)),
        radius=outer_r,
        fill=(0, 4, 14, 195),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=int(34 * u)))
    poster.alpha_composite(shadow, (phone_x - shadow_pad, phone_y - shadow_pad))

    # Metallic titanium/aluminum chassis
    chassis = Image.new("RGBA", (phone_w, phone_h), (0, 0, 0, 0))
    cd = ImageDraw.Draw(chassis)
    cd.rounded_rectangle((0, 0, phone_w - 1, phone_h - 1), radius=outer_r, fill=(24, 30, 42, 255))
    cd.rounded_rectangle(
        (0, 0, phone_w - 1, phone_h - 1),
        radius=outer_r,
        outline=(110, 134, 175, 165),
        width=max(2, int(4 * u)),
    )
    cd.rounded_rectangle(
        (int(5 * u), int(5 * u), phone_w - 1 - int(5 * u), phone_h - 1 - int(5 * u)),
        radius=max(10, outer_r - int(5 * u)),
        outline=(10, 13, 20, 255),
        width=max(2, int(4 * u)),
    )
    paste_rounded(poster, chassis, (phone_x, phone_y), outer_r)

    # Render screen and paste inside bezel
    screen_img = screen_renderer(screen_w, screen_h, platform)
    paste_rounded(poster, screen_img, (phone_x + bezel, phone_y + bezel), inner_r)

    return poster.convert("RGB")


def generate_feature_graphic(
    app_icon: Image.Image,
    cam_photo: Image.Image,
    saved_photo: Image.Image,
    extra_photos: list[Image.Image],
) -> Image.Image:
    """Generates the 1024x500 Google Play Feature Graphic (24-bit RGB, no alpha)."""
    W, H = 1024, 500
    canvas = create_gradient_bg(W, H, accent=(32, 114, 255))

    # Add subtle ambient glow on right behind devices
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((520, -40, 1040, 520), fill=(36, 122, 255, 72))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=65))
    canvas.alpha_composite(glow, (0, 0))

    d = ImageDraw.Draw(canvas)

    # --- Left column (safe zone x=64..540) ---
    lx = 64
    # App icon + brand badge row
    ic_sz = 76
    ic_resized = app_icon.resize((ic_sz, ic_sz), Image.Resampling.LANCZOS)
    paste_rounded(canvas, ic_resized, (lx, 62), 18)
    # Subtle outline around icon
    d.rounded_rectangle((lx, 62, lx + ic_sz - 1, 62 + ic_sz - 1), radius=18, outline=(255, 255, 255, 55), width=2)

    brand_font = get_font(22, weight=750, optical=24)
    sub_brand_font = get_font(16, weight=500, optical=20)
    d.text((lx + ic_sz + 16, 74), "PARKING PICTURE", font=brand_font, fill=(140, 196, 255, 255))
    d.text((lx + ic_sz + 16, 103), "Save & find your spot fast", font=sub_brand_font, fill=(186, 204, 232, 225))

    # Main Headline
    h_font = get_font(52, weight=820, optical=72)
    d.text((lx, 168), "Remember Where", font=h_font, fill=(255, 255, 255, 255))
    d.text((lx, 228), "You Parked.", font=h_font, fill=(255, 255, 255, 255))

    # Feature bullets / tagline
    b_font = get_font(20, weight=500, optical=24)
    d.text((lx, 308), "One-tap camera  ·  Flashlight  ·  Home widget", font=b_font, fill=(200, 216, 242, 245))

    # Privacy pill at bottom-left
    pill_font = get_font(17, weight=650, optical=20)
    draw_pill_badge(
        canvas,
        (lx, 368),
        "100% On-Device Photos  ·  No Account Needed",
        pill_font,
        bg_rgba=(255, 255, 255, 24),
        fg_rgba=(225, 238, 255, 255),
        pad_x=18,
        pad_y=10,
        radius=20,
    )

    # --- Right column: Sleek Android phone + floating Home Screen widget ---
    pw, ph = 246, 488
    bezel = 9
    sw, sh = pw - bezel * 2, ph - bezel * 2
    screen_img = render_main_screen(
        sw * 2,
        sh * 2,
        "android",
        camera_photo=cam_photo,
        saved_photo=saved_photo,
        parked_time="2:15 PM",
        age_text="18 min",
        counter_text="1/3",
    ).resize((sw, sh), Image.Resampling.LANCZOS)

    phone = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    pd = ImageDraw.Draw(phone)
    pd.rounded_rectangle((0, 0, pw - 1, ph - 1), radius=34, fill=(22, 28, 40, 255), outline=(120, 146, 190, 180), width=2)
    paste_rounded(phone, screen_img, (bezel, bezel), 26)

    px, py = 716, 38
    # Phone shadow
    pshadow = Image.new("RGBA", (pw + 80, ph + 80), (0, 0, 0, 0))
    psd = ImageDraw.Draw(pshadow)
    psd.rounded_rectangle((40, 52, 40 + pw, 52 + ph), radius=34, fill=(0, 4, 14, 200))
    pshadow = pshadow.filter(ImageFilter.GaussianBlur(radius=22))
    canvas.alpha_composite(pshadow, (px - 40, py - 40))
    canvas.alpha_composite(phone, (px, py))

    # Floating Home Screen Widget card overlapping bottom-left of phone
    ww, wh = 250, 128
    widget_hi = render_widget_card(ww * 2, wh * 2, extra_photos, age_text="18 min", layout="medium", s=0.68).resize(
        (ww, wh), Image.Resampling.LANCZOS
    )
    wx, wy = 528, 326
    wshadow = Image.new("RGBA", (ww + 60, wh + 60), (0, 0, 0, 0))
    wsd = ImageDraw.Draw(wshadow)
    wsd.rounded_rectangle((30, 38, 30 + ww, 38 + wh), radius=24, fill=(0, 4, 14, 215))
    wshadow = wshadow.filter(ImageFilter.GaussianBlur(radius=16))
    canvas.alpha_composite(wshadow, (wx - 30, wy - 30))
    canvas.alpha_composite(widget_hi, (wx, wy))

    return canvas.convert("RGB")


def main() -> None:
    app_store_dir = OUT_DIR / "app-store"
    ios_69_dir = app_store_dir / "iphone-6.9-1320x2868"
    ios_65_dir = app_store_dir / "iphone-6.5-1284x2778"
    gp_dir = OUT_DIR / "google-play"
    gp_phone_dir = gp_dir / "phone-1080x1920"

    for d in (app_store_dir, ios_69_dir, ios_65_dir, gp_dir, gp_phone_dir, SOURCE_PHOTOS_OUT):
        d.mkdir(parents=True, exist_ok=True)

    # Load brand icon and raw parking garage photographs
    icon_master = Image.open(ASSETS_DIR / "icon.png").convert("RGB")

    def load_source_photo(raw_name: str, saved_name: str) -> Image.Image:
        saved_path = SOURCE_PHOTOS_OUT / saved_name
        raw_path = RAW_PHOTO_DIR / raw_name
        if raw_path.exists():
            img = Image.open(raw_path).convert("RGB")
            img.save(saved_path, quality=92)
            return img
        return Image.open(saved_path).convert("RGB")

    photo_b2 = load_source_photo("raw-parking-b2.jpg", "parking-b2.jpg")
    photo_p4 = load_source_photo("raw-parking-p4.jpg", "parking-p4.jpg")
    photo_torch = load_source_photo("raw-parking-torch.jpg", "parking-torch.jpg")
    photo_lot_a = load_source_photo("raw-parking-lot-a-clean.jpg", "parking-lot-a.jpg")

    # 1. App Store 1024x1024 icon (24-bit RGB, no alpha)
    icon_master.save(app_store_dir / "icon-1024x1024.png", format="PNG", optimize=True)

    # 2. Google Play 512x512 icon (32-bit RGBA PNG, <=1024 KB)
    icon_512 = icon_master.resize((512, 512), Image.Resampling.LANCZOS).convert("RGBA")
    icon_512.save(gp_dir / "icon-512x512.png", format="PNG", optimize=True)

    # 3. Google Play 1024x500 Feature Graphic (24-bit RGB, no alpha)
    fg = generate_feature_graphic(
        icon_master.convert("RGBA"),
        cam_photo=photo_p4,
        saved_photo=photo_b2,
        extra_photos=[photo_b2, photo_p4, photo_lot_a],
    )
    fg.save(gp_dir / "feature-graphic-1024x500.png", format="PNG", optimize=True)

    # 4. Define the 5 screenshot slides
    slides = [
        (
            "01-snap-in-one-tap.png",
            "ONE-TAP CAPTURE",
            "Snap Your Spot\nin One Tap",
            "Opens straight to the live camera —\nsaved instantly with your parking time.",
            (28, 108, 242),
            lambda sw, sh, plat: render_main_screen(
                sw,
                sh,
                plat,
                camera_photo=photo_p4,
                saved_photo=photo_b2,
                parked_time="2:15 PM",
                age_text="18 min",
                counter_text="1/3",
                torch_on=False,
            ),
        ),
        (
            "02-zoom-every-detail.png",
            "PINCH & DOUBLE-TAP",
            "Zoom In on\nEvery Detail",
            "Read floor numbers, pillars, and row\nsigns in crisp fullscreen clarity.",
            (18, 128, 224),
            lambda sw, sh, plat: render_photo_viewer_screen(
                sw,
                sh,
                plat,
                main_photo=photo_b2,
                thumbs=[photo_b2, photo_p4, photo_lot_a],
                selecting=False,
                zoom=1.55,
                focus=(0.50, 0.42),
                caption_text="1/3 · 2:15 PM",
            ),
        ),
        (
            "03-home-screen-widget.png",
            "HOME SCREEN WIDGET",
            "One Glance on\nYour Home Screen",
            "Check your latest 3 spots and live\nparking timer without opening the app.",
            (46, 104, 246),
            lambda sw, sh, plat: render_home_screen_widget_scene(
                sw,
                sh,
                plat,
                app_icon=icon_master.convert("RGBA"),
                photos=[photo_b2, photo_p4, photo_lot_a],
            ),
        ),
        (
            "04-flashlight-and-history.png",
            "FLASHLIGHT & HISTORY",
            "Built for Dark\nParking Garages",
            "One-tap flashlight for dim levels and\nautomatic 20-photo spot history.",
            (38, 92, 214),
            lambda sw, sh, plat: render_main_screen(
                sw,
                sh,
                plat,
                camera_photo=photo_torch,
                saved_photo=photo_lot_a,
                parked_time="5:40 PM",
                age_text="1 hr, 12 min",
                counter_text="2/6",
                torch_on=True,
                cam_focus=(0.52, 0.45),
                saved_focus=(0.35, 0.45),
            ),
        ),
        (
            "05-share-and-private.png",
            "PRIVATE BY DESIGN",
            "Share Easily.\n100% On-Device.",
            "Send spots to friends in two taps.\nNo account, no cloud, no ads.",
            (16, 118, 232),
            lambda sw, sh, plat: render_photo_viewer_screen(
                sw,
                sh,
                plat,
                main_photo=photo_p4,
                thumbs=[photo_p4, photo_b2, photo_lot_a, photo_torch],
                selecting=True,
                zoom=1.08,
                focus=(0.50, 0.44),
            ),
        ),
    ]

    for filename, eyebrow, headline, subtitle, accent, renderer in slides:
        # iOS 6.9" (1320 x 2868)
        ios_69 = frame_device_on_poster(1320, 2868, "ios", eyebrow, headline, subtitle, renderer, accent=accent)
        ios_69.save(ios_69_dir / filename, format="PNG", optimize=True)

        # iOS 6.5" (1284 x 2778)
        ios_65 = frame_device_on_poster(1284, 2778, "ios", eyebrow, headline, subtitle, renderer, accent=accent)
        ios_65.save(ios_65_dir / filename, format="PNG", optimize=True)

        # Google Play Phone 9:16 (1080 x 1920)
        gp_shot = frame_device_on_poster(1080, 1920, "android", eyebrow, headline, subtitle, renderer, accent=accent)
        gp_shot.save(gp_phone_dir / filename, format="PNG", optimize=True)

        print(f"Generated {filename} across iOS 6.9\", iOS 6.5\", and Android 9:16")

    print("All App Store and Google Play visual assets generated successfully!")


if __name__ == "__main__":
    main()
