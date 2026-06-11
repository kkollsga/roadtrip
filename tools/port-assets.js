#!/usr/bin/env node
/* One-shot porter: replays the procedural asset functions from js/assets.js
   through a recording 2D-context and writes each STATIC asset as an SVG
   under assets/<category>/<name>.svg. Animated assets are ported by hand
   into assets/animated/*.js and are skipped here.

   Conventions of the emitted SVGs (the runtime renderer relies on these):
   - coordinates are recorded at s=100 with the ground anchor at (0,0),
     so y is negative upward; the viewBox is just for previewing.
   - every variant of an asset is one top-level <g class="variant">.
   - layers carry a semantic color role in `class` (foliage, trunk, rock...)
     plus a representative daylight fill so the file previews nicely;
     the runtime swaps the fill for the live biome/depth/light color.
   - literal rgba()/# fills without a class stay literal at runtime. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* ---- load util.js + assets.js the way a browser would ---- */
global.window = {};
eval(fs.readFileSync(path.join(ROOT, 'js/util.js'), 'utf8'));
global.U = window.U;
eval(fs.readFileSync(path.join(ROOT, 'tools/legacy/assets.js'), 'utf8'));
const Assets = window.Assets;

const TAU = Math.PI * 2;
const r2 = v => Math.round(v * 100) / 100;

/* representative daylight colors per role, used as preview fills */
const ROLE_COLORS = {
  foliage: '#55844a', foliage2: '#6f9c54', trunk: '#6b5340',
  dark: '#3c3a36', light: '#e6e2d4', accent: '#9a4538',
  pink: '#f0b6c9', pink2: '#e094b2', fill: '#c08a5e', strata: '#a07048',
  ice: '#dfe8f2', shade: '#9fc0d8', deep: '#2a4660',
  rock: '#8c9cb2', snow: '#eef3f8', shadow: '#5c6a7e',
  warm: '#b4593a', green: '#2f6b46',
};
const ROLE_TOKEN = 'ROLE:';
const cTok = new Proxy({}, {
  get: (t, k) => (k === 'glowA' || k === 'poolDY') ? 0 : ROLE_TOKEN + String(k),
});

/* ---------------- the recording 2D context ---------------- */
class Rec {
  constructor() {
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.fillStyle = '#000'; this.strokeStyle = '#000';
    this.lineWidth = 1; this.globalAlpha = 1;
    this.lineCap = 'butt'; this.lineJoin = 'miter';
    this.path = []; this.cur = null; this.start = null;
    this.els = []; this.defs = [];
    this.clipStack = []; this.clipN = 0;
    this.bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  }
  /* --- transforms --- */
  save() {
    this.stack.push({
      m: this.m.slice(), fillStyle: this.fillStyle, strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth, globalAlpha: this.globalAlpha,
      lineCap: this.lineCap, lineJoin: this.lineJoin, clip: this.clipStack.slice(),
    });
  }
  restore() {
    const s = this.stack.pop();
    if (!s) return;
    this.m = s.m; this.fillStyle = s.fillStyle; this.strokeStyle = s.strokeStyle;
    this.lineWidth = s.lineWidth; this.globalAlpha = s.globalAlpha;
    this.lineCap = s.lineCap; this.lineJoin = s.lineJoin; this.clipStack = s.clip;
  }
  _mul(n) {
    const m = this.m;
    this.m = [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ];
  }
  translate(x, y) { this._mul([1, 0, 0, 1, x, y]); }
  scale(x, y) { this._mul([x, 0, 0, y === undefined ? x : y, 0, 0]); }
  rotate(a) { const c = Math.cos(a), s = Math.sin(a); this._mul([c, s, -s, c, 0, 0]); }
  _scaleMag() { return Math.sqrt(Math.abs(this.m[0] * this.m[3] - this.m[1] * this.m[2])); }
  _pt(x, y) {
    const m = this.m;
    const X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5];
    if (X < this.bb.x0) this.bb.x0 = X; if (X > this.bb.x1) this.bb.x1 = X;
    if (Y < this.bb.y0) this.bb.y0 = Y; if (Y > this.bb.y1) this.bb.y1 = Y;
    return r2(X) + ' ' + r2(Y);
  }
  /* --- path building (output space; transforms flattened) --- */
  beginPath() { this.path = []; this.cur = null; this.start = null; }
  moveTo(x, y) { this.path.push('M' + this._pt(x, y)); this.cur = [x, y]; this.start = [x, y]; }
  lineTo(x, y) {
    if (!this.cur) return this.moveTo(x, y);
    this.path.push('L' + this._pt(x, y)); this.cur = [x, y];
  }
  quadraticCurveTo(cx, cy, x, y) {
    if (!this.cur) this.moveTo(cx, cy);
    this.path.push('Q' + this._pt(cx, cy) + ' ' + this._pt(x, y)); this.cur = [x, y];
  }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
    if (!this.cur) this.moveTo(c1x, c1y);
    this.path.push('C' + this._pt(c1x, c1y) + ' ' + this._pt(c2x, c2y) + ' ' + this._pt(x, y));
    this.cur = [x, y];
  }
  closePath() { this.path.push('Z'); if (this.start) this.cur = this.start.slice(); }
  rect(x, y, w, h) {
    this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h);
    this.lineTo(x, y + h); this.closePath();
  }
  /* arcs become cubic beziers in local space, then get flattened */
  ellipse(cx, cy, rx, ry, rot, a0, a1, ccw) {
    const cosR = Math.cos(rot || 0), sinR = Math.sin(rot || 0);
    const P = th => [
      cx + rx * Math.cos(th) * cosR - ry * Math.sin(th) * sinR,
      cy + rx * Math.cos(th) * sinR + ry * Math.sin(th) * cosR,
    ];
    const D = th => [ // derivative wrt th
      -rx * Math.sin(th) * cosR - ry * Math.cos(th) * sinR,
      -rx * Math.sin(th) * sinR + ry * Math.cos(th) * cosR,
    ];
    let d = a1 - a0;
    if (!ccw) { if (d >= TAU) d = TAU; else d = ((d % TAU) + TAU) % TAU; }
    else { if (-d >= TAU) d = -TAU; else { d = ((d % TAU) - TAU) % TAU; if (d === 0) d = -0; } }
    const p0 = P(a0);
    if (this.cur) this.lineTo(p0[0], p0[1]); else this.moveTo(p0[0], p0[1]);
    const n = Math.max(1, Math.ceil(Math.abs(d) / (Math.PI / 2)));
    const step = d / n;
    const k = (4 / 3) * Math.tan(step / 4);
    for (let i = 0; i < n; i++) {
      const t0 = a0 + i * step, t1 = t0 + step;
      const s0 = P(t0), s1 = P(t1), d0 = D(t0), d1 = D(t1);
      this.path.push('C'
        + this._pt(s0[0] + k * d0[0], s0[1] + k * d0[1]) + ' '
        + this._pt(s1[0] - k * d1[0], s1[1] - k * d1[1]) + ' '
        + this._pt(s1[0], s1[1]));
      this.cur = [s1[0], s1[1]];
    }
  }
  arc(cx, cy, r, a0, a1, ccw) { this.ellipse(cx, cy, r, r, 0, a0, a1, ccw); }
  arcTo(x1, y1, x2, y2, r) {
    if (!this.cur) return this.moveTo(x1, y1);
    const [x0, y0] = this.cur;
    const v1 = [x0 - x1, y0 - y1], v2 = [x2 - x1, y2 - y1];
    const l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
    if (l1 < 1e-6 || l2 < 1e-6 || r < 1e-6) return this.lineTo(x1, y1);
    const a = Math.acos(U.clamp((v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2), -1, 1));
    if (a < 1e-4 || Math.abs(a - Math.PI) < 1e-4) return this.lineTo(x1, y1);
    const t = r / Math.tan(a / 2); // tangent distance from corner
    const t1 = [x1 + v1[0] / l1 * t, y1 + v1[1] / l1 * t];
    const t2 = [x1 + v2[0] / l2 * t, y1 + v2[1] / l2 * t];
    // arc center: offset perpendicular from t1 toward the corner's interior
    const cross = v1[0] * v2[1] - v1[1] * v2[0];
    const sgn = cross > 0 ? 1 : -1;
    const n1 = [-v1[1] / l1 * sgn, v1[0] / l1 * sgn];
    const c = [t1[0] + n1[0] * r, t1[1] + n1[1] * r];
    const ang1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]);
    const ang2 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
    this.lineTo(t1[0], t1[1]);
    this.arc(c[0], c[1], r, ang1, ang2, sgn < 0);
  }
  /* --- consumers --- */
  _style(kind) {
    const src = kind === 'fill' ? this.fillStyle : this.strokeStyle;
    if (typeof src === 'string' && src.startsWith(ROLE_TOKEN)) {
      const role = src.slice(ROLE_TOKEN.length);
      return { cls: role, color: ROLE_COLORS[role] || '#888' };
    }
    return { cls: null, color: src };
  }
  _emit(kind, d) {
    const { cls, color } = this._style(kind);
    const el = { kind, d, cls, color, alpha: this.globalAlpha };
    if (kind === 'stroke') {
      el.lw = r2(this.lineWidth * this._scaleMag());
      el.cap = this.lineCap; el.join = this.lineJoin;
    }
    if (this.clipStack.length) el.clip = this.clipStack[this.clipStack.length - 1];
    this.els.push(el);
  }
  fill() { if (this.path.length) this._emit('fill', this.path.join('')); }
  stroke() { if (this.path.length) this._emit('stroke', this.path.join('')); }
  fillRect(x, y, w, h) {
    const keep = { path: this.path, cur: this.cur, start: this.start };
    this.beginPath(); this.rect(x, y, w, h); this.fill();
    this.path = keep.path; this.cur = keep.cur; this.start = keep.start;
  }
  strokeRect(x, y, w, h) {
    const keep = { path: this.path, cur: this.cur, start: this.start };
    this.beginPath(); this.rect(x, y, w, h); this.stroke();
    this.path = keep.path; this.cur = keep.cur; this.start = keep.start;
  }
  clip() {
    const id = 'clip' + (this.clipN++);
    this.defs.push(`<clipPath id="${id}"><path d="${this.path.join('')}"/></clipPath>`);
    this.clipStack = this.clipStack.concat(id);
  }
  createLinearGradient() { throw new Error('gradient: this asset must stay procedural'); }
  createRadialGradient() { throw new Error('gradient: this asset must stay procedural'); }
  setLineDash() { throw new Error('dash: this asset must stay procedural'); }
}

/* ---------------- emit one asset ---------------- */
function attr(el) {
  let s = '';
  if (el.cls) s += ` class="${el.cls}"`;
  if (el.kind === 'fill') {
    s += ` fill="${el.color}"`;
    if (el.alpha < 1) s += ` fill-opacity="${r2(el.alpha)}"`;
  } else {
    s += ` fill="none" stroke="${el.color}" stroke-width="${el.lw}"`;
    if (el.alpha < 1) s += ` stroke-opacity="${r2(el.alpha)}"`;
    if (el.cap !== 'butt') s += ` stroke-linecap="${el.cap}"`;
    if (el.join !== 'miter') s += ` stroke-linejoin="${el.join}"`;
  }
  if (el.clip) s += ` clip-path="url(#${el.clip})"`;
  return s;
}

function recordVariant(name, vv, spec) {
  const rec = new Rec();
  const fn = Assets[name];
  if (spec === 'wh') fn(rec, 0, 0, 280, 100, cTok, vv);
  else if (spec === 'pole') fn(rec, 0, 0, 100, cTok);
  else fn(rec, 0, 0, 100, cTok, vv, 0);
  return rec;
}

function portAsset(name, cat, variants, spec) {
  const recs = variants.map(vv => recordVariant(name, vv, spec));
  const bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  recs.forEach(r => {
    bb.x0 = Math.min(bb.x0, r.bb.x0); bb.y0 = Math.min(bb.y0, r.bb.y0);
    bb.x1 = Math.max(bb.x1, r.bb.x1); bb.y1 = Math.max(bb.y1, r.bb.y1);
  });
  const pad = 2;
  const vb = `${r2(bb.x0 - pad)} ${r2(bb.y0 - pad)} ${r2(bb.x1 - bb.x0 + pad * 2)} ${r2(bb.y1 - bb.y0 + pad * 2)}`;
  const defs = recs.flatMap(r => r.defs);
  const groups = recs.map(r =>
    '  <g class="variant">\n'
    + r.els.map(el => `    <path${attr(el)} d="${el.d}"/>`).join('\n')
    + '\n  </g>');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">\n`
    + (defs.length ? '  <defs>' + defs.join('') + '</defs>\n' : '')
    + groups.join('\n') + '\n</svg>\n';
  const dir = path.join(ROOT, 'assets', cat);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.svg'), svg);
  return recs.reduce((n, r) => n + r.els.length, 0);
}

/* ---------------- the catalog ---------------- */
const FLORA_V = [0.12, 0.5, 0.88];
const PAIR_V = [0.2, 0.65];
const ONE_V = [0.3];
const CATALOG = [
  ['flora', FLORA_V, ['pine', 'roundTree', 'birch', 'deadTree', 'cactus', 'palm',
    'bush', 'tuft', 'fern', 'redwood', 'redwoodTrunk', 'canopyTree', 'sakura']],
  ['terrain', PAIR_V, ['rock', 'iceberg', 'floe']],
  ['terrain', PAIR_V, ['mesa'], 'wh'],
  ['structures', PAIR_V, ['sign', 'torii']],
  ['structures', ONE_V, ['pole'], 'pole'],
  ['landmarks', ONE_V, ['sugarloaf', 'glacier', 'halfDome', 'devilsTower',
    'bryceHoodoos', 'kilimanjaro', 'fuji', 'matterhorn', 'everest', 'denali',
    'monumentValley', 'delicateArch', 'uluru', 'namibDune', 'hawaii']],
];

if (require.main === module) {
  let total = 0, files = 0;
  for (const [cat, variants, names, spec] of CATALOG) {
    for (const name of names) {
      try {
        total += portAsset(name, cat, variants, spec);
        files++;
      } catch (e) {
        console.error(`SKIP ${name}: ${e.message}`);
      }
    }
  }
  console.log(`ported ${files} assets (${total} layers) into assets/`);
}

module.exports = { Rec, Assets, ROLE_TOKEN, ROLE_COLORS, attr, r2 };
