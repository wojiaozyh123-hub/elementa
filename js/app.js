// Elementa web — boot, settings, language, audio, router, keyboard, sharing.

import { Engine } from './audio.js';
import { STR, systemLang } from './i18n.js';
import { setClock } from './spectrum.js';
import { ICON, MARK } from './icons.js';
import { APP_STORE_URL, SITE_URL } from './config.js';
import { createPlay } from './table.js';
import { createDetail } from './detail.js';
import { createTest } from './eartest.js';
import { createSpell } from './spellview.js';
import { createAbout } from './about.js';

const $ = (s, r = document) => r.querySelector(s);
const KEY = 'elementa.settings.v1';

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v && typeof v === 'object' ? { ...fallback, ...v } : fallback; }
  catch { return fallback; }
}
function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } }

export const app = {
  els: [],
  bySym: new Map(),
  settings: load(KEY, { tuned: false, chord: false, full: false, lang: 'auto' }),
  lang: 'en',
  t: STR.en,
  sel: 'H',
  view: null,
  views: {},
  ios: /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  coarse: matchMedia('(pointer: coarse)').matches,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  listeners: { play: [], settings: [], lang: [] },
  on(ev, fn) { this.listeners[ev].push(fn); },
  emit(ev, x) { for (const fn of this.listeners[ev]) fn(x); },
  save() { store(KEY, this.settings); this.emit('settings', this.settings); },
  set(k, v) { if (this.settings[k] === v) return; this.settings[k] = v; this.save(); if (k === 'lang') applyLang(); },
  get el() { return this.bySym.get(this.sel); },
  load, store, $,
  lines(el) { return this.settings.full ? el.full : el.vis; },
};

// ——— audio ———

let actx = null, engine = null, pending = [];

function makeAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
  try {
    actx = new AC({ latencyHint: 'interactive' });
  } catch { return false; }
  engine = new Engine(actx);
  // iOS: a one-sample silent buffer inside the gesture unlocks output
  const src = actx.createBufferSource();
  src.buffer = actx.createBuffer(1, 1, actx.sampleRate);
  src.connect(actx.destination);
  src.start(0);
  return true;
}

function activated() {
  const ua = navigator.userActivation;
  return !ua || ua.isActive;
}

/** Returns the engine when sound can start now; otherwise queues `retry` for the next activating gesture
 *  (a touch only counts on touchend / pointerup, so the first tap plays a moment later). */
function ensureAudio(retry) {
  if (!actx) {
    if (!activated()) {
      if (retry) {
        // one waiting sound per key: a first-touch strum plays its last note, not every note at once
        pending = pending.filter(p => p.key !== retry.key);
        pending.push({ ...retry, t: performance.now() });
        if (pending.length > 16) pending.shift();
      }
      return null;
    }
    if (!makeAudio()) { toast(app.t.noAudio); return null; }
  }
  if (actx.state !== 'running' && actx.state !== 'closed') actx.resume().catch(() => {});
  return engine;
}

function onGesture() {
  if (!actx) { if (!activated()) return; if (!makeAudio()) return; }
  else if (actx.state !== 'running' && actx.state !== 'closed') actx.resume().catch(() => {});
  if (pending.length) {
    const now = performance.now(), p = pending;
    pending = [];
    for (const r of p) if (now - r.t < 2000) r.fn(); // a stale request (e.g. a touch that became a scroll) is dropped
  }
}
for (const ev of ['pointerup', 'touchend', 'keydown', 'click', 'pointerdown']) {
  addEventListener(ev, onGesture, { capture: true, passive: true });
}
// last input: keyboard users get focus put back where they were when they return to the table
addEventListener('keydown', () => { app.kbd = true; }, { capture: true, passive: true });
addEventListener('pointerdown', () => { app.kbd = false; }, { capture: true, passive: true });

/** The audio-clock time that is reaching the speakers now. */
export function audioNow() {
  if (!actx) return performance.now() / 1000;
  const ts = actx.getOutputTimestamp && actx.getOutputTimestamp();
  if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
    return ts.contextTime + Math.max(0, performance.now() - ts.performanceTime) / 1000;
  }
  return actx.currentTime - (actx.outputLatency || actx.baseLatency || 0);
}
setClock(audioNow);
app.now = audioNow;
app.unlocked = () => !!actx;

/**
 * Play an element (or explicit lines). Returns the schedule, or null (silent / audio not yet allowed).
 * opts: when (seconds from now), group, lines, chord, source (who asked — views use it to decide what to light)
 */
app.play = function play(el, opts = {}) {
  const lines = opts.lines || app.lines(el);
  if (!lines.length) return null;
  const group = String(opts.group ?? '');
  const key = group.startsWith('spell:') ? group : opts.source || 'app';
  const eng = ensureAudio(opts.retry === false ? null : { key, fn: () => app.play(el, { ...opts, retry: false }) });
  if (!eng) return null;
  const sch = eng.play(lines, {
    chord: opts.chord ?? app.settings.chord,
    tuned: opts.tuned ?? app.settings.tuned,
    when: actx.currentTime + (opts.when || 0) + 0.02,
    group: opts.group ?? el.s,
  });
  if (!sch) return null;
  // shift schedule times into the listening clock (audioNow) so visuals match the ears
  const lag = actx.currentTime - audioNow();
  const vis = { t0: sch.t0 - lag, end: sch.end - lag, voices: sch.voices.map(v => ({ ...v, start: v.start - lag })) };
  app.emit('play', { el, sch: vis, lines, source: opts.source || 'app', group: opts.group ?? el.s });
  return vis;
};
app.stop = group => { if (engine) engine.stop(group); };

// ——— toast, share, clipboard ———

let toastTimer = 0;
export function toast(msg, ms = 1900) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
app.toast = toast;

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

/** Native share sheet when there is one; otherwise copy. `copyText` decides what lands on the clipboard. */
app.share = async function share({ title, text, url, copyText }) {
  if (navigator.share && app.coarse) {
    try { await navigator.share({ title, text, url }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const s = copyText ?? url;
  if (await copy(s)) toast(s === url ? app.t.copied : app.t.copiedText);
  else toast(s, 5000); // clipboard blocked: at least show what to copy
};
app.url = hash => SITE_URL + hash;

// ——— language ———

function resolveLang() {
  const l = app.settings.lang;
  return l === 'en' || l === 'zh' ? l : systemLang();
}

function applyLang() {
  app.lang = resolveLang();
  app.t = STR[app.lang];
  document.documentElement.lang = app.lang === 'zh' ? 'zh-Hans' : 'en';
  relabel();
  app.emit('lang', app.lang);
  if (app.view) app.views[app.view].title?.();
}

function relabel() {
  const t = app.t;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t[el.dataset.t];
  for (const el of document.querySelectorAll('[data-a]')) {
    el.setAttribute('aria-label', t[el.dataset.a]);
    if (el.hasAttribute('data-tip')) el.dataset.tip = t[el.dataset.a];
  }
  const lb = $('#langBtn');
  lb.textContent = t.lang;
  lb.setAttribute('aria-label', t.langLabel);
  lb.dataset.tip = t.langLabel;
  lb.lang = app.lang === 'zh' ? 'en' : 'zh-Hans';
}

// ——— chrome: header + footer ———

function chrome() {
  $('#brandMark').innerHTML = MARK;
  $('#navTable').innerHTML = ICON.table;
  $('#navTest').innerHTML = ICON.ear;
  $('#navSpell').innerHTML = ICON.spell;
  $('#navAbout').innerHTML = ICON.about;
  $('#langBtn').addEventListener('click', () => app.set('lang', app.lang === 'zh' ? 'en' : 'zh'));
  for (const a of document.querySelectorAll('.app-link')) {
    if (APP_STORE_URL) { a.href = APP_STORE_URL; a.hidden = false; } else a.hidden = true;
  }
}

function markNav(view) {
  const map = { play: 'navTable', el: 'navTable', test: 'navTest', spell: 'navSpell', about: 'navAbout' };
  for (const id of ['navTable', 'navTest', 'navSpell', 'navAbout']) {
    const a = document.getElementById(id);
    if (map[view] === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

// ——— router ———

function parse(hash) {
  const raw = hash.replace(/^#\/?/, '');
  const i = raw.indexOf('/');
  const head = (i < 0 ? raw : raw.slice(0, i)).toLowerCase();
  const rest = i < 0 ? '' : raw.slice(i + 1);
  const dec = s => { try { return decodeURIComponent(s); } catch { return s; } };
  if (head === '' ) return { v: 'play' };
  if (head === 'e') return { v: 'el', s: dec(rest) };
  if (head === 'test') return { v: 'test' };
  if (head === 'spell') return { v: 'spell', w: dec(rest) };
  if (head === 'about') return { v: 'about' };
  return null;
}

let firstRoute = true;
function route() {
  let r = parse(location.hash);
  if (r && r.v === 'el') {
    let want = String(r.s || '').trim().toLowerCase();
    want = { aluminum: 'al', cesium: 'cs', sulphur: 's' }[want] || want; // US / UK spellings
    const el = app.els.find(e => e.s.toLowerCase() === want || e.en.toLowerCase() === want || e.zh === want || String(e.z) === want);
    if (!el) r = null;
    else {
      r.el = el;
      if (location.hash !== '#/e/' + el.s) history.replaceState(null, '', '#/e/' + el.s); // canonical: #/e/Fe
    }
  }
  if (!r) { history.replaceState(null, '', location.pathname + location.search + '#/'); r = { v: 'play' }; }
  const prev = app.view;
  if (prev && prev !== r.v) app.views[prev].leave?.();
  for (const [k, view] of Object.entries(app.views)) if (k !== r.v) view.root.hidden = true;
  const v = app.views[r.v];
  const entering = prev !== r.v;
  app.view = r.v;
  v.root.hidden = false;
  if (entering && !firstRoute && !app.reduced) {
    v.root.classList.remove('enter');
    void v.root.offsetWidth;
    v.root.classList.add('enter');
  }
  markNav(r.v);
  v.enter(r, { entering, first: firstRoute });
  v.title?.();
  if (entering && !firstRoute) window.scrollTo(0, 0);
  firstRoute = false;
}
app.go = hash => { if (location.hash !== hash) location.hash = hash; else route(); };
app.setTitle = s => { document.title = s; };

// ——— keyboard ———

function onKey(e) {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  const tgt = e.target;
  const typing = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable);
  const v = app.views[app.view];
  if (v && v.key) v.key(e, { typing, onButton: !!(tgt && tgt.closest && tgt.closest('button, a, [role="radio"]')) });
}

// ——— boot ———

async function boot() {
  applyLang();
  chrome();
  const main = $('#main');
  let data;
  try {
    const res = await fetch('elements.json');
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch {
    main.innerHTML = `<div class="fail"><p>${app.t.loadFail}</p><button class="textbtn" type="button">${app.t.retry}</button></div>`;
    main.querySelector('button').addEventListener('click', () => location.reload());
    document.body.classList.add('ready');
    return;
  }
  app.els = data;
  for (const e of data) app.bySym.set(e.s, e);
  app.views = {
    play: createPlay(app),
    el: createDetail(app),
    test: createTest(app),
    spell: createSpell(app),
    about: createAbout(app),
  };
  relabel();
  addEventListener('hashchange', route);
  addEventListener('keydown', onKey);
  route();
  requestAnimationFrame(() => document.body.classList.add('ready'));
}

boot();
