// Spell a word with element symbols (SPEC §4.4). Pure, no DOM.
// Dynamic programming over the characters: first spell as many letters as possible, then use as few
// tokens as possible; on a tie the two-letter symbol wins. Unmatched letters become 'miss' tokens.

export const MAX_LEN = 40;

const isLetter = c => c >= 'a' && c <= 'z';

/**
 * @param {string} word
 * @param {Map<string,string>} symbols  lower-case symbol → proper symbol ('he' → 'He')
 * @returns {{t:'el',s:string,text:string}|{t:'miss',text:string}|{t:'space'}}[]
 */
export function segment(word, symbols) {
  const chars = graphemes(clean(word).toLowerCase());
  const n = chars.length;
  // best[i] = [misses, tokens, step, kind] for the suffix starting at i
  const best = new Array(n + 1);
  best[n] = [0, 0, 0, null];
  const better = (a, b) => !b || a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  for (let i = n - 1; i >= 0; i--) {
    const c = chars[i];
    let pick = null;
    if (/\s/.test(c)) {
      const r = best[i + 1];
      pick = [r[0], r[1], 1, 'space'];
    } else {
      if (i + 1 < n && isLetter(c) && isLetter(chars[i + 1]) && symbols.has(c + chars[i + 1])) {
        const r = best[i + 2];
        pick = [r[0], r[1] + 1, 2, 'el'];
      }
      if (isLetter(c) && symbols.has(c)) {
        const r = best[i + 1], o = [r[0], r[1] + 1, 1, 'el'];
        if (better(o, pick)) pick = o;
      }
      const r = best[i + 1], o = [r[0] + 1, r[1], 1, 'miss'];
      if (better(o, pick)) pick = o;
    }
    best[i] = pick;
  }
  const out = [];
  for (let i = 0; i < n;) {
    const [, , step, kind] = best[i];
    const text = chars.slice(i, i + step).join('');
    if (kind === 'el') out.push({ t: 'el', s: symbols.get(text), text });
    else if (kind === 'space') { if (out.length && out[out.length - 1].t !== 'space') out.push({ t: 'space' }); }
    else out.push({ t: 'miss', text });
    i += step;
  }
  while (out.length && out[out.length - 1].t === 'space') out.pop();
  return out;
}

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;

/** User-perceived characters: an emoji such as 👨‍👩‍👧 or a flag stays one character. */
export const graphemes = s => (segmenter ? Array.from(segmenter.segment(s), g => g.segment) : [...s]);

/** Strip accents (é → e), fold full-width and ligature letters (ｆ → f, ﬁ → fi), collapse whitespace,
 *  cap the length. Keeps the original case for display. */
export function clean(word) {
  const s = String(word).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').replace(/\s+/g, ' ').replace(/^\s+/, '');
  return graphemes(s).slice(0, MAX_LEN).join('');
}

export const symbolMap = elements => new Map(elements.map(e => [e.s.toLowerCase(), e.s]));
