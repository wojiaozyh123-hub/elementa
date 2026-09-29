// Physics shared by every part of Elementa (SPEC §1, §3, §5). Pure functions, no DOM.

export const C = 299792458;               // m/s
export const OCTAVES = 40;
export const K = C * 1e9 / 2 ** OCTAVES;  // 272659.3 Hz·nm

/** Audio frequency (Hz) of a vacuum wavelength (nm), shifted down 40 octaves. */
export const freq = nm => K / nm;
export const midiFreq = m => 440 * 2 ** ((m - 69) / 12);
export const midiOf = f => 69 + 12 * Math.log2(f / 440);

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** Nearest 12-TET note (A4 = 440 Hz) and the offset in cents. */
export function note(f) {
  const m = midiOf(f);
  const n = Math.round(m);
  let cents = Math.round((m - n) * 100);
  if (cents === 0) cents = 0; // no −0
  return { midi: n, name: NAMES[((n % 12) + 12) % 12], octave: Math.floor(n / 12) - 1, cents };
}

/** "G♯4 −9¢" (true minus sign), "A4 ±0¢". */
export function noteLabel(f) {
  const { name, octave, cents } = note(f);
  const c = cents === 0 ? '±0' : (cents > 0 ? '+' : '−') + Math.abs(cents);
  return `${name}${octave} ${c}¢`;
}

export const fmtNm = nm => nm.toFixed(1);
export const fmtHz = f => f.toFixed(1);
/** "656.5 nm · 415.3 Hz · G♯4 ±0¢" */
export const chipLabel = nm => `${fmtNm(nm)} nm · ${fmtHz(freq(nm))} Hz · ${noteLabel(freq(nm))}`;

const L350 = Math.log2(350), L718 = Math.log2(718);
/** Stereo pan, linear in log2(f): 350 Hz → −0.55 (red, left), 718 Hz → +0.55 (violet, right); clamp ±0.8. */
export function pan(f) {
  const p = -0.55 + 1.1 * (Math.log2(f) - L350) / (L718 - L350);
  return Math.max(-0.8, Math.min(0.8, p));
}

/**
 * Sound lines → voices sorted low → high (red → violet).
 * Tuned: snap to the nearest 12-TET note and merge duplicates (amps summed, capped at 1).
 * Each voice keeps the wavelengths it came from so the UI can light them.
 */
export function voices(lines, tuned = false) {
  const v = lines.map(([nm, amp]) => ({ f: freq(nm), amp, nms: [nm] }));
  if (!tuned) return v.sort((a, b) => a.f - b.f);
  const map = new Map();
  for (const x of v) {
    const m = Math.round(midiOf(x.f));
    const e = map.get(m);
    if (e) { e.amp = Math.min(1, e.amp + x.amp); e.nms.push(...x.nms); }
    else map.set(m, { f: midiFreq(m), amp: x.amp, nms: [...x.nms] });
  }
  return [...map.values()].sort((a, b) => a.f - b.f);
}

/** Pairs of lines closer than 0.06 semitones: they beat at |f1 − f2|. */
export function doublets(lines) {
  const out = [];
  const s = [...lines].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < s.length; i++) {
    const f1 = freq(s[i - 1][0]), f2 = freq(s[i][0]);
    if (Math.abs(12 * Math.log2(f1 / f2)) < 0.06) out.push({ a: s[i - 1][0], b: s[i][0], beat: Math.abs(f1 - f2) });
  }
  return out;
}

export const VIS_LO = 380, VIS_HI = 780;
export const isVisible = nm => nm >= VIS_LO && nm <= VIS_HI;

/** Dan Bruton's wavelength → RGB (0–255) with intensity fall-off at the ends of the visible range; null outside. */
export function rgb(nm) {
  if (!isVisible(nm)) return null;
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else r = 1;
  let k = 1;
  if (nm < 420) k = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700) k = 0.3 + 0.7 * (780 - nm) / 80;
  const t = c => (c <= 0 ? 0 : Math.round(255 * (c * k) ** 0.8));
  return [t(r), t(g), t(b)];
}

/** Horizontal position 0…1 of a wavelength on a strip: frequency axis, red on the left, violet on the right,
 *  linear in log2(f) — the same axis as the stereo pan and a piano keyboard. */
export function xOf(nm, lo = VIS_LO, hi = VIS_HI) {
  return Math.log2(hi / nm) / Math.log2(hi / lo);
}

/** Everyday colour word for a wavelength: 'violet' … 'red', or 'uv' / 'ir' outside the visible range. */
export function colourName(nm) {
  if (nm < VIS_LO) return 'uv';
  if (nm > VIS_HI) return 'ir';
  if (nm < 450) return 'violet';
  if (nm < 495) return 'blue';
  if (nm < 520) return 'cyan';
  if (nm < 565) return 'green';
  if (nm < 590) return 'yellow';
  if (nm < 625) return 'orange';
  return 'red';
}

export const RANGE_VIS = [VIS_LO, VIS_HI];
export const RANGE_FULL = [200, 1000];

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
