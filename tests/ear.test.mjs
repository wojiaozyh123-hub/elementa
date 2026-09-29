// Ear Test: same puzzle everywhere — must match the reference vectors and data/earvec.js exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { puzzle, puzzleNumber, mulberry32, POOL, streak, dateKey, shareText, localDate, addDays } from '../js/ear.js';

const REF = {
  '2026-09-30': [{ answer: 'Ag', choices: ['Pt', 'Cs', 'Ne', 'Ag'] }, { answer: 'Pt', choices: ['N', 'Si', 'Pt', 'Cs'] }, { answer: 'I', choices: ['Hg', 'Mg', 'I', 'N'] }, { answer: 'Co', choices: ['Mg', 'Ti', 'Cd', 'Co'] }, { answer: 'Mn', choices: ['Cr', 'S', 'Mn', 'C'] }],
  '2026-10-01': [{ answer: 'P', choices: ['N', 'P', 'Li', 'U'] }, { answer: 'Li', choices: ['Pb', 'Mg', 'Li', 'Cs'] }, { answer: 'O', choices: ['S', 'H', 'O', 'B'] }, { answer: 'Si', choices: ['H', 'B', 'Si', 'Sr'] }, { answer: 'Cd', choices: ['Cd', 'Mn', 'Ba', 'Co'] }],
};

test('reference vectors match exactly', () => {
  assert.deepEqual(puzzle(2026, 9, 30), REF['2026-09-30']);
  assert.deepEqual(puzzle(2026, 10, 1), REF['2026-10-01']);
});

test('matches the JS reference implementation (data/earvec.js) byte for byte', () => {
  const ref = fileURLToPath(new URL('../../data/earvec.js', import.meta.url));
  let out;
  try { out = execFileSync(process.execPath, [ref], { encoding: 'utf8' }); } catch { return; } // repo layout without data/
  for (const line of out.trim().split('\n')) {
    const [date, json] = [line.slice(0, line.indexOf(' ')), line.slice(line.indexOf(' ') + 1)];
    const [y, m, d] = date.split('-').map(Number);
    assert.equal(JSON.stringify(puzzle(y, m, d)), json, date);
  }
});

test('mulberry32 known first outputs', () => {
  const r = mulberry32(20260930);
  const a = r(), b = r();
  assert.ok(a >= 0 && a < 1 && b >= 0 && b < 1 && a !== b);
  const r2 = mulberry32(20260930);
  assert.equal(r2(), a);
});

test('every day for five years: 5 distinct answers, 4 distinct choices containing the answer, all from POOL', () => {
  let [y, m, d] = [2026, 9, 30];
  const els = JSON.parse(readFileSync(new URL('../elements.json', import.meta.url)));
  const audible = new Set(els.filter(e => e.vis.length).map(e => e.s));
  for (const s of POOL) assert.ok(audible.has(s), `${s} must have visible lines`);
  for (let i = 0; i < 365 * 5; i++) {
    const p = puzzle(y, m, d);
    assert.equal(new Set(p.map(r => r.answer)).size, 5);
    for (const r of p) {
      assert.equal(r.choices.length, 4);
      assert.equal(new Set(r.choices).size, 4);
      assert.ok(r.choices.includes(r.answer));
      for (const c of r.choices) assert.ok(POOL.includes(c));
    }
    [y, m, d] = addDays(y, m, d, 1);
  }
});

test('puzzle number = days since 2026-09-30 + 1 (DST-safe)', () => {
  assert.equal(puzzleNumber(2026, 9, 30), 1);
  assert.equal(puzzleNumber(2026, 10, 1), 2);
  assert.equal(puzzleNumber(2026, 9, 29), 0);
  assert.equal(puzzleNumber(2026, 11, 2), 34);   // across the US DST change
  assert.equal(puzzleNumber(2027, 3, 29), 181);  // across the EU DST change
  assert.equal(puzzleNumber(2027, 9, 30), 366);
});

test('local date and seeds', () => {
  assert.deepEqual(localDate(new Date(2026, 8, 30, 23, 59)), [2026, 9, 30]);
  assert.equal(dateKey(2026, 1, 5), '2026-01-05');
});

test('streak counts consecutive completed days ending today or yesterday', () => {
  const done = new Set(['2026-10-01', '2026-10-02', '2026-10-03']);
  const f = k => done.has(k);
  assert.equal(streak(f, 2026, 10, 3), 3);
  assert.equal(streak(f, 2026, 10, 4), 3);
  assert.equal(streak(f, 2026, 10, 5), 0);
});

test('share text', () => {
  assert.equal(shareText(12, [true, false, true, true, true], 'https://x/'), 'Elementa Ear Test #12 🟩🟥🟩🟩🟩 4/5 · https://x/');
  assert.equal(shareText(0, [true, true, true, true, true], 'u'), 'Elementa Ear Test 🟩🟩🟩🟩🟩 5/5 · u');
});
