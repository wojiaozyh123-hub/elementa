// Sound engine (SPEC §3). Works on an AudioContext or an OfflineAudioContext — the same code path renders
// what you hear and what the numeric tests measure. No DOM.

import { voices, pan } from './physics.js';
import { mulberry32 } from './ear.js';

export const ATTACK_STRUM = 0.006;
export const ATTACK_CHORD = 0.012;
export const TAU = 1.2;          // exponential decay time constant (s)
export const DUR = 5;            // hard stop (s)
export const FADE = 0.05;        // final fade before the hard stop (s)
export const STRUM_GAP = 0.065;  // strum spacing (s)
export const HARMONIC = 0.05;    // 2nd harmonic level relative to the fundamental
export const MAX_VOICES = 96;    // polyphony (spectral lines sounding at once)
export const REVERB_S = 2.2;
export const WET = 0.22;
const KILL = 0.015;              // declick fade when a voice is stolen or restarted (s)

/** Large-hall impulse response: decorrelated stereo noise, −60 dB at `seconds`, darkening as it decays. */
export function impulse(ctx, seconds = REVERB_S) {
  const sr = ctx.sampleRate;
  const pre = Math.round(0.02 * sr);
  const len = pre + Math.round((seconds + 0.3) * sr);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const rand = mulberry32(0x5EED + ch * 7919);
    const data = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      const k = 0.9 - 0.65 * Math.min(1, t / seconds);  // one-pole low-pass, closing over time
      lp += k * (rand() * 2 - 1 - lp);
      data[i] = lp * Math.exp(-6.9078 * t / seconds) * Math.min(1, t / 0.005);
    }
  }
  return buf;
}

export class Engine {
  constructor(ctx) {
    this.ctx = ctx;
    this.live = [];
    this.input = ctx.createGain();
    const dry = ctx.createGain(); dry.gain.value = 1 - WET;
    const wet = ctx.createGain(); wet.gain.value = WET;
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx);
    const comp = this.comp = ctx.createDynamicsCompressor();  // soft limiter
    comp.threshold.value = -10;
    comp.knee.value = 6;
    comp.ratio.value = 12;
    comp.attack.value = 0.002;
    comp.release.value = 0.2;
    this.out = ctx.createGain();
    this.input.connect(dry).connect(comp);
    this.input.connect(verb).connect(wet).connect(comp);
    comp.connect(this.out).connect(ctx.destination);
  }

  /**
   * Play spectral lines [[nm, amp]].
   * opts: chord (all at once) | strum (red → violet, 65 ms apart); tuned; when (ctx time); group (restart key).
   * Returns the schedule {t0, end, voices:[{f, amp, nms, start}]} or null when there is nothing to play.
   */
  play(lines, { chord = false, tuned = false, when = 0, group = null } = {}) {
    const vs = voices(lines, tuned);
    if (!vs.length) return null;
    const t0 = Math.max(when, this.ctx.currentTime + 0.01);
    if (group != null) this.stop(group, t0);
    const att = chord ? ATTACK_CHORD : ATTACK_STRUM;
    const gain = 0.2 / Math.sqrt(vs.length);
    const out = vs.map((v, i) => {
      const start = t0 + (chord ? 0 : i * STRUM_GAP);
      this.voice(v.f, v.amp * gain, pan(v.f), start, att, group);
      return { ...v, start };
    });
    return { t0, end: out[out.length - 1].start + DUR, voices: out };
  }

  voice(f, peak, p, start, att, group) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const active = this.live.filter(v => !v.killed && v.end > now);
    for (let i = 0; i <= active.length - MAX_VOICES; i++) this.kill(active[i], start); // steal the oldest

    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    const h = ctx.createGain(), env = ctx.createGain(), kg = ctx.createGain();
    o1.frequency.value = f;
    o2.frequency.value = 2 * f;
    h.gain.value = HARMONIC;
    const g = env.gain;
    g.setValueAtTime(0, start);
    g.linearRampToValueAtTime(peak, start + att);
    g.setTargetAtTime(0, start + att, TAU);
    g.setValueAtTime(peak * Math.exp(-(DUR - FADE - att) / TAU), start + DUR - FADE);
    g.linearRampToValueAtTime(0, start + DUR);
    o1.connect(env);
    o2.connect(h).connect(env);
    env.connect(kg);
    let pn = null;
    if (ctx.createStereoPanner) {
      pn = ctx.createStereoPanner();
      pn.pan.value = p;
      kg.connect(pn).connect(this.input);
    } else kg.connect(this.input);
    o1.start(start); o2.start(start);
    o1.stop(start + DUR); o2.stop(start + DUR);
    const v = { o1, o2, nodes: [o1, o2, h, env, kg, pn], start, end: start + DUR, group, killed: false };
    o1.onended = () => {
      for (const n of v.nodes) if (n) try { n.disconnect(); } catch { /* already gone */ }
      const i = this.live.indexOf(v);
      if (i >= 0) this.live.splice(i, 1);
    };
    this.live.push(v);
  }

  /** Fade a voice out in 15 ms (no click). Voices that have not started yet simply never start. */
  kill(v, t) {
    if (v.killed) return;
    v.killed = true;
    const at = Math.max(t, this.ctx.currentTime);
    // Already over by then: leave it alone (a later stop() would keep its oscillators running, silently).
    if (at >= v.end) return;
    if (at <= v.start) {
      try { v.o1.stop(v.start); v.o2.stop(v.start); } catch { /* already stopped */ }
      v.end = v.start;
      return;
    }
    const kg = v.nodes[4].gain;
    kg.setValueAtTime(1, at);
    kg.linearRampToValueAtTime(0, at + KILL);
    const off = Math.min(at + KILL + 0.005, v.end);
    try { v.o1.stop(off); v.o2.stop(off); } catch { /* already stopped */ }
    v.end = Math.min(v.end, at + KILL);
  }

  /** Stop every voice of a group (string), of groups matching a predicate, or all voices (no argument). */
  stop(group, t = this.ctx.currentTime) {
    const match = group == null ? () => true : typeof group === 'function' ? group : g => g === group;
    for (const v of this.live) if (match(v.group)) this.kill(v, t);
  }

  get activeVoices() {
    const now = this.ctx.currentTime;
    return this.live.filter(v => !v.killed && v.end > now).length;
  }
}
