// About / How it works: #/about. Prose is static in index.html; this wires the demos and settings.

import { Strip, drawLines, RANGE_VIS } from './spectrum.js';

export function createAbout(app) {
  const root = document.getElementById('v-about');

  const strips = {};
  for (const c of root.querySelectorAll('canvas[data-strip]')) {
    const el = app.bySym.get(c.dataset.strip);
    const range = c.dataset.lo ? [Number(c.dataset.lo), Number(c.dataset.hi)] : RANGE_VIS;
    const strip = new Strip(c);
    strip.set(c.dataset.lo ? el.vis : drawLines(el, false), range);
    strips[el.s] = strip;
  }

  function sync() {
    const s = app.settings;
    for (const seg of root.querySelectorAll('.seg[data-k]')) {
      const k = seg.dataset.k;
      const cur = k === 'lang' ? s.lang : s[k] ? '1' : '0';
      for (const b of seg.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === cur));
    }
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const seg = b.closest('.seg[data-k]');
    if (seg) {
      const k = seg.dataset.k;
      app.set(k, k === 'lang' ? b.dataset.v : b.dataset.v === '1');
      sync();
      return;
    }
    if (b.dataset.demo) {
      const [sym, mode] = b.dataset.demo.split(':');
      const el = app.bySym.get(sym);
      // a magnified strip (sodium's D lines) plays just the lines it shows, so the beat is heard on its own
      const c = root.querySelector(`canvas[data-strip="${sym}"]`);
      const lines = c && c.dataset.lo ? el.vis.filter(([nm]) => nm >= Number(c.dataset.lo) && nm <= Number(c.dataset.hi)) : el.vis;
      const sch = app.play(el, { chord: mode === 'chord', tuned: false, lines, source: 'about', group: 'about' });
      if (sch && strips[sym]) strips[sym].flash(sch.voices);
      if (sch && b.animate) {
        const halo = b.querySelector('.halo');
        if (halo) halo.animate([{ opacity: 0 }, { opacity: 1, offset: 0.02 }, { opacity: 0 }], { duration: (mode === 'chord' ? 5000 : 2000), easing: 'ease-out' });
      }
    }
  });

  app.on('settings', sync);

  return {
    root,
    enter() { sync(); },
    leave() { app.stop('about'); },
    title() { document.title = app.t.titleAbout; },
  };
}
