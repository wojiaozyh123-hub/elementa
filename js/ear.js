// Daily Ear Test (SPEC §4.3). Same puzzle on web and iOS for the same local date. Pure, no DOM.

export const POOL = 'H He Li Be B C N O Ne Na Mg Al Si P S Ar K Ca Ti Cr Mn Fe Co Ni Cu Zn Kr Rb Sr Ag Cd Sn I Xe Cs Ba W Pt Au Hg Pb U'.split(' ');
export const ROUNDS = 5;

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seedOf = (y, m, d) => y * 10000 + m * 100 + d;

/** Five rounds of {answer, choices[4]}; rand() is always called in the order the spec defines. */
export function puzzle(y, m, d) {
  const rand = mulberry32(seedOf(y, m, d));
  const n = POOL.length;
  const used = new Set();
  const rounds = [];
  for (let r = 0; r < ROUNDS; r++) {
    let answer;
    do answer = POOL[Math.floor(rand() * n)]; while (used.has(answer));
    used.add(answer);
    const choices = [];
    while (choices.length < 3) {
      const c = POOL[Math.floor(rand() * n)];
      if (c !== answer && !choices.includes(c)) choices.push(c);
    }
    choices.splice(Math.floor(rand() * 4), 0, answer);
    rounds.push({ answer, choices });
  }
  return rounds;
}

const DAY = 86400000;
const dayIndex = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);

/** Puzzle number = days since 2026-09-30 + 1. */
export const puzzleNumber = (y, m, d) => dayIndex(y, m, d) - dayIndex(2026, 9, 30) + 1;

/** The user's local calendar date as [y, m, d]. */
export const localDate = (date = new Date()) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

export const dateKey = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function addDays(y, m, d, k) {
  const t = new Date(Date.UTC(y, m - 1, d) + k * DAY);
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

/** Consecutive completed days ending today (or yesterday, if today is not finished yet). */
export function streak(done, y, m, d) {
  let cur = [y, m, d];
  if (!done(dateKey(...cur))) cur = addDays(...cur, -1);
  let n = 0;
  while (done(dateKey(...cur))) { n++; cur = addDays(...cur, -1); }
  return n;
}

/** "Elementa Ear Test #12 🟩🟥🟩🟩🟩 4/5 · <url>" (the number is left out before puzzle #1). */
export function shareText(num, results, url, zh = false) {
  const squares = results.map(ok => (ok ? '🟩' : '🟥')).join('');
  const score = results.filter(Boolean).length;
  const title = zh ? '元素之声 听音测验' : 'Elementa Ear Test';
  return `${title}${num > 0 ? ` #${num}` : ''} ${squares} ${score}/${results.length} · ${url}`;
}
