#!/usr/bin/env node
/* Roadtrip build: compiles the editable sources
     biomes/*.yaml            biome definitions (friendly schema)
     assets/{flora,terrain,structures,landmarks}/*.svg   static assets
     assets/animated/*.js     animated assets (plain JS modules)
   into two checked-in generated files
     js/gen/data.js           window.GEN = { svgs, biomes }
     js/gen/animated.js       concatenated animated asset modules
   so index.html keeps working straight off the disk (file://) with no
   runtime fetching or parsing dependencies.

   Usage:  node tools/build.js [--watch]                                  */
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const GEN = path.join(ROOT, 'js', 'gen');

/* ---------------- biome compilation (friendly YAML -> engine fields) --- */
/* defaults applied when a biome omits a field (mirrors the old mk()) */
const DEFAULTS = {
  far: '#7d92aa', mid: '#8fae70', ground: '#79a35d',
  fol: '#55844a', fol2: '#6f9c54', trunk: '#6b5340',
  farAmp: 0.10, midAmp: 0.06, ridged: 0, snowcap: 0,
  water: 0, lake: 0, waterCol: '#3c6f95', aurora: 0, occluder: 0,
  landmarks: [], grade: { tint: '#ffffff', s: 0, lm: 1 },
  avenue: 'roundTree',
  seasonal: 0.5, // how strongly the flora follows the seasons
  clustering: 0.8, // 1 = tight copses with open gaps, 0 = continuous cover
  density: 3, items: [['roundTree', 1]],
  fgDensity: 2, fgItems: [['tuft', 1]],
  midDensity: 0, midItems: null,
  horizonDensity: 0, horizonItems: null,
  forestDepth: 0, depthItems: [['pine', 0.6], ['roundTree', 0.4]],
  windfarm: 0,
  tempHi: 18, tempLo: -2, // warmest / coldest mean daytime C
  homeLat: 45,            // implied latitude of the region, degrees north
  weather: [['clear', 5], ['overcast', 2], ['rain', 1.5], ['fog', 0.8]],
};

/* weighted table -> cumulative entries [asset, cum] / [asset, cum, z0, z1] */
function compileTable(table) {
  if (!table) return null;
  let tot = 0;
  table.forEach(e => { tot += e.w; });
  let acc = 0;
  return table.map(e => {
    acc += e.w;
    const out = [e.asset, acc / tot];
    if (e.depth) out.push(e.depth[0], e.depth[1]);
    return out;
  });
}

/* one friendly group (possibly partial, for variants) -> flat engine keys */
function flatten(doc) {
  const out = {};
  const t = doc.terrain || {};
  for (const k of ['far', 'mid', 'ground', 'farAmp', 'midAmp', 'ridged', 'snowcap', 'water', 'lake', 'waterCol']) {
    if (k in t) out[k] = t[k];
  }
  const f = doc.flora || {};
  if ('foliage' in f) out.fol = f.foliage;
  if ('seasonal' in f) out.seasonal = f.seasonal;
  if ('clustering' in f) out.clustering = f.clustering;
  if ('foliage2' in f) out.fol2 = f.foliage2;
  if ('trunk' in f) out.trunk = f.trunk;
  if ('avenue' in f) out.avenue = f.avenue;
  const l = doc.light || {};
  if (l.grade) out.grade = { tint: l.grade.tint, s: l.grade.strength, lm: l.grade.multiplier };
  if ('aurora' in l) out.aurora = l.aurora;
  if (doc.weather) out.weather = Object.entries(doc.weather);
  if (doc.climate) { out.tempHi = doc.climate.summer; out.tempLo = doc.climate.winter; }
  if ('latitude' in doc) out.homeLat = doc.latitude;
  const band = (g, dKey, tKey, dName) => {
    if (!g) return;
    if ((dName || 'density') in g) out[dKey] = g[dName || 'density'];
    if (g.table) out[tKey] = compileTable(g.table);
  };
  band(doc.near, 'density', 'items');
  band(doc.front, 'fgDensity', 'fgItems');
  band(doc.midridge, 'midDensity', 'midItems');
  band(doc.horizon, 'horizonDensity', 'horizonItems'); // far set pieces (mesas)
  band(doc.forest, 'forestDepth', 'depthItems', 'depth');
  const x = doc.extras || {};
  if ('landmarks' in x) out.landmarks = x.landmarks;
  if ('occluder' in x) out.occluder = x.occluder;
  if ('windfarm' in x) out.windfarm = x.windfarm;
  if ('baseWeight' in x) out.baseW = x.baseWeight;
  return out;
}

function compileBiomes() {
  const docs = fs.readdirSync(path.join(ROOT, 'biomes'))
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map(f => yaml.load(fs.readFileSync(path.join(ROOT, 'biomes', f), 'utf8')));
  docs.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const biomes = {};
  for (const doc of docs) {
    const def = Object.assign({}, DEFAULTS, flatten(doc));
    if (doc.variants) {
      def.variants = doc.variants.map(v => {
        const { key, weight, ...groups } = v;
        return [Object.assign({ key }, flatten(groups)), weight];
      });
    }
    biomes[doc.name] = def;
  }
  return biomes;
}

/* ---------------- asset collection ---------------- */
function collectSvgs() {
  const svgs = {}, sizes = {};
  for (const cat of ['flora', 'fauna', 'terrain', 'structures', 'landmarks']) {
    const dir = path.join(ROOT, 'assets', cat);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.svg')) continue;
      const name = f.slice(0, -4);
      if (svgs[name]) throw new Error(`duplicate asset name: ${name}`);
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      // real-world height range in meters: data-meters="min max" on the root
      const m = src.match(/data-meters="([\d.]+)\s+([\d.]+)"/);
      if (m) sizes[name] = [parseFloat(m[1]), parseFloat(m[2])];
      else if (cat !== 'landmarks') {
        throw new Error(`${cat}/${name}.svg is missing data-meters="min max"`);
      }
      svgs[name] = src.replace(/\n\s*/g, ' ').trim();
    }
  }
  return { svgs, sizes };
}

function collectAnimated() {
  const dir = path.join(ROOT, 'assets', 'animated');
  return fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()
    .map(f => `/* ==== assets/animated/${f} ==== */\n`
      + fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n');
}

/* ---------------- emit ---------------- */
function build() {
  const t0 = Date.now();
  const { svgs, sizes } = collectSvgs();
  const biomes = compileBiomes();
  fs.mkdirSync(GEN, { recursive: true });
  fs.writeFileSync(path.join(GEN, 'data.js'),
    '/* GENERATED by tools/build.js — edit assets/ and biomes/, not this file. */\n'
    + 'window.GEN = ' + JSON.stringify({ svgs, sizes, biomes }) + ';\n');
  fs.writeFileSync(path.join(GEN, 'animated.js'),
    '/* GENERATED by tools/build.js — edit assets/animated/, not this file. */\n'
    + collectAnimated());
  console.log(`built js/gen/ (${Object.keys(svgs).length} svgs, `
    + `${Object.keys(biomes).length} biomes) in ${Date.now() - t0}ms`);
}

build();
if (process.argv.includes('--watch')) {
  let timer = null;
  const queue = () => { clearTimeout(timer); timer = setTimeout(() => {
    try { build(); } catch (e) { console.error('build failed:', e.message); }
  }, 120); };
  for (const dir of ['assets', 'biomes']) {
    fs.watch(path.join(ROOT, dir), { recursive: true }, queue);
  }
  console.log('watching assets/ and biomes/ ...');
}
