// Spell view: #/spell/<word>. Type anything; it is spelled with element symbols and played in sequence.

import { ICON } from './icons.js';
import { segment, symbolMap, clean } from './spell.js';
import { hexToRgb } from './physics.js';
import { renderCard } from './card.js';
import { glowHalo } from './table.js';
import { Strip, drawLines, RANGE_VIS } from './spectrum.js';

const MAX_STRIPS = 12;
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TRY = ['Hear', 'Tesla', 'Chopin', 'Bach', 'Genius', 'Carbon', 'Honey', 'Sunshine']; // all spell completely
const STEP = 0.5; // seconds between elements

export function createSpell(app) {
  const root = document.getElementById('v-spell');
  root.innerHTML = `
    <h1 class="vh" data-t="spell"></h1>
    <label class="s-field">
      <span class="vh" data-t="wordLabel"></span>
      <input id="sIn" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="40" enterkeyhint="go">
    </label>
    <div class="s-tiles"></div>
    <p class="note s-note"></p>
    <div class="s-strips" aria-hidden="true"></div>
    <div class="s-ctl">
      <button type="button" class="ib" id="sPlay" data-a="playWord" data-tip="">${ICON.play}</button>
      <button type="button" class="ib" id="sLink" data-a="shareLink" data-tip="">${ICON.link}</button>
      <button type="button" class="ib" id="sCard" data-a="saveCard" data-tip="">${ICON.image}</button>
    </div>
    <p class="s-try"><span data-t="tryWords"></span>${TRY.map(w => `<button type="button" class="textbtn" data-w="${w}">${w}</button>`).join('')}</p>`;

  const $ = s => root.querySelector(s);
  const input = $('#sIn');
  const box = $('.s-tiles');
  const symbols = symbolMap(app.els);
  let word = '', tokens = [], card = null, cardFor = '', cardTimer = 0;
  let strips = []; // [{i, strip}]
  const stripBox = $('.s-strips');

  function buildStrips() {
    for (const s of strips) s.strip.dispose();
    strips = [];
    stripBox.innerHTML = '';
    tokens.forEach((k, i) => {
      if (k.t !== 'el' || strips.length >= MAX_STRIPS) return;
      const el = app.bySym.get(k.s);
      const row = document.createElement('div');
      row.className = 's-row';
      row.innerHTML = `<span>${el.s}</span><canvas class="strip"></canvas>`;
      stripBox.append(row);
      const strip = new Strip(row.querySelector('canvas'));
      strip.set(drawLines(el, false), RANGE_VIS);
      strips.push({ i, strip });
    });
  }

  function update({ fromInput = false } = {}) {
    word = clean(input.value).trim();
    tokens = segment(word, symbols);
    const t = app.t;
    box.innerHTML = tokens.map((k, i) => {
      if (k.t === 'space') return '<span class="gap"></span>';
      if (k.t === 'miss') return `<span class="miss" aria-hidden="true">${esc(k.text.toUpperCase())}</span>`;
      const el = app.bySym.get(k.s);
      const g = el.glow ? `--g:${hexToRgb(el.glow).join(',')}` : '';
      return `<button type="button" class="stile${el.vis.length ? '' : ' mute'}" data-i="${i}" data-s="${el.s}" style="${g}" aria-label="${app.lang === 'zh' ? el.zh : el.en}">
        <span class="halo"></span><span class="z">${el.z}</span><span class="sym">${el.s}</span><span class="nm">${app.lang === 'zh' ? el.zh : el.en}</span></button>`;
    }).join('');
    buildStrips();
    const hasEl = tokens.some(k => k.t === 'el');
    const misses = tokens.some(k => k.t === 'miss');
    const nonLatin = /[^a-z\s]/i.test(word);
    $('.s-note').textContent = misses ? (nonLatin && !/[a-z]/i.test(word) ? t.lettersOnly : t.dimmed) : '';
    for (const id of ['#sPlay', '#sLink', '#sCard']) $(id).disabled = !hasEl;
    const hash = word ? '#/spell/' + encodeURIComponent(word) : '#/spell';
    if (fromInput && location.hash !== hash) history.replaceState(null, '', hash);
    document.title = t.titleSpell(word);
    clearTimeout(cardTimer);
    if (hasEl) cardTimer = setTimeout(prepareCard, 350);
  }

  function playWord() {
    app.stop(g => typeof g === 'string' && g.startsWith('spell:'));
    let i = 0;
    for (const k of tokens) {
      if (k.t !== 'el') continue;
      const el = app.bySym.get(k.s);
      const idx = tokens.indexOf(k);
      const sch = app.play(el, { when: i * STEP, group: 'spell:' + i, source: 'spell', chord: false });
      if (sch) {
        glowHalo(app, box.querySelector(`.stile[data-i="${idx}"] .halo`), sch);
        const st = strips.find(x => x.i === idx);
        if (st) st.strip.flash(sch.voices);
      }
      i++;
    }
  }

  function prepareCard() {
    if (!tokens.some(k => k.t === 'el')) return;
    const key = word + '|' + app.lang;
    if (cardFor === key && card) return;
    cardFor = key;
    card = null;
    const canvas = renderCard(word, tokens, app.bySym, app.t, app.url(''));
    canvas.toBlob(b => { if (cardFor === key) card = b; }, 'image/png');
  }

  function fileName() {
    const slug = word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'word';
    return `elementa-${slug}.png`;
  }

  async function shareCard() {
    if (!card) {
      prepareCard();
      const canvas = renderCard(word, tokens, app.bySym, app.t, app.url(''));
      card = await new Promise(r => canvas.toBlob(r, 'image/png'));
    }
    if (!card) return;
    const file = new File([card], fileName(), { type: 'image/png' });
    const url = app.url('#/spell/' + encodeURIComponent(word));
    if (app.coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: app.t.titleSpell(word), text: `${app.t.spellShare(word)} ${url}` }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    app.toast(app.t.saved);
  }

  input.addEventListener('input', () => update({ fromInput: true }));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); playWord(); if (app.coarse) input.blur(); }
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('.stile');
    if (!b) return;
    const el = app.bySym.get(b.dataset.s);
    const sch = app.play(el, { group: 'spell:tap', source: 'spell' });
    if (sch) {
      glowHalo(app, b.querySelector('.halo'), sch);
      const st = strips.find(x => x.i === Number(b.dataset.i));
      if (st) st.strip.flash(sch.voices);
    }
  });
  $('#sPlay').addEventListener('click', playWord);
  $('#sLink').addEventListener('click', () => {
    app.share({ title: app.t.titleSpell(word), text: app.t.spellShare(word), url: app.url('#/spell/' + encodeURIComponent(word)) });
  });
  $('#sCard').addEventListener('click', shareCard);
  $('.s-try').addEventListener('click', e => {
    const b = e.target.closest('[data-w]');
    if (!b) return;
    input.value = b.dataset.w;
    update({ fromInput: true });
    playWord();
  });

  function relabel() {
    input.placeholder = app.t.typeWord;
    if (app.view === 'spell') update();
  }
  app.on('lang', relabel);
  relabel();

  return {
    root,
    enter(r, { first }) {
      const w = clean(r.w || '');
      if (w !== word || input.value !== w) input.value = w;
      update();
      if (!app.coarse && !w) input.focus({ preventScroll: true });
      if (w && !first && app.unlocked() && navigator.userActivation?.isActive !== false) playWord();
    },
    leave() { app.stop(g => typeof g === 'string' && g.startsWith('spell:')); },
    title() { document.title = app.t.titleSpell(word); },
    key(e, { typing, onButton }) {
      if (typing) return;
      if (e.key === ' ' && !onButton) { e.preventDefault(); playWord(); }
      else if (e.key.length === 1 && /\S/.test(e.key) && !onButton) { input.focus(); }
    },
  };
}
