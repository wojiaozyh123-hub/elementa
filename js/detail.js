// Element detail view: #/e/<Symbol>.

import { ICON } from './icons.js';
import { Strip, drawLines, RANGE_VIS, RANGE_FULL } from './spectrum.js';
import { freq, noteLabel, rgb, hexToRgb, xOf } from './physics.js';
import { explain } from './explain.js';
import { flashChips } from './table.js';
import { symbolTyper, isLetterKey } from './keys.js';

const TICKS_VIS = [700, 600, 500, 400];
const TICKS_FULL = [1000, 800, 600, 400, 300, 200];

export function createDetail(app) {
  const root = document.getElementById('v-el');
  root.innerHTML = `
    <div class="bar">
      <button type="button" class="ib" id="dBack" data-a="back" data-tip="">${ICON.back}</button>
      <div class="bar-r">
        <a class="ib" id="dPrev" data-a="prev" data-tip="" href="#/">${ICON.prev}</a>
        <a class="ib" id="dNext" data-a="next" data-tip="" href="#/">${ICON.next}</a>
        <button type="button" class="ib" id="dShare" data-a="share" data-tip="">${ICON.share}</button>
      </div>
    </div>
    <header class="d-head">
      <div class="d-symbox"><span class="d-z"></span><span class="d-sym"></span></div>
      <div class="d-names"><h1 class="d-n1"></h1><div class="d-n2"></div><div class="d-cat"></div></div>
      <div class="d-ctl">
        <button type="button" class="ib play" id="dPlay" data-a="play" data-tip="">${ICON.play}</button>
        <button type="button" class="ib" id="dMode" data-tip=""></button>
      </div>
    </header>
    <div class="d-spec">
      <canvas class="strip d-strip" aria-hidden="true"></canvas>
      <div class="d-axis" aria-hidden="true"></div>
    </div>
    <div class="seg" role="group" data-a="rangeLabel">
      <button type="button" data-v="0" data-t="visible"></button>
      <button type="button" data-v="1" data-t="full"></button>
    </div>
    <div class="d-cols">
      <section class="d-linesec">
        <h2 data-t="lines"></h2>
        <p class="note d-tap" data-t="tapLine"></p>
        <ol class="d-lines"></ol>
      </section>
      <section class="d-side">
        <div class="d-sws"></div>
        <h2 data-t="hearing"></h2>
        <div class="d-explain"></div>
      </section>
    </div>`;

  const $ = s => root.querySelector(s);
  const strip = new Strip($('.d-strip'), { captions: () => [app.t.ir, app.t.uv] });
  const list = $('.d-lines');
  let el = null;
  let cameFromApp = false;

  function render() {
    if (!el) return;
    const t = app.t, full = app.settings.full, zh = app.lang === 'zh';
    root.classList.toggle('mute', !el.vis.length);
    root.style.setProperty('--g', el.glow ? hexToRgb(el.glow).join(',') : '255,255,255');
    $('.d-z').textContent = el.z;
    $('.d-z').setAttribute('aria-label', `${t.z} ${el.z}`);
    $('.d-sym').textContent = el.s;
    const n1 = $('.d-n1'), n2 = $('.d-n2');
    n1.textContent = zh ? el.zh : el.en; n1.lang = zh ? 'zh-Hans' : 'en';
    n2.textContent = zh ? el.en : el.zh; n2.lang = zh ? 'en' : 'zh-Hans';
    $('.d-cat').textContent = t.cat[el.cat];
    const prev = app.els[(el.z + 116) % 118], next = app.els[el.z % 118];
    $('#dPrev').href = '#/e/' + prev.s;
    $('#dNext').href = '#/e/' + next.s;
    $('#dPlay').disabled = !app.lines(el).length;
    $('#dMode').disabled = !el.vis.length && !el.full.length;

    strip.set(drawLines(el, full), full ? RANGE_FULL : RANGE_VIS);
    const [lo, hi] = full ? RANGE_FULL : RANGE_VIS;
    const ticks = full ? TICKS_FULL : TICKS_VIS;
    $('.d-axis').innerHTML = ticks.map((nm, i) => {
      const x = xOf(nm, lo, hi) * 100;
      const cls = x < 3 ? 'l' : x > 97 ? 'r' : '';
      return `<span class="${cls}" style="left:${x.toFixed(2)}%">${nm} nm<small>${Math.round(freq(nm))} Hz</small></span>`;
    }).join('');
    for (const b of root.querySelectorAll('.seg button')) b.setAttribute('aria-pressed', String(b.dataset.v === (full ? '1' : '0')));

    const lines = [...app.lines(el)].sort((a, b) => b[0] - a[0]);
    const maxAmp = Math.max(...lines.map(l => l[1]), 0.001);
    list.innerHTML = lines.length ? lines.map(([nm, amp]) => {
      const f = freq(nm), c = rgb(nm);
      const col = c ? `rgb(${c})` : 'rgba(205,205,212,.5)';
      const note = noteLabel(f);
      return `<li data-nm="${nm}"><button type="button" class="line" data-nm="${nm}" aria-label="${t.lineLabel(nm.toFixed(3), f.toFixed(2), note)}">
        <i style="--lc:${col}"></i><span class="nm">${nm.toFixed(3)}<small> nm</small></span><span class="hz">${f.toFixed(2)}<small> Hz</small></span><span class="nt">${note}</span><span class="amp"><b style="--lc:${col};width:${(100 * amp / maxAmp).toFixed(0)}%"></b></span></button></li>`;
    }).join('') : `<li class="none">${t.silent}</li>`;
    $('.d-tap').hidden = !lines.length;

    const sw = [];
    if (el.glow) sw.push(`<div class="sw"><i style="--sc:${el.glow}"></i><div><div>${t.hue}</div><small>${el.glow}</small></div></div>`);
    if (el.flame) sw.push(`<div class="sw"><i style="--sc:${el.flame}"></i><div><div>${t.flame}</div><small>${el.flame}</small></div></div>`);
    $('.d-sws').innerHTML = sw.join('') + (el.flame ? `<p class="note">${t.flameNote}</p>` : '');
    $('.d-explain').innerHTML = explain(el, app.lang, full, t).map(p => `<p>${p}</p>`).join('');
    relabelMode();
  }

  function relabelMode() {
    const chord = app.settings.chord, b = $('#dMode');
    b.innerHTML = chord ? ICON.chord : ICON.strum;
    b.setAttribute('aria-label', chord ? app.t.toStrum : app.t.toChord);
    b.dataset.tip = chord ? app.t.toStrum : app.t.toChord;
  }

  const play = () => el && app.play(el, { source: 'detail' });

  app.on('play', ({ el: e, sch, source, lines }) => {
    if (!el || e !== el || app.view !== 'el') return;
    if (source !== 'detail' && source !== 'detail-line' && source !== 'table') return;
    strip.flash(sch.voices);
    flashChips(app, list, sch);
    const sym = $('.d-sym');
    if (sym.animate && el.glow && source !== 'detail-line') {
      const g = hexToRgb(el.glow).join(',');
      sym.animate([{ textShadow: `0 0 40px rgba(${g},.8)` }, { textShadow: `0 0 40px rgba(${g},0)` }],
        { duration: 1400 + (sch.voices.at(-1).start - sch.t0) * 1000, delay: Math.max(0, (sch.t0 - app.now()) * 1000), easing: 'ease-out' });
    }
  });

  $('#dPlay').addEventListener('click', play);
  $('#dMode').addEventListener('click', () => { app.set('chord', !app.settings.chord); play(); });
  $('#dShare').addEventListener('click', () => {
    if (!el) return;
    app.share({ title: app.t.titleEl(el), text: app.t.elShare(el), url: app.url('#/e/' + el.s) });
  });
  $('#dBack').addEventListener('click', () => {
    if (cameFromApp && history.length > 1) history.back(); else app.go('#/');
  });
  for (const id of ['#dPrev', '#dNext']) {
    $(id).addEventListener('click', e => {
      e.preventDefault();
      location.replace(e.currentTarget.getAttribute('href'));
    });
  }
  for (const b of root.querySelectorAll('.seg button')) {
    b.addEventListener('click', () => { app.set('full', b.dataset.v === '1'); play(); });
  }
  list.addEventListener('click', e => {
    const b = e.target.closest('button.line');
    if (!b || !el) return;
    const nm = Number(b.dataset.nm);
    const line = app.lines(el).find(l => l[0] === nm);
    if (line) app.play(el, { lines: [[line[0], 1]], group: el.s + ':' + nm, source: 'detail-line', chord: true });
  });

  app.on('lang', () => { if (el) render(); });
  app.on('settings', () => { if (el && app.view === 'el') render(); });

  const typeSym = symbolTyper(app, s => { location.replace('#/e/' + s); });

  return {
    root,
    enter(r, { entering, first }) {
      const same = el === r.el;
      el = r.el;
      app.sel = el.s;
      if (entering) cameFromApp = !first;
      render();
      if ((!same || entering) && app.unlocked() && navigator.userActivation?.isActive !== false) play();
    },
    title() { if (el) document.title = app.t.titleEl(el); },
    key(e, { typing, onButton }) {
      if (typing) return;
      const k = e.key;
      if (k === 'Escape') { $('#dBack').click(); }
      else if (k === 'ArrowLeft' || k === 'ArrowRight') {
        e.preventDefault();
        location.replace((k === 'ArrowLeft' ? $('#dPrev') : $('#dNext')).getAttribute('href'));
      } else if (k === ' ') { if (onButton) return; e.preventDefault(); play(); }
      else if (isLetterKey(e)) typeSym(k);
    },
  };
}
