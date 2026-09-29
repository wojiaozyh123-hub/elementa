// Spell: dynamic-programming segmentation into element symbols.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { segment, symbolMap, clean } from '../js/spell.js';

const els = JSON.parse(readFileSync(new URL('../elements.json', import.meta.url)));
const map = symbolMap(els);
const show = w => segment(w, map).map(t => (t.t === 'el' ? t.s : t.t === 'miss' ? `(${t.text})` : '_')).join(' ');

test('spells whole words with the fewest symbols', () => {
  assert.equal(show('Hear'), 'He Ar');
  assert.equal(show('Tesla'), 'Te S La');
  assert.equal(show('science'), 'Sc I (e) N Ce'); // not every word can be spelled
  assert.equal(show('Bach'), 'Ba C H');         // ties go to the two-letter symbol
  assert.equal(show('CHOPIN'), 'C Ho P In');
  assert.equal(show('genius'), 'Ge Ni U S');
  assert.equal(show('carbon'), 'Ca Rb O N');
  assert.equal(show('wonder'), 'W O Nd Er');
  assert.equal(show('physics'), 'P H Y Si Cs');
  assert.equal(show('sunshine'), 'S U N S H I Ne');
  assert.equal(show('co'), 'Co');           // one token beats C + O
  assert.equal(show('noise'), 'No I Se');
});

test('case-insensitive, accents dropped, spaces kept once', () => {
  assert.equal(show('HeAr'), 'He Ar');
  assert.equal(show('Café'), 'Ca Fe');
  assert.equal(show('  he   ar  '), 'He _ Ar');
  assert.equal(clean('Ångström'), 'Angstrom');
});

test('impossible words: longest spellable parse, unmatched letters dimmed', () => {
  assert.equal(show('hello'), 'He (l) (l) O');
  assert.equal(show('jazz'), '(j) (a) (z) (z)');
  assert.equal(show('music'), '(m) U Si C');
  assert.equal(show('元素'), '(元) (素)');
  assert.equal(show('B-52'), 'B (-) (5) (2)');
  assert.deepEqual(segment('', map), []);
});

test('never fewer letters spelled than a greedy parse', () => {
  const words = ['elementa', 'bacon', 'genius', 'periodic', 'spectrum', 'octave', 'sodium', 'hydrogen', 'light'];
  for (const w of words) {
    const dp = segment(w, map).filter(t => t.t === 'miss').length;
    // greedy: two-letter symbol first, then one-letter, else miss
    let g = 0;
    for (let i = 0; i < w.length;) {
      if (map.has(w.slice(i, i + 2)) && i + 1 < w.length) i += 2;
      else if (map.has(w[i])) i += 1;
      else { g++; i++; }
    }
    assert.ok(dp <= g, `${w}: dp ${dp} misses > greedy ${g}`);
  }
});

test('length is capped at 40 characters', () => {
  assert.equal(segment('h'.repeat(100), map).length, 40);
});

test('emoji stay whole, full-width and ligature letters fold to ASCII', () => {
  assert.equal(show('👨‍👩‍👧'), '(👨‍👩‍👧)');
  assert.equal(show('🇨🇳 China'), '(🇨🇳) _ C H I Na');
  assert.equal(show('ｆｕｌｌ'), 'F U (l) (l)');
  assert.equal(show('ﬁre'), 'F I Re');
  assert.equal(clean('ＢＡＣＨ'), 'BACH');
});
