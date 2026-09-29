// Typing element symbols on the keyboard: "n" plays N at once; "n" then "a" (quickly) switches to Na.

export function symbolTyper(app, pick) {
  let last = null; // { ch, t, single }
  return key => {
    const c = key.toLowerCase();
    const now = performance.now();
    if (last && now - last.t < 900) {
      const two = last.ch.toUpperCase() + c;
      if (app.bySym.has(two)) {
        if (last.single) app.stop(last.single);
        last = null;
        pick(two);
        return;
      }
    }
    const one = c.toUpperCase();
    last = { ch: c, t: now, single: app.bySym.has(one) ? one : null };
    if (last.single) pick(one);
  };
}

export const isLetterKey = e => e.key && e.key.length === 1 && /[a-z]/i.test(e.key);
