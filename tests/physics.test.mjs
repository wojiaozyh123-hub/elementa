// node --test web/tests/   — physics: frequency mapping, note naming, pan, tuning, doublets, colour axis.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { K, freq, note, noteLabel, pan, voices, doublets, rgb, xOf, chipLabel, colourName } from '../js/physics.js';

const els = JSON.parse(readFileSync(new URL('../elements.json', import.meta.url)));
const by = Object.fromEntries(els.map(e => [e.s, e]));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} ± ${tol}, got ${a}`);

test('constant: c / 2^40 in Hz·nm', () => {
  assert.equal(K, 299792458 * 1e9 / 1099511627776);
  near(K, 272659.65, 0.01); // SPEC rounds this to 272659.3; the exact c / 2^40 is used
});

test('hydrogen Balmer lines → SPEC §1 frequencies', () => {
  near(freq(656.461), 415.3, 0.05, 'Hα');
  near(freq(486.269), 560.7, 0.05, 'Hβ');
  near(freq(434.168), 628.0, 0.05, 'Hγ');
  near(freq(410.290), 664.6, 0.05, 'Hδ');
});

test('sodium D doublet → 462.8 / 462.3 Hz, ~0.5 Hz beat', () => {
  near(freq(589.158), 462.8, 0.05);
  near(freq(589.756), 462.3, 0.05);
  const d = doublets(by.Na.vis).find(x => x.a === 589.158);
  assert.equal(d.b, 589.756);
  near(d.beat, 0.47, 0.01, 'beat');
  assert.ok(doublets(by.H.vis).length === 0);
});

test('visible light spans about one octave (380–780 nm → 718–350 Hz)', () => {
  near(freq(380), 717.5, 0.1);
  near(freq(780), 349.6, 0.1);
  near(Math.log2(freq(380) / freq(780)), 1.04, 0.01);
});

test('note names: nearest 12-TET, A4 = 440, cents with a true minus sign', () => {
  assert.equal(noteLabel(440), 'A4 ±0¢');
  assert.equal(noteLabel(261.6256), 'C4 ±0¢');
  assert.equal(noteLabel(freq(656.461)), 'G♯4 ±0¢');
  assert.equal(noteLabel(440 * 2 ** (-9 / 1200)), 'A4 −9¢');
  assert.equal(noteLabel(440 * 2 ** (12 / 1200)), 'A4 +12¢');
  assert.equal(noteLabel(freq(589.158)), 'A♯4 −13¢');
  assert.equal(note(27.5).name + note(27.5).octave, 'A0');
  assert.equal(note(4186.01).name + note(4186.01).octave, 'C8');
  // never "−0"
  assert.equal(note(440 * 2 ** (-0.3 / 1200)).cents, 0);
  assert.ok(!Object.is(note(440 * 2 ** (-0.3 / 1200)).cents, -0));
  // 49 ¢ sharp of B3 stays B3, 51 ¢ becomes C4
  assert.equal(noteLabel(246.9417 * 2 ** (49 / 1200)), 'B3 +49¢');
  assert.equal(noteLabel(246.9417 * 2 ** (51 / 1200)), 'C4 −49¢');
});

test('chip label format', () => {
  assert.equal(chipLabel(656.461), '656.5 nm · 415.3 Hz · G♯4 ±0¢');
});

test('stereo pan: linear in log2(f), 350 → −0.55, 718 → +0.55, clamped ±0.8', () => {
  near(pan(350), -0.55, 1e-9);
  near(pan(718), 0.55, 1e-9);
  near(pan(Math.sqrt(350 * 718)), 0, 1e-9);
  assert.equal(pan(100), -0.8);
  assert.equal(pan(5000), 0.8);
});

test('voices: pure keeps exact frequencies, sorted low → high (red → violet)', () => {
  const v = voices(by.H.vis);
  assert.deepEqual(v.map(x => x.nms[0]), [656.461, 486.269, 434.168, 410.29, 389.015]);
  for (let i = 1; i < v.length; i++) assert.ok(v[i].f > v[i - 1].f);
});

test('voices: tuned snaps to piano keys and merges duplicates (amps summed, capped at 1)', () => {
  const v = voices([[589.158, 1.0], [589.756, 0.707], [656.461, 0.4]], true);
  assert.equal(v.length, 2);
  near(v[0].f, 415.3047, 1e-3);
  near(v[1].f, 466.1638, 1e-3); // A♯4
  assert.equal(v[1].amp, 1);
  assert.deepEqual(v[1].nms.sort(), [589.158, 589.756]);
  const w = voices([[589.158, 0.3], [589.756, 0.2]], true);
  near(w[0].amp, 0.5, 1e-12);
});

test('spectrum axis and colours: red on the left, violet on the right; Bruton RGB', () => {
  assert.ok(xOf(656) < xOf(486) && xOf(486) < xOf(410));
  near(xOf(780), 0, 1e-12);
  near(xOf(380), 1, 1e-12);
  assert.deepEqual(rgb(650), [255, 0, 0]);
  assert.equal(rgb(379), null);
  assert.equal(rgb(781), null);
  const g = rgb(530); assert.ok(g[1] === 255 && g[2] === 0);
  assert.equal(colourName(589), 'yellow');
  assert.equal(colourName(300), 'uv');
});

test('data: 118 elements, unique positions, sound sets within spec', () => {
  assert.equal(els.length, 118);
  const pos = new Set(els.map(e => `${e.x},${e.y}`));
  assert.equal(pos.size, 118);
  for (const e of els) {
    assert.ok(e.vis.length <= 8 && e.full.length <= 12 && e.spec.length <= 60, e.s);
    for (const [nm, a] of e.vis) assert.ok(nm >= 380 && nm <= 780 && a >= 0.12 && a <= 1, e.s);
    for (const [nm] of e.full) assert.ok(nm >= 200 && nm <= 1000, e.s);
  }
  const silent = els.filter(e => !e.vis.length).map(e => e.s);
  assert.deepEqual(silent.slice(0, 2), ['At', 'Fr']);
  assert.equal(silent.length, 21);
});
