// Spell share card: 1080 × 1350 PNG. Black, the word, its element tiles, stacked spectrum strips, wordmark.

import { drawSpectrum, drawLines, RANGE_VIS } from './spectrum.js';
import { hexToRgb } from './physics.js';

const W = 1080, H = 1350, PAD = 90;
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function mark(g, x, y, s) {
  const bars = [[4.6, 4, 16, '#ff2a1a'], [13.4, 6.5, 11, '#00c8ff'], [16.8, 8, 8, '#4f5bff'], [19.6, 9, 6, '#8a3cff']];
  for (const [bx, by, bh, c] of bars) {
    g.fillStyle = c;
    rr(g, x + bx * s, y + by * s, 1.8 * s, bh * s, 0.9 * s);
    g.fill();
  }
}

/**
 * tokens: output of segment(); els: Map symbol → element; word: text as typed.
 * Returns a canvas.
 */
export function renderCard(word, tokens, els, t, url) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);

  // the word
  let fs = 150;
  g.font = `600 ${fs}px ${FONT}`;
  while (fs > 56 && g.measureText(word).width > W - 2 * PAD) { fs -= 4; g.font = `600 ${fs}px ${FONT}`; }
  if (g.measureText(word).width > W - 2 * PAD) {
    while (word.length > 1 && g.measureText(word + '…').width > W - 2 * PAD) word = word.slice(0, -1);
    word += '…';
  }
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  g.fillText(word, PAD, PAD + fs * 0.9);
  let y = PAD + fs * 0.9 + 26;
  g.font = `400 32px ${FONT}`;
  g.fillStyle = '#8e8e93';
  g.fillText(t.cardSub, PAD, y + 30);
  y += 90;

  // tiles, wrapped into rows
  const items = tokens;
  const maxW = W - 2 * PAD;
  const count = Math.max(1, items.filter(k => k.t !== 'space').length);
  const perRow = Math.ceil(count / Math.ceil(count / 8));
  const gap = 18;
  const size = Math.min(160, (maxW - (perRow - 1) * gap) / perRow);
  let x = PAD, rowY = y;
  let n = 0;
  const strips = [];
  for (const k of items) {
    if (k.t === 'space') { if (x > PAD) x += size * 0.4; continue; }
    if (n >= perRow || x + size > W - PAD + 0.5) { n = 0; x = PAD; rowY += size + gap; }
    if (k.t === 'el') {
      const el = els.get(k.s);
      const rgb = el.glow ? hexToRgb(el.glow).join(',') : null;
      // a lit tile: its own light glows around it and tints it from inside — no outline
      g.save();
      if (rgb) { g.shadowColor = `rgba(${rgb},.5)`; g.shadowBlur = 46; }
      g.fillStyle = '#0e0e10';
      rr(g, x, rowY, size, size, 16);
      g.fill();
      g.restore();
      if (rgb) {
        const gr = g.createRadialGradient(x + size / 2, rowY + size / 2, 0, x + size / 2, rowY + size / 2, size * 0.72);
        gr.addColorStop(0, `rgba(${rgb},.24)`);
        gr.addColorStop(1, `rgba(${rgb},.04)`);
        g.fillStyle = gr;
        rr(g, x, rowY, size, size, 16);
        g.fill();
      }
      g.fillStyle = '#8e8e93';
      g.font = `500 ${Math.round(size * 0.14)}px ${FONT}`;
      g.textAlign = 'left';
      g.fillText(String(el.z), x + size * 0.1, rowY + size * 0.2);
      g.fillStyle = el.vis.length ? '#fff' : '#48484a';
      g.font = `600 ${Math.round(size * 0.42)}px ${FONT}`;
      g.textAlign = 'center';
      g.fillText(el.s, x + size / 2, rowY + size * 0.64);
      g.textAlign = 'left';
      strips.push(el);
    } else {
      g.fillStyle = '#48484a';
      g.font = `600 ${Math.round(size * 0.42)}px ${FONT}`;
      g.textAlign = 'center';
      g.fillText(k.text.toUpperCase(), x + size / 2, rowY + size * 0.64);
      g.textAlign = 'left';
    }
    x += size + gap;
    n++;
  }
  y = rowY + size + 70;

  // stacked spectrum strips
  const footer = H - PAD - 60;
  const avail = footer - y - 30;
  const uniq = [...new Set(strips)];
  strips.length = 0;
  strips.push(...uniq.slice(0, Math.max(1, Math.floor((avail + 8) / 30))));
  if (strips.length) {
    const n = strips.length;
    const sh = Math.max(20, Math.min(120, (avail - (n - 1) * 14) / n));
    const sg = Math.min(26, Math.max(6, (avail - n * sh) / Math.max(1, n - 1)));
    y += Math.max(0, (avail - (n * sh + (n - 1) * sg)) / 2); // centre the block in the free space
    const labelW = 86;
    // Strips are drawn on their own transparent canvas: their soft top/bottom fade works by erasing,
    // which on the card itself would punch see-through bands into the black.
    const sw = W - 2 * PAD - labelW, shp = Math.round(sh);
    const off = document.createElement('canvas');
    off.width = sw; off.height = shp;
    const og = off.getContext('2d');
    for (const el of strips) {
      g.fillStyle = '#8e8e93';
      g.font = `600 ${Math.min(30, Math.round(sh * 0.55))}px ${FONT}`;
      g.textBaseline = 'middle';
      g.fillText(el.s, PAD, y + sh / 2);
      g.textBaseline = 'alphabetic';
      og.clearRect(0, 0, sw, shp);
      drawSpectrum(og, 0, 0, sw, shp, drawLines(el, false), { range: RANGE_VIS, px: 2 });
      g.drawImage(off, PAD + labelW, Math.round(y));
      y += sh + sg;
    }
  }

  // wordmark
  const by = H - PAD;
  mark(g, PAD - 6, by - 44, 2.4);
  g.fillStyle = '#fff';
  g.font = `600 40px ${FONT}`;
  g.fillText('Elementa', PAD + 58, by - 8);
  const wm = g.measureText('Elementa').width;
  g.fillStyle = '#8e8e93';
  g.font = `400 28px ${FONT}`;
  g.fillText('元素之声', PAD + 58 + wm + 18, by - 10);
  g.fillStyle = '#48484a';
  g.font = `400 24px ${FONT}`;
  g.textAlign = 'right';
  g.fillText(url.replace(/^https?:\/\//, '').replace(/\/$/, ''), W - PAD, by - 10);
  g.textAlign = 'left';
  return c;
}
