// Play view: the playable periodic table and the "now playing" panel.

import { ICON } from './icons.js';
import { Strip, drawLines, RANGE_VIS, RANGE_FULL } from './spectrum.js';
import { chipLabel, rgb, hexToRgb } from './physics.js';
import { symbolTyper, isLetterKey } from './keys.js';

const ROWS = [1, 2, 3, 4, 5, 6, 7, 9, 10];
const MIN_GAP_MS = 45;
const MAX_BACKLOG = 4; // ≈ 180 ms: how far a strum may lag behind the finger

/** Soft glow on a tile (or anything with a .halo child) that follows a sound's schedule. */
export function glowHalo(app, halo, sch, fade = 1.2) {
  if (!halo || !halo.animate) return;
  const delay = Math.max(0, (sch.t0 - app.now()) * 1000);
  const span = Math.max(0, (sch.voices[sch.voices.length - 1].start - sch.t0) * 1000);
  const total = span + fade * 1000 + 30;
  const cur = parseFloat(getComputedStyle(halo).opacity) || 0;
  if (halo._anim) halo._anim.cancel();
  halo._anim = halo.animate([
    { opacity: cur },
    { opacity: 1, offset: 30 / total },
    { opacity: 0.85, offset: (span + 30) / total, easing: 'cubic-bezier(.25,.6,.35,1)' },
    { opacity: 0 },
  ], { duration: total, delay, fill: 'backwards' });
  const host = halo.parentElement;
  host.classList.add('lit');
  const a = halo._anim;
  a.onfinish = () => { if (halo._anim === a) host.classList.remove('lit'); };
}

/** Light each chip (li[data-nm]) as its line starts. */
export function flashChips(app, list, sch) {
  const now = app.now();
  for (const v of sch.voices) {
    for (const nm of v.nms) {
      const li = list.querySelector(`[data-nm="${nm}"]`);
      if (!li || !li.animate) continue;
      const delay = Math.max(0, (v.start - now) * 1000);
      li.animate([{ color: '#ffffff' }, { color: '#8e8e93' }], { duration: 1400, delay, easing: 'cubic-bezier(.3,.5,.4,1)' });
      const dot = li.querySelector('i');
      if (dot) dot.animate([{ transform: 'scale(1.9)', opacity: 1 }, { transform: 'scale(1)', opacity: 0.85 }], { duration: 1200, delay, easing: 'cubic-bezier(.3,.5,.4,1)' });
    }
  }
}

export function chipsHTML(app, el, cls = '') {
  const lines = [...app.lines(el)].sort((a, b) => b[0] - a[0]); // red → violet, the order they sound
  if (!lines.length) return `<li class="none">${app.t.silent}</li>`;
  return lines.map(([nm]) => {
    const c = rgb(nm);
    const col = c ? `rgb(${c})` : 'rgba(205,205,212,.45)';
    return `<li data-nm="${nm}" class="${cls}"><i style="--lc:${col}"></i><span>${chipLabel(nm)}</span></li>`;
  }).join('');
}

export function createPlay(app) {
  const root = document.getElementById('v-play');
  root.innerHTML = `
    <h1 class="vh" data-t="table"></h1>
    <div class="stage">
      <div class="board" role="group" data-a="table"></div>
      <div class="panel">
        <div class="p-head">
          <div class="p-symbox"><span class="p-z"></span><span class="p-sym"></span></div>
          <div class="p-names"><div class="p-n1"></div><div class="p-n2"></div><div class="p-cat"></div></div>
        </div>
        <div class="p-ctl">
          <button type="button" class="ib" id="pReplay" data-a="replay" data-tip="">${ICON.replay}</button>
          <button type="button" class="ib" id="pMode" data-tip=""></button>
          <a class="ib" id="pOpen" data-a="detail" data-tip="" href="#/e/H">${ICON.open}</a>
        </div>
        <canvas class="strip p-strip" aria-hidden="true"></canvas>
        <ul class="chips" aria-label=""></ul>
      </div>
    </div>
    <p class="hint"></p>`;

  const stage = root.querySelector('.stage');
  const board = root.querySelector('.board');
  const panel = root.querySelector('.panel');
  const chips = panel.querySelector('.chips');
  const strip = new Strip(panel.querySelector('.p-strip'), { captions: () => [app.t.ir, app.t.uv] });
  const tiles = new Map();

  for (const e of app.els) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile' + (e.vis.length ? '' : ' mute');
    b.dataset.s = e.s;
    b.tabIndex = -1;
    const row = e.y <= 7 ? e.y - 1 : e.y - 2;
    b.style.cssText = `--c:${e.x - 1};--r:${row};--f:${e.y > 7 ? 1 : 0}${e.glow ? `;--g:${hexToRgb(e.glow).join(',')}` : ''}`;
    b.innerHTML = `<span class="halo"></span><span class="z">${e.z}</span><span class="sym">${e.s}</span>${e.glow ? '<span class="dot"></span>' : ''}`;
    board.append(b);
    tiles.set(e.s, b);
  }
  board.insertAdjacentHTML('beforeend',
    '<span class="fmark" style="--c:2;--r:5;--f:0" aria-hidden="true">57–71</span>' +
    '<span class="fmark" style="--c:2;--r:6;--f:0" aria-hidden="true">89–103</span>');

  // ——— layout: one cell size drives everything ———
  let wide = false, cellPx = 20, stepPx = 21.5;
  function layout() {
    const W = root.clientWidth;
    if (!W) return;
    const gap = W >= 1000 ? 4 : W >= 600 ? 3 : 1.5;
    const cw = (W - 17 * gap) / 18;
    const top = stage.getBoundingClientRect().top + window.scrollY;
    const avail = window.innerHeight - Math.min(top, 80) - 64;
    const ch = (avail - 8 * gap) / 9.35;
    wide = W >= 820 && Math.min(cw, ch) >= 44;
    let c = wide ? Math.min(cw, ch, 78) : Math.min(cw, 56);
    // landscape phones: keep the whole table on screen so it can be strummed without scrolling
    // (never wider than the page, though: that would scroll sideways)
    const short = !wide && window.innerWidth > window.innerHeight && window.innerHeight < 560;
    if (short) c = Math.min(cw, Math.max(20, Math.min(c, (window.innerHeight - Math.min(top, 80) - 12 - 8 * gap) / 9.35)));
    const cell = Math.floor(c * 10) / 10;
    // …and show what is playing inside the table's own gap, where it can be seen while strumming
    const compact = short && cell >= 26;
    cellPx = cell; stepPx = cell + gap;
    const s = stage.style;
    s.setProperty('--cell', cell + 'px');
    s.setProperty('--gap', gap + 'px');
    s.setProperty('--step', cell + gap + 'px');
    s.setProperty('--fgap', Math.round(cell * 0.35) + 'px');
    stage.classList.toggle('wide', wide || compact);
    stage.classList.toggle('compact', compact);
    stage.classList.toggle('roomy', cell >= 58);
    board.classList.toggle('big', cell >= 34);
  }
  new ResizeObserver(layout).observe(root);
  addEventListener('resize', layout);

  // ——— selection + panel ———
  function show(el) {
    const t = app.t;
    const prev = board.querySelector('.tile.sel');
    if (prev) { prev.classList.remove('sel'); prev.tabIndex = -1; }
    const tile = tiles.get(el.s);
    tile.classList.add('sel');
    tile.tabIndex = 0;
    panel.classList.toggle('mute', !el.vis.length);
    panel.style.setProperty('--g', el.glow ? hexToRgb(el.glow).join(',') : '255,255,255');
    panel.querySelector('.p-z').textContent = el.z;
    panel.querySelector('.p-z').setAttribute('aria-label', `${t.z} ${el.z}`);
    panel.querySelector('.p-sym').textContent = el.s;
    const [n1, n2] = app.lang === 'zh' ? [el.zh, el.en] : [el.en, el.zh];
    const a = panel.querySelector('.p-n1'), b = panel.querySelector('.p-n2');
    a.textContent = n1; a.lang = app.lang === 'zh' ? 'zh-Hans' : 'en';
    b.textContent = n2; b.lang = app.lang === 'zh' ? 'en' : 'zh-Hans';
    panel.querySelector('.p-cat').textContent = t.cat[el.cat];
    panel.querySelector('#pOpen').href = '#/e/' + el.s;
    strip.set(drawLines(el, app.settings.full), app.settings.full ? RANGE_FULL : RANGE_VIS);
    chips.innerHTML = chipsHTML(app, el);
    chips.setAttribute('aria-label', t.lines);
    chips.classList.toggle('full', app.settings.full);
    panel.classList.toggle('full', app.settings.full);
    panel.querySelector('#pReplay').disabled = panel.querySelector('#pMode').disabled = !el.vis.length && !el.full.length;
  }

  function select(s, { play = true, focus = false } = {}) {
    const el = app.bySym.get(s);
    if (!el) return;
    const changed = app.sel !== s || !board.querySelector('.tile.sel');
    app.sel = s;
    if (changed) show(el);
    if (focus) tiles.get(s).focus({ preventScroll: true });
    if (play) app.play(el, { source: 'table' });
  }

  app.on('play', ({ el, sch, source }) => {
    if (source === 'test' || source === 'spell-hidden') return;
    const tile = tiles.get(el.s);
    if (tile && source !== 'spell') glowHalo(app, tile.querySelector('.halo'), sch);
    if (el.s === app.sel && (source === 'table' || source === 'detail')) {
      strip.flash(sch.voices);
      flashChips(app, chips, sch);
      const sym = panel.querySelector('.p-sym');
      if (sym.animate && el.glow) {
        const g = hexToRgb(el.glow).join(',');
        sym.animate([{ textShadow: `0 0 28px rgba(${g},.85)` }, { textShadow: `0 0 28px rgba(${g},0)` }],
          { duration: 1400 + (sch.voices.at(-1).start - sch.t0) * 1000, delay: Math.max(0, (sch.t0 - app.now()) * 1000), easing: 'ease-out' });
      }
    }
  });

  // ——— pointer: tap to play, drag to strum ———
  // Every tile the finger enters plays, in order, at least 45 ms apart. A fast swipe queues its tiles;
  // the queue never falls more than MAX_BACKLOG notes behind the finger (older queued notes give way).
  let drag = null, strum = null;
  const tileAt = (x, y) => {
    const hit = document.elementFromPoint(x, y);
    const tile = hit && hit.closest && hit.closest('.tile');
    return tile && board.contains(tile) ? tile : null;
  };
  function pump(d) {
    if (d.timer || !d.queue.length) return;
    const wait = MIN_GAP_MS - (performance.now() - d.t);
    if (wait > 0) { d.timer = setTimeout(() => { d.timer = 0; pump(d); }, wait); return; }
    d.t = performance.now();
    select(d.queue.shift());
    if (d.queue.length) d.timer = setTimeout(() => { d.timer = 0; pump(d); }, MIN_GAP_MS);
  }
  function walk(d, x, y) {
    // sample the path since the last event so a quick flick does not jump over tiles
    const dx = x - d.x, dy = y - d.y, dist = Math.hypot(dx, dy);
    const n = dist > 4 * stepPx ? 1 : Math.max(1, Math.ceil(dist / Math.max(3, cellPx / 3)));
    for (let i = 1; i <= n; i++) {
      const tile = tileAt(d.x + dx * i / n, d.y + dy * i / n);
      if (!tile || tile.dataset.s === d.last) continue;
      d.last = tile.dataset.s;
      d.queue.push(d.last);
      if (d.queue.length > MAX_BACKLOG) d.queue.splice(0, d.queue.length - MAX_BACKLOG);
    }
    d.x = x; d.y = y;
    pump(d);
  }
  board.addEventListener('pointerdown', e => {
    const tile = e.target.closest('.tile');
    if (!tile || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (strum) { clearTimeout(strum.timer); strum.queue.length = 0; }
    drag = strum = { id: e.pointerId, last: tile.dataset.s, t: performance.now(), timer: 0, queue: [], x: e.clientX, y: e.clientY };
    select(tile.dataset.s);
  });
  board.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const pts = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const p of pts.length ? pts : [e]) walk(drag, p.clientX, p.clientY);
  });
  const end = e => { if (drag && e.pointerId === drag.id) drag = null; };
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  board.addEventListener('click', e => {
    const tile = e.target.closest('.tile');
    if (tile && e.detail === 0) select(tile.dataset.s, { focus: true }); // keyboard activation
  });
  board.addEventListener('contextmenu', e => { if (e.target.closest('.tile')) e.preventDefault(); });

  // ——— panel controls ———
  panel.querySelector('#pReplay').addEventListener('click', () => app.play(app.el, { source: 'table' }));
  const modeBtn = panel.querySelector('#pMode');
  modeBtn.addEventListener('click', () => { app.set('chord', !app.settings.chord); app.play(app.el, { source: 'table' }); });
  function relabelMode() {
    const chord = app.settings.chord;
    modeBtn.innerHTML = chord ? ICON.chord : ICON.strum;
    modeBtn.setAttribute('aria-label', chord ? app.t.toStrum : app.t.toChord);
    modeBtn.dataset.tip = chord ? app.t.toStrum : app.t.toChord;
  }

  function relabel() {
    const t = app.t;
    for (const e of app.els) {
      tiles.get(e.s).setAttribute('aria-label', `${app.lang === 'zh' ? e.zh : e.en}, ${e.z}${e.vis.length ? '' : ', ' + t.silent}`);
    }
    const hint = root.querySelector('.hint');
    hint.textContent = app.coarse ? t.hintTouch : t.hintKeys;
    if (app.ios) hint.insertAdjacentHTML('beforeend', `<br><span class="ios">${t.ios}</span>`);
    relabelMode();
    if (app.view === 'play' || board.querySelector('.tile.sel')) show(app.el);
  }
  app.on('lang', relabel);
  app.on('settings', () => { relabelMode(); if (board.querySelector('.tile.sel')) show(app.el); });
  relabel();

  // ——— keyboard ———
  const typeSym = symbolTyper(app, s => select(s, { focus: document.activeElement?.classList.contains('tile') }));
  function move(k) {
    const cur = app.el;
    let next = null;
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const order = [...app.els].sort((a, b) => ROWS.indexOf(a.y) - ROWS.indexOf(b.y) || a.x - b.x);
      const i = order.indexOf(cur) + (k === 'ArrowRight' ? 1 : -1);
      next = order[Math.max(0, Math.min(order.length - 1, i))];
    } else {
      const step = k === 'ArrowDown' ? 1 : -1;
      for (let ri = ROWS.indexOf(cur.y) + step; ri >= 0 && ri < ROWS.length && !next; ri += step) {
        const row = app.els.filter(e => e.y === ROWS[ri]);
        if (!row.length) continue;
        next = row.reduce((a, b) => (Math.abs(b.x - cur.x) < Math.abs(a.x - cur.x) ? b : a));
      }
    }
    if (next && next !== cur) select(next.s, { focus: document.activeElement?.classList.contains('tile') });
  }

  return {
    root,
    enter(r, { first }) {
      layout();
      show(app.el);
      if (first) requestAnimationFrame(layout);
      else if (app.kbd && (!document.activeElement || document.activeElement === document.body)) tiles.get(app.sel)?.focus({ preventScroll: true });
    },
    title() { document.title = `${app.t.name} — ${app.t.sub}`; },
    key(e, { typing, onButton }) {
      if (typing) return;
      const k = e.key;
      if (k.startsWith('Arrow')) { e.preventDefault(); move(k); }
      else if (k === ' ') { if (onButton) return; e.preventDefault(); app.play(app.el, { source: 'table' }); }
      else if (k === 'Enter') {
        // on a focused tile too: Space plays it, Enter opens its details (as the About page says)
        if (onButton && !document.activeElement?.classList.contains('tile')) return;
        e.preventDefault();
        app.go('#/e/' + app.sel);
      }
      else if (isLetterKey(e)) typeSym(k);
    },
  };
}
