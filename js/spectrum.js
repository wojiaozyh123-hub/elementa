// Spectrum strips (SPEC §5): black, one soft vertical line per spectral line, brightness ∝ amp.
// The x-axis is log-frequency — red (low) on the left, violet (high) on the right — the same axis as
// the stereo pan, so what you see is where you hear it. Lines outside 380–780 nm are thin grey.

import { rgb, xOf, isVisible, RANGE_VIS, RANGE_FULL } from './physics.js';
import { TAU, DUR } from './audio.js';

export { RANGE_VIS, RANGE_FULL };
const GREY = '205,205,212';

/** Lines to draw for an element: the visible drawing set, plus the UV/IR sound lines in the full range. */
export function drawLines(el, full) {
  if (!full) return el.spec;
  return el.spec.concat(el.full.filter(([nm]) => !isVisible(nm))).sort((a, b) => a[0] - b[0]);
}

/** Brightness of a line t seconds after its note starts (follows the sound's envelope). */
export function flashLevel(t) {
  if (t < 0 || t > DUR) return 0;
  return Math.min(1, t / 0.006) * Math.exp(-t / TAU);
}

/**
 * Draw a strip into the rectangle (x0, y0, w, h) of a 2D context.
 * lines: [[nm, amp]]; flashes: [{nm, level}]; px: device pixels per CSS pixel.
 */
export function drawSpectrum(g, x0, y0, w, h, lines, { range = RANGE_VIS, flashes = [], px = 1, dim = 1, fade = true } = {}) {
  const [lo, hi] = range;
  const X = nm => x0 + xOf(nm, lo, hi) * w;
  g.save();
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  g.globalCompositeOperation = 'lighter';

  const glow = (x, c, a, half) => {
    const gr = g.createLinearGradient(x - half, 0, x + half, 0);
    gr.addColorStop(0, `rgba(${c},0)`);
    gr.addColorStop(0.5, `rgba(${c},${a})`);
    gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr;
    g.fillRect(x - half, y0, half * 2, h);
  };

  for (const [nm, amp] of lines) {
    if (nm < lo || nm > hi) continue;
    const x = X(nm);
    const c = rgb(nm);
    const a = dim * (0.2 + 0.8 * Math.pow(amp, 0.6));
    if (c) {
      const cs = c.join(',');
      glow(x, cs, a * 0.38, (3 + 7 * amp) * px);
      const core = (amp > 0.45 ? 2 : 1.25) * px;
      g.fillStyle = `rgba(${cs},${a})`;
      g.fillRect(x - core / 2, y0, core, h);
    } else {
      g.fillStyle = `rgba(${GREY},${0.4 * a})`;
      g.fillRect(x - 0.5 * px, y0, px, h);
    }
  }

  for (const f of flashes) {
    const L = f.level;
    if (L <= 0.004 || f.nm < lo || f.nm > hi) continue;
    const x = X(f.nm);
    const c = rgb(f.nm);
    if (c) {
      const cs = c.join(',');
      glow(x, cs, 0.55 * L, (8 + 16 * L) * px);
      const white = c.map(v => Math.round(v + (255 - v) * 0.55 * L)).join(',');
      const core = (2 + 1.5 * L) * px;
      g.fillStyle = `rgba(${white},${Math.min(1, 0.35 + L)})`;
      g.fillRect(x - core / 2, y0, core, h);
    } else {
      glow(x, GREY, 0.22 * L, (6 + 10 * L) * px);
      g.fillStyle = `rgba(${GREY},${0.4 + 0.5 * L})`;
      g.fillRect(x - 0.75 * px, y0, 1.5 * px, h);
    }
  }

  if (fade) {
    // soften the top and bottom ends of every line
    g.globalCompositeOperation = 'destination-in';
    const gr = g.createLinearGradient(0, y0, 0, y0 + h);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.16, 'rgba(0,0,0,1)');
    gr.addColorStop(0.84, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x0, y0, w, h);
  }
  g.restore();
}

// ——— live strips on the page ———

let clock = () => performance.now() / 1000;
/** The app sets this to the audio clock so flashes line up with what you hear. */
export function setClock(fn) { clock = fn; }

const live = new Set();
let raf = 0;
function frame() {
  raf = 0;
  const now = clock();
  let busy = false;
  for (const s of live) if (s.draw(now)) busy = true;
  if (busy) raf = requestAnimationFrame(frame);
}
function wake() { if (!raf) raf = requestAnimationFrame(frame); }

export class Strip {
  /** canvas: the element to draw in; opts.caption(range) → [leftText, rightText] shown in the full range */
  constructor(canvas, { captions = null } = {}) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.lines = [];
    this.range = RANGE_VIS;
    this.voices = [];
    this.captions = captions;
    this.w = 0; this.h = 0; this.px = 1;
    live.add(this);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
  }

  dispose() {
    live.delete(this);
    this.ro.disconnect();
  }

  resize() {
    const px = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.round(this.c.clientWidth * px), h = Math.round(this.c.clientHeight * px);
    if (!w || !h) return;
    if (w !== this.w || h !== this.h || px !== this.px) {
      this.w = this.c.width = w;
      this.h = this.c.height = h;
      this.px = px;
      this.draw(clock(), true);
    }
  }

  set(lines, range = RANGE_VIS) {
    this.lines = lines || [];
    this.range = range;
    this.voices = [];
    this.draw(clock(), true);
  }

  /** Light the lines of a scheduled sound: voices [{start, nms}] in clock time. */
  flash(voices) {
    this.voices = voices || [];
    wake();
  }

  draw(now, force = false) {
    const { g, w, h } = this;
    if (!w || !h) return false;
    let busy = false;
    const flashes = [];
    for (const v of this.voices) {
      const L = flashLevel(now - v.start);
      if (now < v.start || L > 0.004) busy = true;
      if (L > 0.004) for (const nm of v.nms) flashes.push({ nm, level: L });
    }
    if (!busy && !force && !this.wasBusy) return false;
    this.wasBusy = busy;
    g.clearRect(0, 0, w, h);
    drawSpectrum(g, 0, 0, w, h, this.lines, { range: this.range, flashes, px: this.px });
    if (this.captions && this.range !== RANGE_VIS) {
      const [l, r] = this.captions();
      g.save();
      g.fillStyle = '#48484a';
      g.font = `${10 * this.px}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
      g.textBaseline = 'bottom';
      g.fillText(l, 3 * this.px, h - 2 * this.px);
      g.textAlign = 'right';
      g.fillText(r, w - 3 * this.px, h - 2 * this.px);
      g.restore();
    }
    return busy;
  }
}
