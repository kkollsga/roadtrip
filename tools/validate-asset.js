#!/usr/bin/env node
/* Validates asset SVGs against the conventions in assets/README.md.
   Usage: node tools/validate-asset.js [assets/flora/pine.svg ...]
   With no arguments, validates every SVG under assets/. Exits non-zero on
   any failure — run this before considering an asset edit done. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const ROLES = new Set(['foliage', 'foliage2', 'trunk', 'dark', 'light',
  'accent', 'pink', 'pink2', 'fill', 'strata', 'ice', 'shade', 'deep',
  'rock', 'snow', 'shadow', 'warm', 'green', 'tan', 'brown', 'gray', 'window']);
const SHAPES = new Set(['path']);

let files = process.argv.slice(2);
if (!files.length) {
  for (const cat of ['flora', 'fauna', 'terrain', 'structures', 'landmarks']) {
    const dir = path.join(ROOT, 'assets', cat);
    if (!fs.existsSync(dir)) continue;
    files.push(...fs.readdirSync(dir).filter(f => f.endsWith('.svg'))
      .map(f => path.join('assets', cat, f)));
  }
}

let failures = 0;
const fail = (f, msg) => { console.error(`FAIL ${f}: ${msg}`); failures++; };

for (const rel of files) {
  const f = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  const src = fs.readFileSync(f, 'utf8');
  const isLandmark = f.includes('/landmarks/');

  if (!isLandmark) {
    const m = src.match(/data-meters="([\d.]+)\s+([\d.]+)"/);
    if (!m) { fail(rel, 'missing data-meters="min max" on the svg root'); continue; }
    const [lo, hi] = [parseFloat(m[1]), parseFloat(m[2])];
    if (!(lo > 0 && hi >= lo && hi < 400)) fail(rel, `implausible data-meters ${lo} ${hi}`);
  }
  if (/transform=/.test(src)) fail(rel, 'transform attributes are not supported — flatten the geometry');
  if (!/viewBox="/.test(src)) fail(rel, 'missing viewBox');

  const variants = src.match(/<g class="variant">/g) || [];
  if (!variants.length) fail(rel, 'no <g class="variant"> groups');

  // every drawable element must be a flat <path>; roles must be known
  const shapeTags = [...src.matchAll(/<(rect|circle|ellipse|polygon|polyline|line)\b/g)];
  if (shapeTags.length) fail(rel, `convert <${shapeTags[0][1]}> to <path> (runtime parses paths only)`);
  for (const cls of src.matchAll(/<path[^>]*class="([^"]+)"/g)) {
    if (!ROLES.has(cls[1])) fail(rel, `unknown color role class "${cls[1]}"`);
  }
  const body = src.replace(/<defs>[\s\S]*?<\/defs>/g, ''); // clip defs carry no paint
  for (const p of body.matchAll(/<path\b[^>]*>/g)) {
    if (!/ d="/.test(p[0])) fail(rel, 'a <path> is missing its d attribute');
    if (!/class="/.test(p[0]) && !/fill="(rgba?\(|#|none)/.test(p[0]) && !/stroke="/.test(p[0])) {
      fail(rel, 'a classless <path> must carry a literal fill/stroke');
    }
  }
  // ground anchor sanity: the geometry's bottom should sit near y=0
  // (every coordinate pair counts — curves too; water assets may keel below)
  const ys = [...body.matchAll(/ d="([^"]+)"/g)].flatMap(d =>
    [...d[1].matchAll(/(-?[\d.]+)[,\s](-?[\d.]+)/g)].map(m2 => parseFloat(m2[2])));
  if (ys.length) {
    const maxY = Math.max(...ys);
    if (maxY < -8) fail(rel, `geometry floats above the ground anchor (max y ${maxY}; bottom should be near 0)`);
    if (maxY > 25) fail(rel, `geometry sinks below the ground anchor (max y ${maxY})`);
  }
}
console.log(failures ? `${failures} failure(s)` : `all ${files.length} files pass`);
process.exit(failures ? 1 : 0);
