#!/usr/bin/env node
/* One-shot porter for the glow-window buildings (cabin, barn, teahouse,
   pagoda): records each legacy draw function TWICE — windows dark
   (glowA=0) and windows lit (glowA=1, time undefined so cabin smoke is
   skipped) — and marks every layer whose paint differs between the two
   runs as class="window". The runtime draws window layers dark by day
   and blends in the warm glow as night falls; cabin chimney smoke lives
   on as a tiny overlay in assets/animated/smoke.js. */
'use strict';
const fs = require('fs');
const path = require('path');
const { Rec, Assets, ROLE_TOKEN, attr, r2 } = require('./port-assets.js');

const ROOT = path.join(__dirname, '..');

const BUILDINGS = {
  cabin: { meters: '4 6', variants: [0.2, 0.65] },   // log + falu-red painted
  barn: { meters: '6 10', variants: [0.2, 0.65] },
  teahouse: { meters: '4 6', variants: [0.2, 0.65] },
  pagoda: { meters: '18 30', variants: [0.2, 0.65] },
};

const mkTok = glow => new Proxy({}, {
  get: (t, k) => (k === 'glowA' || k === 'poolDY') ? glow : ROLE_TOKEN + String(k),
});

function record(name, vv, glow) {
  const rec = new Rec();
  Assets[name](rec, 0, 0, 100, mkTok(glow), vv, undefined);
  return rec;
}

let files = 0;
for (const [name, cfg] of Object.entries(BUILDINGS)) {
  const recs = cfg.variants.map(vv => {
    const dark = record(name, vv, 0);
    const lit = record(name, vv, 1);
    // align the two runs on geometry: a layer that only exists when lit,
    // or that changes paint when lit, is a glow-reactive window pane
    const els = [];
    let i = 0;
    for (const L of lit.els) {
      if (i < dark.els.length && dark.els[i].d === L.d) {
        const D = dark.els[i++];
        if (D.color !== L.color || D.cls !== L.cls) {
          D.cls = 'window';
          D.color = '#3c3a36';
        }
        els.push(D);
      } else {
        els.push(Object.assign({}, L, { cls: 'window', color: '#3c3a36', alpha: 1 }));
      }
    }
    if (i !== dark.els.length) throw new Error(`${name}: dark/lit runs failed to align`);
    lit.els = els;
    return lit;
  });
  const bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  recs.forEach(r => {
    bb.x0 = Math.min(bb.x0, r.bb.x0); bb.y0 = Math.min(bb.y0, r.bb.y0);
    bb.x1 = Math.max(bb.x1, r.bb.x1); bb.y1 = Math.max(bb.y1, r.bb.y1);
  });
  const vb = `${r2(bb.x0 - 2)} ${r2(bb.y0 - 2)} ${r2(bb.x1 - bb.x0 + 4)} ${r2(bb.y1 - bb.y0 + 4)}`;
  const groups = recs.map(r =>
    '  <g class="variant">\n'
    + r.els.map(el => `    <path${attr(el)} d="${el.d}"/>`).join('\n')
    + '\n  </g>');
  const svg = `<svg data-meters="${cfg.meters}" xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">\n`
    + groups.join('\n') + '\n</svg>\n';
  fs.writeFileSync(path.join(ROOT, 'assets/structures', name + '.svg'), svg);
  files++;
}
console.log(`ported ${files} buildings into assets/structures/`);
