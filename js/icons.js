// Line icons, 24 × 24, drawn in currentColor. Decorative: the button around each one carries the label.

const svg = (body, fill = false) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" ${
    fill ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
  }>${body}</svg>`;

const sq = (x, y) => `<rect x="${x}" y="${y}" width="3" height="3" rx=".7"/>`;

export const ICON = {
  // a tiny periodic table: tall outer groups, the d-block dip, the f-block rows below
  table: svg(
    [[2.6, 3.6], [18.4, 3.6], [2.6, 7.5], [6.5, 7.5], [14.5, 7.5], [18.4, 7.5],
     [2.6, 11.4], [6.5, 11.4], [10.5, 11.4], [14.5, 11.4], [18.4, 11.4],
     [6.5, 16.8], [10.5, 16.8], [14.5, 16.8]].map(([x, y]) => sq(x, y)).join(''), true),
  ear: svg('<path d="M6.8 9.6a5.2 5.2 0 0 1 10.4 0c0 3.1-2.5 3.8-3.3 5.6-.8 1.7-.7 4.3-3.3 4.3a2.9 2.9 0 0 1-2.9-2.6"/><path d="M9.6 10a2.4 2.4 0 0 1 4.8 0c0 1.5-1.7 1.7-1.9 3.1"/>'),
  spell: svg('<path d="M2.8 18.5 7.3 5.6h1.1l4.5 12.9M4.4 14h7.2"/><path d="M15.6 5.2v13.3"/><circle cx="18.5" cy="15.3" r="3.1"/>'),
  about: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 10.8v5.6"/><circle cx="12" cy="7.7" r=".4" fill="currentColor"/>'),
  replay: svg('<path d="M4.6 12.4a7.4 7.4 0 1 0 2.3-5.6"/><path d="M4.4 4.3v3.9h3.9"/>'),
  // strum: the lines start one after another (staggered); chord: all at once (aligned)
  strum: svg('<path d="M5 13.5v6M9.7 10.8v6M14.3 8.1v6M19 5.4v6"/>'),
  chord: svg('<path d="M5 7v10M9.7 7v10M14.3 7v10M19 7v10"/>'),
  open: svg('<path d="M7.5 16.5 16.5 7.5M9.2 7.5h7.3v7.3"/>'),
  share: svg('<path d="M12 14.5V3.8M8 7.6l4-3.8 4 3.8"/><path d="M8.4 11H6.5v9h11v-9h-1.9"/>'),
  link: svg('<path d="M10.4 13.6a3.6 3.6 0 0 0 5.1 0l3-3a3.6 3.6 0 0 0-5.1-5.1l-1 1"/><path d="M13.6 10.4a3.6 3.6 0 0 0-5.1 0l-3 3a3.6 3.6 0 0 0 5.1 5.1l1-1"/>'),
  image: svg('<rect x="3.8" y="4.8" width="16.4" height="14.4" rx="2.2"/><circle cx="9" cy="10" r="1.6"/><path d="m4.4 17.6 4.8-4.4 3.6 3.1 2.9-2.4 4.1 3.5"/>'),
  play: svg('<path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.8-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z"/>', true),
  back: svg('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
  prev: svg('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
  next: svg('<path d="M9.5 5.5 16 12l-6.5 6.5"/>'),
  forward: svg('<path d="M4.5 12h14.5M13.5 6.5 19 12l-5.5 5.5"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  cross: svg('<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>'),
};

/** The Elementa mark: hydrogen's four Balmer lines on the app's axis (red left, violet right). */
export const MARK = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
<rect x="4.6" y="4" width="1.8" height="16" rx=".9" fill="#ff2a1a"/>
<rect x="13.4" y="6.5" width="1.8" height="11" rx=".9" fill="#00c8ff"/>
<rect x="16.8" y="8" width="1.8" height="8" rx=".9" fill="#4f5bff"/>
<rect x="19.6" y="9" width="1.8" height="6" rx=".9" fill="#8a3cff"/></svg>`;
