// Numerical check of the sound engine (you cannot test sound by ear in CI).
// Renders through an OfflineAudioContext with the very same Engine the app uses, then measures:
//  - hydrogen strum: FFT peaks ≈ 415.3 / 560.7 / 628.0 / 664.6 (/ 700.9) Hz
//  - sodium chord: peak ≈ 462.5 Hz and a ≈ 0.47 Hz beat envelope
//  - peak sample level (no clipping) for H, Na and a fast 30-element drag across the table
// Open tools/audio-check.html, or: (await import('./tools/audio-check.js')).run()

import { Engine } from '../js/audio.js';
import { freq } from '../js/physics.js';

const SR = 48000;

async function render(seconds, schedule) {
  const ctx = new OfflineAudioContext(2, Math.round(seconds * SR), SR);
  const eng = new Engine(ctx);
  const info = schedule(eng, ctx);
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const mono = new Float64Array(L.length);
  for (let i = 0; i < L.length; i++) mono[i] = (L[i] + R[i]) / 2;
  return { mono, L, R, peak, info, voices: eng.activeVoices };
}

/** In-place radix-2 FFT. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/** Magnitude spectrum (Hann window, zero-padded to 2^20 for fine bin spacing). */
function spectrum(x, n = 1 << 20) {
  const re = new Float64Array(n), im = new Float64Array(n);
  const m = Math.min(x.length, n);
  for (let i = 0; i < m; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (m - 1)));
  fft(re, im);
  const mag = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
  return { mag, df: SR / n };
}

/** Local maxima in [lo, hi] Hz above `rel` × the band maximum, refined by parabolic interpolation. */
function peaks(mag, df, lo, hi, rel = 0.05, minSep = 3) {
  const a = Math.floor(lo / df), b = Math.ceil(hi / df);
  let top = 0;
  for (let i = a; i <= b; i++) top = Math.max(top, mag[i]);
  const out = [];
  for (let i = a + 1; i < b; i++) {
    if (mag[i] > mag[i - 1] && mag[i] >= mag[i + 1] && mag[i] > rel * top) {
      const y0 = Math.log(mag[i - 1]), y1 = Math.log(mag[i]), y2 = Math.log(mag[i + 1]);
      const d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2);
      out.push({ hz: (i + d) * df, level: mag[i] / top });
    }
  }
  // merge maxima closer than minSep Hz (keep the stronger)
  const merged = [];
  for (const p of out) {
    const q = merged[merged.length - 1];
    if (q && p.hz - q.hz < minSep) { if (p.level > q.level) merged[merged.length - 1] = p; }
    else merged.push(p);
  }
  return merged;
}

/** Amplitude envelope of the band around f0: complex demodulation + 100 ms moving average. */
function envelope(x, f0, hop = 480) {
  const n = x.length, w = Math.round(0.1 * SR);
  const I = new Float64Array(n), Q = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const ph = 2 * Math.PI * f0 * i / SR;
    I[i] = x[i] * Math.cos(ph); Q[i] = -x[i] * Math.sin(ph);
  }
  const out = [];
  let si = 0, sq = 0;
  for (let i = 0; i < n; i++) {
    si += I[i]; sq += Q[i];
    if (i >= w) { si -= I[i - w]; sq -= Q[i - w]; }
    if (i >= w && i % hop === 0) out.push({ t: (i - w / 2) / SR, a: 2 * Math.hypot(si, sq) / w });
  }
  return out;
}

export async function run() {
  const els = await (await fetch(new URL('../elements.json', import.meta.url))).json();
  const by = Object.fromEntries(els.map(e => [e.s, e]));
  const report = {};

  // 1 · hydrogen strum
  const h = await render(6, eng => eng.play(by.H.vis, { chord: false, when: 0.05 }));
  const hs = spectrum(h.mono);
  const hp = peaks(hs.mag, hs.df, 300, 800, 0.02);
  report.H = {
    expected: by.H.vis.map(([nm]) => +freq(nm).toFixed(2)).sort((a, b) => a - b),
    peaksHz: hp.map(p => +p.hz.toFixed(2)),
    peakLevels: hp.map(p => +p.level.toFixed(3)),
    strumStartsMs: h.info.voices.map(v => Math.round((v.start - h.info.t0) * 1000)),
    peakSample: +h.peak.toFixed(4),
  };

  // 2 · sodium chord (the D doublet beat)
  const na = await render(6, eng => eng.play(by.Na.vis, { chord: true, when: 0.05 }));
  const ns = spectrum(na.mono);
  const np = peaks(ns.mag, ns.df, 455, 470, 0.05, 0.05);
  const env = envelope(na.mono, 462.56).filter(e => e.t > 0.15 && e.t < 5.0);
  // remove the 1.2 s exponential decay, then find the beat minima
  const flat = env.map(e => ({ t: e.t, a: e.a / Math.exp(-(e.t - 0.05) / 1.2) }));
  const minima = [];
  for (let i = 3; i < flat.length - 3; i++) {
    const a = flat[i].a;
    if (a < flat[i - 1].a && a <= flat[i + 1].a && a < flat[i - 3].a && a <= flat[i + 3].a) minima.push(flat[i]);
  }
  const deep = minima.filter(m => m.a < 0.6 * Math.max(...flat.map(f => f.a)));
  const periods = deep.slice(1).map((m, i) => m.t - deep[i].t);
  const beatHz = periods.length ? 1 / (periods.reduce((s, p) => s + p, 0) / periods.length) : null;
  const max = Math.max(...flat.map(f => f.a)), min = Math.min(...flat.map(f => f.a));
  report.Na = {
    expectedHz: [+freq(589.756).toFixed(3), +freq(589.158).toFixed(3)],
    expectedBeatHz: +(freq(589.158) - freq(589.756)).toFixed(3),
    peaksHz: np.map(p => +p.hz.toFixed(3)),
    envelopeMinimaS: deep.map(m => +m.t.toFixed(2)),
    measuredBeatHz: beatHz && +beatHz.toFixed(3),
    modulationDepth: +((max - min) / (max + min)).toFixed(2),
    peakSample: +na.peak.toFixed(4),
  };

  // 3 · worst case: a fast drag across 30 elements (45 ms apart), strummed, plus the same as chords
  const drag = els.filter(e => e.vis.length).slice(0, 30);
  const d1 = await render(4, eng => drag.forEach((e, i) => eng.play(e.vis, { when: 0.05 + i * 0.045, group: e.s })));
  const d2 = await render(4, eng => drag.forEach((e, i) => eng.play(e.vis, { chord: true, when: 0.05 + i * 0.045, group: e.s })));
  const all = els.filter(e => e.vis.length);
  const d3 = await render(3, eng => all.forEach(e => eng.play(e.vis, { chord: true, when: 0.05, group: e.s })));
  report.stress = {
    drag30StrumPeak: +d1.peak.toFixed(4),
    drag30ChordPeak: +d2.peak.toFixed(4),
    all97ChordsAtOncePeak: +d3.peak.toFixed(4),
  };

  // 4 · restart: re-tapping H mid-note must not click (largest sample-to-sample jump stays small)
  const re = await render(2, eng => { eng.play(by.H.vis, { chord: true, when: 0.05, group: 'H' }); eng.play(by.H.vis, { chord: true, when: 0.6, group: 'H' }); });
  let jump = 0;
  for (let i = 1; i < re.L.length; i++) jump = Math.max(jump, Math.abs(re.L[i] - re.L[i - 1]));
  report.restart = { maxStep: +jump.toFixed(4), peakSample: +re.peak.toFixed(4) };

  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  report.pass = {
    H: [415.35, 560.71, 628.0, 664.55].every(f => report.H.peaksHz.some(p => near(p, f, 0.5))),
    NaPeak: report.Na.peaksHz.some(p => near(p, 462.56, 0.5)),
    NaBeat: report.Na.measuredBeatHz != null && near(report.Na.measuredBeatHz, 0.47, 0.06),
    noClip: [report.H.peakSample, report.Na.peakSample, ...Object.values(report.stress), report.restart.peakSample].every(p => p < 1),
  };
  return report;
}
