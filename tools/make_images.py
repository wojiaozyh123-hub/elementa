#!/usr/bin/env python3
"""Render the web icons and the Open Graph image (SPEC §5 icon design).

Black rounded square; hydrogen's four Balmer lines as glowing bars at their true relative positions on the
app's log-frequency axis (red 656 nm on the left, violet 410 nm on the right); heights like a soft equaliser;
a faint sine wave through them.

Usage: python3 web/tools/make_images.py   (writes into web/)
"""
import math
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LINES = [(656.461, '#ff2a1a', 0.56), (486.269, '#00c8ff', 0.40), (434.168, '#4f5bff', 0.29), (410.290, '#8a3cff', 0.22)]
LO, HI = 400.0, 670.0


def pos(nm):
    """0…1 along a log-frequency axis: 670 nm (red) at 0, 400 nm (violet) at 1."""
    return math.log2(HI / nm) / math.log2(HI / LO)


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def bars_layer(w, h, x0, x1, cy, scale_h, bar_w, sine=True):
    """Additive glow + crisp bars on black, as an RGB image of size (w, h)."""
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    crisp = Image.new('RGB', (w, h), (0, 0, 0))
    gd, cd = ImageDraw.Draw(glow), ImageDraw.Draw(crisp)
    for nm, col, hh in LINES:
        x = x0 + pos(nm) * (x1 - x0)
        bh = hh * scale_h
        c = rgb(col)
        box = [x - bar_w / 2, cy - bh / 2, x + bar_w / 2, cy + bh / 2]
        gd.rounded_rectangle([box[0] - bar_w * .35, box[1] - bar_w * .35, box[2] + bar_w * .35, box[3] + bar_w * .35],
                             radius=bar_w, fill=c)
        cd.rounded_rectangle(box, radius=bar_w / 2, fill=c)
        # hot core
        core = tuple(int(v + (255 - v) * .45) for v in c)
        cw = bar_w * .34
        cd.rounded_rectangle([x - cw / 2, box[1] + bar_w * .3, x + cw / 2, box[3] - bar_w * .3], radius=cw / 2, fill=core)
    wide = glow.filter(ImageFilter.GaussianBlur(bar_w * 1.6))
    near = glow.filter(ImageFilter.GaussianBlur(bar_w * .55))
    out = ImageChops.add(Image.eval(wide, lambda v: int(v * .75)), Image.eval(near, lambda v: int(v * .55)))
    out = ImageChops.add(out, crisp)
    if sine:
        s = Image.new('RGB', (w, h), (0, 0, 0))
        sd = ImageDraw.Draw(s)
        pts = []
        amp = scale_h * .06
        span = x1 - x0 + bar_w * 3
        start = x0 - bar_w * 1.5
        for i in range(0, 401):
            t = i / 400
            pts.append((start + t * span, cy + amp * math.sin(t * math.pi * 2 * 2.25)))
        sd.line(pts, fill=(255, 255, 255), width=max(1, round(bar_w * .09)), joint='curve')
        s = s.filter(ImageFilter.GaussianBlur(bar_w * .04))
        out = ImageChops.add(out, Image.eval(s, lambda v: int(v * .16)))
    return out


def icon(size, rounded=True):
    S = 1024
    base = bars_layer(S, S, S * .22, S * .80, S * .5, S, S * .052)
    if rounded:
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * .225), fill=255)
        img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        img.paste(base, (0, 0), mask)
    else:
        img = base.convert('RGBA')
    return img.resize((size, size), Image.LANCZOS)


def font(path, size, var=None, index=0):
    f = ImageFont.truetype(path, size, index=index)
    if var:
        try:
            f.set_variation_by_name(var)
        except Exception:
            pass
    return f


def og():
    W, H = 1200, 630
    img = bars_layer(W, H, 120, 470, H / 2, 520, 27)
    d = ImageDraw.Draw(img)
    sf = '/System/Library/Fonts/SFNS.ttf'
    zh = '/System/Library/Fonts/Hiragino Sans GB.ttc'
    x = 610
    d.text((x, 180), 'Elementa', font=font(sf, 92, 'Semibold'), fill=(255, 255, 255))
    d.text((x + 3, 296), 'Hear the Elements', font=font(sf, 40, 'Regular'), fill=(142, 142, 147))
    d.text((x + 3, 356), '元素之声　听见元素周期表', font=font(zh, 32, index=0), fill=(142, 142, 147))
    d.text((x + 3, 452), 'Light is 40 octaves above sound.', font=font(sf, 25, 'Regular'), fill=(99, 99, 102))
    d.text((x + 3, 488), 'Here is what the elements sound like.', font=font(sf, 25, 'Regular'), fill=(99, 99, 102))
    img.save(os.path.join(WEB, 'og.png'), optimize=True)


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><filter id="g" x="-80%" y="-40%" width="260%" height="180%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
<rect width="64" height="64" rx="14.4" fill="#000"/>
<path d="M11 32c4.8-3.2 9.6-3.2 14.4 0s9.6 3.2 14.4 0 9.6-3.2 14.4 0" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width=".7"/>
<g filter="url(#g)" opacity=".85">{glow}</g>
{bars}
</svg>
"""


def svg():
    x0, x1, bw = 64 * .22, 64 * .80, 3.3
    glow, bars = [], []
    for nm, col, hh in LINES:
        x = x0 + pos(nm) * (x1 - x0)
        h = hh * 64
        r = f'x="{x - bw / 2:.2f}" y="{32 - h / 2:.2f}" width="{bw}" height="{h:.2f}" rx="{bw / 2}"'
        glow.append(f'<rect {r} fill="{col}"/>')
        bars.append(f'<rect {r} fill="{col}"/>')
    with open(os.path.join(WEB, 'icon.svg'), 'w') as f:
        f.write(SVG.replace('{glow}', ''.join(glow)).replace('{bars}', ''.join(bars)))


if __name__ == '__main__':
    icon(180, rounded=False).convert('RGB').save(os.path.join(WEB, 'apple-touch-icon.png'), optimize=True)
    icon(512).save(os.path.join(WEB, 'icon-512.png'), optimize=True)
    icon(192).save(os.path.join(WEB, 'icon-192.png'), optimize=True)
    icon(32).save(os.path.join(WEB, 'favicon-32.png'), optimize=True)
    svg()
    og()
    print('ok')
