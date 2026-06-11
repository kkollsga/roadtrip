# Assets

Every piece of scenery is an individual file here. After editing anything,
run `npm run build` (or keep `npm run watch` running) to regenerate
`js/gen/` — the page loads only those generated files, so it keeps working
straight off the disk.

```
flora/        trees, bushes, grass        (static SVG)
fauna/        giraffes, elephants, ...    (static SVG; tan/brown/gray roles)
terrain/      rocks, mesas, ice           (static SVG)
structures/   poles, signs, torii         (static SVG)
landmarks/    famous silhouettes          (static SVG)
animated/     turbine, lighthouse, ...    (plain JS modules)
unprocessed/  raw source material awaiting extraction (never built)
```

## Static SVG conventions

The runtime (`js/svg-render.js`) parses each SVG once at boot into `Path2D`
layers and replays them per frame with live colors — so these rules matter:

- **Geometry is authored at height ≈ 100 with the ground anchor at (0, 0)**;
  y is negative upward. The `viewBox` is only for previewing the file.
- **The root carries the real-world height range**:
  `data-meters="min max"` (meters). The engine sizes every placed instance
  from this and its distance to the camera, so a bush must say `0.8 1.8`
  and a redwood `60 90` — this is what keeps the world's proportions real.
  (The famous-landmark silhouettes are exempt: they are postcard backdrops.)
- **Each top-level `<g class="variant">` is one variant** of the asset; the
  engine picks one deterministically per placed instance.
- **A layer's `class` is its semantic color role** (`foliage`, `foliage2`,
  `trunk`, `dark`, `light`, `accent`, `rock`, `snow`, `shadow`, `warm`,
  and the fauna fur roles `tan`, `brown`, `gray`). The special role
  `window` marks a glow-reactive pane: the engine paints it dark by day
  and blends in warm light as night falls — this is how the buildings
  (cabin, barn, teahouse, pagoda) live as plain SVGs.
  At draw time the role is resolved through the biome/depth/light color set,
  so never hardcode "the" color — the `fill` you write is just the daylight
  preview. Layers **without** a class keep their literal fill.
- **Baked shading uses literal translucent black/white**, never a role:
  e.g. a canopy's shaded side is a `fill="rgba(0,0,0,0.14)"` layer (no
  class) on top of the `foliage` layer. Roles are hues that biomes swap
  freely, so role-based shading would invert under some palettes.
- Keep shapes flat: plain `<path>`/`<rect>`/`<ellipse>` without nested
  `transform`s (the parser does not apply them).
- `fill-opacity`, `stroke`, `stroke-width`, `stroke-linecap` and
  `clip-path` (defined in `<defs>`) are supported.
- Special signatures: `mesa.svg` is recorded at 280×100 and drawn with an
  independent width/height; `pole.svg` takes no variant.

`tools/port-assets.js` generated the initial set by replaying the original
procedural drawing code (now in `tools/legacy/assets.js`); from here on the
SVGs are the source of truth — edit them directly.

## Animated assets (`animated/*.js`)

Things that genuinely move (turbine blades, the lighthouse beam, lamp
light pools, geysers, eruptions) stay procedural — lit windows do NOT;
they're static SVGs with the `window` role. A module may also be an
overlay that wraps an SVG asset's draw (see `smoke.js`, which adds
chimney smoke to the cabin). Each file is a self-contained module that
registers one or more draw functions:

```js
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const { rr } = Assets;            // rounded-rect path helper
  Assets.myThing = function (ctx, x, y, s, c, v, time) { ... };
})();
```

The build concatenates them into `js/gen/animated.js`, loaded after the SVG
registry. Same contract as static assets: `s` is the height in px, `c` is
the semantic color set, `v ∈ [0,1)` is the per-instance variation seed,
`time` is seconds.
