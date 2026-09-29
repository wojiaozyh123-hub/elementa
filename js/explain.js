// "What you're hearing" — a short, factual explainer built from each element's own lines.

import { freq, noteLabel, doublets, colourName } from './physics.js';

const FACT = {
  H: ['These are the Balmer lines, given off when hydrogen’s electron falls back to its second energy level. The red one colours glowing nebulae.',
      '这些是巴耳末系谱线：氢原子的电子落回第二能级时发出。其中的红线让发光的星云呈现红色。'],
  He: ['Helium was first seen in the Sun’s spectrum, in 1868, before anyone found it on Earth.',
       '人们在 1868 年先从太阳光谱里看到了氦，之后才在地球上找到它。'],
  Li: ['Lithium’s strong red line gives its flame a crimson colour.', '锂的强红线让它的火焰呈深红色。'],
  Na: ['The pair near 589 nm is the famous sodium D doublet — the yellow of old street lamps.',
       '589 nm 附近的一对就是著名的钠 D 双线，也就是老式路灯的黄光。'],
  K: ['Potassium’s strongest line, at 766.7 nm, sits at the deep-red edge of vision, so its flame looks lilac rather than red.',
      '钾最强的谱线在 766.7 nm，处在可见光的深红边缘，所以它的火焰看上去是淡紫色，而不是红色。'],
  Rb: ['Rubidium was discovered in 1861 through its deep-red lines; its name means “deep red”.',
       '铷在 1861 年因深红色谱线被发现，名字意为“深红色”。'],
  Cs: ['Caesium was discovered in 1860 through two bright blue lines; its name means “sky blue”.',
       '铯在 1860 年因两条明亮的蓝色谱线被发现，名字意为“天蓝色”。'],
  In: ['Indium is named after the indigo line that revealed it in 1863.', '铟得名于 1863 年揭示它存在的那条靛蓝色谱线。'],
  Tl: ['Thallium is named after its bright green line (Greek thallos, a green shoot).', '铊得名于它明亮的绿色谱线（希腊语 thallos，意为嫩绿的新枝）。'],
  Ne: ['This crowd of red and orange lines is the glow of a neon sign.', '这一片红橙色谱线，正是霓虹灯的颜色。'],
  Hg: ['These blue, green and yellow lines are the light of a mercury-vapour lamp.', '这些蓝、绿、黄色谱线就是汞灯发出的光。'],
  Fe: ['Iron has thousands of spectral lines; these are only its strongest few.', '铁有成千上万条谱线，这里只是最强的几条。'],
};

const f1 = x => x.toFixed(1);

function span(lo, hi, zh) {
  const semis = 12 * Math.log2(hi / lo);
  if (zh) {
    if (semis >= 11.5 && semis < 12.5) return '大约一个八度';
    if (semis >= 12.5) return `超过一个八度（${Math.round(semis)} 个半音）`;
    return ` ${Math.round(semis)} 个半音`;
  }
  if (semis >= 11.5 && semis < 12.5) return 'about an octave';
  if (semis >= 12.5) return `more than an octave (${Math.round(semis)} semitones)`;
  return Math.round(semis) === 1 ? '1 semitone' : `${Math.round(semis)} semitones`;
}

/** Paragraphs of plain text. */
export function explain(el, lang, full, t) {
  const zh = lang === 'zh';
  const name = zh ? el.zh : el.en;
  const lines = full ? el.full : el.vis;
  if (!lines.length) {
    if (el.z >= 100) {
      return [zh
        ? `${name}只被制造出过极少量的原子，而且很快就会衰变，本应用使用的 NIST 强谱线表中没有它的谱线，所以它保持安静。`
        : `Only a handful of ${name.toLowerCase()} atoms have ever been made, and they decay quickly. The NIST strong-line tables used here list no lines for it, so it stays silent.`];
    }
    return [zh
      ? `${name}的放射性极强，同一时间只存在过极少的量。本应用使用的 NIST 强谱线表中没有它的谱线，所以它保持安静。`
      : `${name} is so radioactive that only minute amounts have ever existed at once. The NIST strong-line tables used here list no lines for it, so it stays silent.`];
  }
  const out = [];
  const sorted = [...lines].sort((a, b) => a[0] - b[0]);
  const loud = lines.reduce((a, b) => (b[1] > a[1] ? b : a));
  const fLoud = freq(loud[0]);
  const colour = t.colour(colourName(loud[0]));
  const n = lines.length;
  const lname = name.toLowerCase();
  if (n === 1) {
    out.push(zh
      ? `${name}只有一条强${full ? '' : '可见光'}谱线：${f1(loud[0])} nm 的${colour}光，降低 40 个八度后是 ${f1(fLoud)} Hz，${noteLabel(fLoud)}。`
      : `${name} has a single strong ${full ? '' : 'visible '}line: ${f1(loud[0])} nm, ${colour} light, which sounds at ${f1(fLoud)} Hz (${noteLabel(fLoud)}).`);
  } else {
    const hiF = freq(sorted[0][0]), loF = freq(sorted[n - 1][0]);
    const range = zh
      ? `从 ${f1(loF)} Hz 到 ${f1(hiF)} Hz，跨度${span(loF, hiF, true)}`
      : `from ${f1(loF)} Hz up to ${f1(hiF)} Hz — ${span(loF, hiF, false)}`;
    const loudest = zh
      ? `最响的一条是 ${f1(loud[0])} nm 的${colour}光，也就是 ${noteLabel(fLoud)}。`
      : `The loudest, ${f1(loud[0])} nm (${colour}), is ${noteLabel(fLoud)}.`;
    out.push(zh
      ? `你听到的是${name}${full ? '从紫外到红外' : ''}的 ${n} 条强${full ? '' : '可见光'}谱线，${range}。${loudest}`
      : `You are hearing ${n} strong ${full ? '' : 'visible '}lines of ${lname}${full ? ', ultraviolet to infrared,' : ','} ${range}. ${loudest}`);
  }
  const ds = doublets(lines);
  if (ds.length) {
    const d = ds.reduce((a, b) => {
      const amp = x => lines.filter(l => l[0] === x.a || l[0] === x.b).reduce((s, l) => s + l[1], 0);
      return amp(b) > amp(a) ? b : a;
    });
    const cents = Math.abs(1200 * Math.log2(freq(d.a) / freq(d.b)));
    const beat = d.beat;
    const rate = beat < 1
      ? (zh ? `大约每 ${f1(1 / beat)} 秒起伏一次` : `slowly — about once every ${f1(1 / beat)} seconds`)
      : (zh ? `每秒大约起伏 ${f1(beat)} 次` : `about ${f1(beat)} times a second`);
    out.push(zh
      ? `${f1(d.a)} nm 和 ${f1(d.b)} nm 两条线只差 ${cents.toFixed(1)} 音分，同时响起时会产生“拍”：声音${rate}。`
      : `The ${f1(d.a)} and ${f1(d.b)} nm lines are only ${cents.toFixed(1)} cents apart, so together they beat ${rate}.`);
  }
  const fact = FACT[el.s];
  if (fact) out.push(fact[zh ? 1 : 0]);
  return out;
}
