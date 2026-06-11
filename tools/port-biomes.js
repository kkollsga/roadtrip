#!/usr/bin/env node
/* One-shot porter: lifts the inline biome definitions out of js/scene.js and
   writes one friendly YAML per biome into biomes/. After this, biomes/*.yaml
   are the source of truth and tools/build.js compiles them back into engine
   profiles (js/gen/data.js). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---- extract and evaluate the `const B = {...};` block ---- */
const src = fs.readFileSync(path.join(ROOT, 'js/scene.js'), 'utf8');
const start = src.indexOf('  const B = {');
const end = src.indexOf('\n  };', start);
if (start < 0 || end < 0) throw new Error('biome block not found');
const block = src.slice(start, end + 5);
const C = h => h;                 // keep hex strings
const tbl = pairs => pairs;       // keep raw [asset, weight] pairs
const mk = d => d;                // keep only the explicit fields
const B = eval('(' + block.replace('const B = {', '{').replace(/;\s*$/, '') + ')');

/* ---- friendly-structure mapping (mirrored in tools/build.js) ---- */
const GROUPS = {
  terrain: ['far', 'mid', 'ground', 'farAmp', 'midAmp', 'ridged', 'snowcap', 'water', 'waterCol'],
  flora: { fol: 'foliage', fol2: 'foliage2', trunk: 'trunk', avenue: 'avenue' },
  extras: { landmarks: 'landmarks', occluder: 'occluder', windfarm: 'windfarm', baseW: 'baseWeight' },
};
function friendly(def) {
  const out = {};
  const put = (group, key, val) => {
    out[group] = out[group] || {};
    out[group][key] = val;
  };
  for (const k of GROUPS.terrain) if (k in def) put('terrain', k, def[k]);
  for (const [k, fk] of Object.entries(GROUPS.flora)) if (k in def) put('flora', fk, def[k]);
  if ('grade' in def) put('light', 'grade',
    { tint: def.grade.tint, strength: def.grade.s, multiplier: def.grade.lm });
  if ('aurora' in def) put('light', 'aurora', def.aurora);
  if ('weather' in def) out.weather = Object.fromEntries(def.weather);
  const band = (g, dKey, tKey, dName) => {
    if (def[dKey] !== undefined) put(g, dName || 'density', def[dKey]);
    if (def[tKey]) put(g, 'table', def[tKey].map(([asset, w]) => ({ asset, w })));
  };
  band('near', 'density', 'items');
  band('front', 'fgDensity', 'fgItems');
  band('midridge', 'midDensity', 'midItems');
  band('forest', 'forestDepth', 'depthItems', 'depth');
  for (const [k, fk] of Object.entries(GROUPS.extras)) if (k in def) put('extras', fk, def[k]);
  return out;
}

/* ---- tiny YAML emitter (porter only; build.js reads with js-yaml) ---- */
const yval = v => {
  if (typeof v === 'string') return /^[a-zA-Z][\w]*$/.test(v) ? v : `'${v}'`;
  return String(v);
};
function yml(o, ind) {
  const pad = '  '.repeat(ind);
  let s = '';
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v)) {
      if (!v.length) { s += `${pad}${k}: []\n`; continue; }
      s += `${pad}${k}:\n`;
      for (const e of v) {
        if (e && typeof e === 'object' && !Array.isArray(e)) {
          const simple = Object.values(e).every(x =>
            typeof x !== 'object' || (Array.isArray(x) && x.every(y => typeof y !== 'object')));
          if (simple) {
            const inline = Object.entries(e)
              .map(([ek, ev]) => `${ek}: ${Array.isArray(ev) ? '[' + ev.join(', ') + ']' : yval(ev)}`)
              .join(', ');
            s += `${pad}  - { ${inline} }\n`;
          } else { // block form: "- key: v" then the rest indented
            const lines = yml(e, ind + 2).split('\n');
            lines[0] = lines[0].replace(/^(\s*)/, m => m.slice(2) + '- ');
            s += lines.join('\n');
          }
        } else s += `${pad}  - ${yval(e)}\n`;
      }
    } else if (v && typeof v === 'object') {
      const entries = Object.entries(v);
      const flat = entries.every(([, x]) => typeof x !== 'object' || x === null);
      if (flat && entries.length <= 4 && ind > 0) {
        s += `${pad}${k}: { ${entries.map(([a, b]) => `${a}: ${yval(b)}`).join(', ')} }\n`;
      } else {
        s += `${pad}${k}:\n` + yml(v, ind + 1);
      }
    } else s += `${pad}${k}: ${yval(v)}\n`;
  }
  return s;
}

const HEADER = `# Roadtrip biome definition. Compiled by \`node tools/build.js\` into
# js/gen/data.js — run the build (or its --watch mode) after editing.
#
# colors are full-daylight bases; the engine grades them per frame by time
# of day, depth haze, vibrance and weather. Bands:
#   near     items between the tree line and the road shoulder (depth-staggered)
#   front    items in front of the road, nearest the camera
#   midridge rare structures on the mid ridge (mesas, lighthouses...)
#   forest   distant wooded bands; depth = how deep the woods reach
# table entries: { asset, w } plus optional depth: [z0, z1] limiting the item
# to a slice of the band (0 = far edge, 1 = nearest).
`;

const dir = path.join(ROOT, 'biomes');
fs.mkdirSync(dir, { recursive: true });
let order = 0;
for (const [name, def] of Object.entries(B)) {
  const f = friendly(def);
  const doc = { name, order: order++, ...f };
  if (def.variants) {
    doc.variants = def.variants.map(([ov, weight]) => {
      const { key, ...rest } = ov;
      return { key, weight, ...friendly(rest) };
    });
  }
  fs.writeFileSync(path.join(dir, name + '.yaml'), HEADER + yml(doc, 0));
  console.log('biomes/' + name + '.yaml');
}
