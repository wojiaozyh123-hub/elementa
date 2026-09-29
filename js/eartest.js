// Daily Ear Test view: #/test.

import { ICON } from './icons.js';
import { puzzle, puzzleNumber, localDate, dateKey, streak, shareText, ROUNDS } from './ear.js';
import { hexToRgb } from './physics.js';
import { Strip, drawLines, RANGE_VIS, RANGE_FULL } from './spectrum.js';

const KEY = 'elementa.ear.v1';

export function createTest(app) {
  const root = document.getElementById('v-test');
  root.innerHTML = `
    <header class="t-head">
      <h1 class="t-title"></h1>
      <p class="t-meta"></p>
    </header>
    <ol class="t-dots" aria-hidden="true">${'<li></li>'.repeat(ROUNDS)}</ol>
    <div class="t-game">
      <p class="t-round vh" aria-live="polite"></p>
      <button type="button" class="t-play" data-a="mystery"><span class="halo"></span>${ICON.play}</button>
      <p class="t-q" data-t="question"></p>
      <div class="t-choices" role="group" data-a="question"></div>
      <div class="t-after">
        <p class="t-verdict" aria-live="polite"></p>
        <canvas class="strip t-strip" aria-hidden="true"></canvas>
        <button type="button" class="ib t-next" data-a="nextRound" data-tip="">${ICON.forward}</button>
      </div>
      <p class="t-ios note"></p>
    </div>
    <div class="t-done">
      <div class="t-score"></div>
      <div class="t-squares" aria-hidden="true"></div>
      <p class="t-streak"></p>
      <button type="button" class="ib t-share" data-a="shareResult" data-tip="">${ICON.share}</button>
      <p class="t-nextin note"></p>
      <h2 data-t="today"></h2>
      <ul class="t-today"></ul>
    </div>`;

  const $ = s => root.querySelector(s);
  const strip = new Strip($('.t-strip'), { captions: () => [app.t.ir, app.t.uv] });
  let day, key, rounds, num, rec, round = 0, revealed = false, timer = 0;

  const all = () => app.load(KEY, { days: {} });
  function save() {
    const data = all();
    data.days[key] = rec;
    const keys = Object.keys(data.days).sort();
    while (keys.length > 400) delete data.days[keys.shift()];
    app.store(KEY, data);
  }
  const results = r => r.picks.map((p, i) => p === rounds[i].answer);

  function setup() {
    day = localDate();
    key = dateKey(...day);
    rounds = puzzle(...day);
    num = puzzleNumber(...day);
    const saved = all().days[key];
    rec = saved && Array.isArray(saved.picks) ? { picks: saved.picks.slice(0, ROUNDS) } : { picks: [] };
    round = rec.picks.length;
    revealed = false;
  }

  function streakNow() {
    const days = all().days;
    return streak(k => !!(days[k] && days[k].picks && days[k].picks.length >= ROUNDS), ...day);
  }

  function header() {
    const t = app.t;
    $('.t-title').textContent = t.testTitle(num);
    const date = new Date(day[0], day[1] - 1, day[2]).toLocaleDateString(app.lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric' });
    const s = streakNow();
    const finished = rec.picks.length >= ROUNDS && !revealed;
    $('.t-meta').textContent = s > 0 && !finished ? `${date} · ${t.streak(s)}` : date;
    const dots = root.querySelectorAll('.t-dots li');
    const res = results(rec);
    dots.forEach((d, i) => {
      d.className = i < res.length ? (res[i] ? 'ok' : 'bad') : i === round && round < ROUNDS ? 'cur' : '';
    });
  }

  function renderRound() {
    const t = app.t;
    const done = rec.picks.length >= ROUNDS && !revealed;
    root.classList.toggle('finished', done);
    header();
    if (done) return renderDone();
    const r = rounds[Math.min(round, ROUNDS - 1)];
    $('.t-round').textContent = t.round(round + 1, ROUNDS);
    const pick = revealed ? rec.picks[round] : null;
    $('.t-choices').innerHTML = r.choices.map((s, i) => {
      const el = app.bySym.get(s);
      let cls = 'choice';
      if (revealed) cls += s === r.answer ? ' ok' : s === pick ? ' bad' : ' dim';
      const name = app.lang === 'zh' ? el.zh : el.en;
      const label = !revealed ? t.choose((i + 1) + ' ' + name)
        : s === r.answer ? `${name}, ${t.correct}` : s === pick ? `${name}, ${t.wrong}` : name;
      return `<button type="button" class="${cls}" data-s="${s}" aria-label="${label}">
        <span class="halo"></span><span class="k">${i + 1}</span><span class="sym">${s}</span><span class="nm">${app.lang === 'zh' ? el.zh : el.en}</span></button>`;
    }).join('');
    root.classList.toggle('revealed', revealed);
    const answer = app.bySym.get(r.answer);
    if (revealed) {
      const ok = pick === r.answer;
      $('.t-verdict').textContent = ok
        ? `${t.correct} — ${app.lang === 'zh' ? answer.zh : answer.en}`
        : `${t.wrong} — ${app.lang === 'zh' ? answer.zh : answer.en} (${answer.s})`;
      $('.t-verdict').className = 't-verdict ' + (ok ? 'ok' : 'bad');
      strip.set(drawLines(answer, app.settings.full), app.settings.full ? RANGE_FULL : RANGE_VIS);
      const nb = $('.t-next');
      const last = round >= ROUNDS - 1;
      nb.setAttribute('aria-label', last ? t.results : t.nextRound);
      nb.dataset.tip = last ? t.results : t.nextRound;
    } else {
      $('.t-verdict').textContent = '';
    }
    $('.t-ios').textContent = app.ios ? t.ios : '';
  }

  function renderDone() {
    const t = app.t;
    const res = results(rec);
    const score = res.filter(Boolean).length;
    $('.t-score').textContent = `${score}/${ROUNDS}`;
    $('.t-squares').innerHTML = res.map(ok => `<i class="${ok ? 'ok' : 'bad'}"></i>`).join('');
    const s = streakNow();
    $('.t-streak').textContent = s > 0 ? t.streak(s) : '';
    $('.t-today').innerHTML = rounds.map((r, i) => {
      const el = app.bySym.get(r.answer);
      const ok = res[i];
      return `<li><a class="t-row" href="#/e/${el.s}" style="--g:${el.glow ? hexToRgb(el.glow).join(',') : '255,255,255'}">
        <span class="sym">${el.s}</span><span class="nm">${app.lang === 'zh' ? el.zh : el.en}</span>
        <span class="mk ${ok ? 'ok' : 'bad'}" aria-label="${ok ? t.correct : t.wrong}">${ok ? ICON.check : ICON.cross}</span></a></li>`;
    }).join('');
    tick();
  }

  function tick() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((next - now) / 1000));
    const hh = String(Math.floor(s / 3600)).padStart(2, '0'), mm = String(Math.floor(s / 60) % 60).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
    $('.t-nextin').textContent = app.t.nextIn(`${hh}:${mm}:${ss}`);
    if (dateKey(...localDate()) !== key && app.view === 'test') { setup(); renderRound(); }
  }

  function mystery() {
    if (rec.picks.length >= ROUNDS && !revealed) return;
    const el = app.bySym.get(rounds[round].answer);
    const sch = app.play(el, { source: 'test', group: 'ear' });
    if (sch) ringGlow(sch);
  }

  function ringGlow(sch) {
    const halo = $('.t-play .halo');
    if (!halo.animate) return;
    const span = (sch.voices.at(-1).start - sch.t0) * 1000;
    halo.animate([{ opacity: 0 }, { opacity: 1, offset: 0.03 }, { opacity: 0 }],
      { duration: span + 1400, delay: Math.max(0, (sch.t0 - app.now()) * 1000), easing: 'ease-out' });
  }

  function answer(s) {
    if (revealed || rec.picks.length >= ROUNDS) return;
    rec.picks.push(s);
    save();
    revealed = true;
    renderRound();
    const el = app.bySym.get(rounds[round].answer);
    const sch = app.play(el, { source: 'test', group: 'ear' });
    if (sch) {
      strip.flash(sch.voices);
      const tile = root.querySelector(`.choice[data-s="${el.s}"] .halo`);
      if (tile && tile.animate) tile.animate([{ opacity: 0.4 }, { opacity: 1, offset: 0.05 }, { opacity: 0.55 }], { duration: 1600, easing: 'ease-out', fill: 'forwards' });
    }
    $('.t-next').focus({ preventScroll: true });
  }

  function next() {
    if (!revealed) return;
    revealed = false;
    round = rec.picks.length;
    app.stop('ear');
    renderRound();
    if (round < ROUNDS) mystery();
    else root.querySelector('.t-share').focus({ preventScroll: true });
  }

  $('.t-play').addEventListener('click', mystery);
  $('.t-next').addEventListener('click', next);
  $('.t-choices').addEventListener('click', e => {
    const b = e.target.closest('.choice');
    if (!b) return;
    if (revealed) {
      const el = app.bySym.get(b.dataset.s);
      const sch = app.play(el, { source: 'test', group: 'ear' });
      if (sch) strip.set(drawLines(el, app.settings.full), app.settings.full ? RANGE_FULL : RANGE_VIS), strip.flash(sch.voices);
    } else answer(b.dataset.s);
  });
  $('.t-share').addEventListener('click', () => {
    const text = shareText(num, results(rec), app.url('#/test'), app.lang === 'zh');
    app.share({ title: app.t.testTitle(num), text, copyText: text });
  });

  app.on('lang', () => { if (rounds) renderRound(); });

  return {
    root,
    enter(r, { first }) {
      setup();
      renderRound();
      clearInterval(timer);
      timer = setInterval(() => { if (root.classList.contains('finished')) tick(); }, 1000);
      if (!first && round < ROUNDS && app.unlocked() && navigator.userActivation?.isActive !== false) mystery();
    },
    leave() { clearInterval(timer); app.stop('ear'); },
    title() { document.title = app.t.titleTest(num); },
    key(e, { typing, onButton }) {
      if (typing) return;
      const k = e.key;
      if (/^[1-4]$/.test(k) && !revealed && round < ROUNDS) {
        const b = root.querySelectorAll('.choice')[Number(k) - 1];
        if (b) answer(b.dataset.s);
      } else if (k === ' ') { if (onButton) return; e.preventDefault(); if (revealed) { const el = app.bySym.get(rounds[round].answer); app.play(el, { source: 'test', group: 'ear' }); } else mystery(); }
      else if ((k === 'Enter' && !onButton) || k === 'ArrowRight') { if (revealed) { e.preventDefault(); next(); } }
    },
  };
}
