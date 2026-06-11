/* Roadtrip — SVG asset runtime. Compiles GEN.svgs (SVG sources inlined by
   tools/build.js) into Path2D layer lists ONCE at boot, then exposes
   window.Assets draw functions with the same signature as before:
   Assets.<name>(ctx, x, y, s, c, v, time). Per frame we only set transforms
   and fill prebuilt paths with the live biome/depth/light colors — there is
   no parsing or rasterizing in the frame loop.

   SVG contract (see tools/port-assets.js and assets/README.md):
   - geometry is authored at s=100 with the ground anchor at (0,0)
   - each <g class="variant"> is one variant; picked deterministically by v
   - a layer's `class` names the semantic color role (foliage, trunk, rock,
     ...) resolved through the per-biome color set `c` at draw time; layers
     without a class keep their literal fill/stroke
   - mesa is the one odd signature: (ctx, x, y, w, h, c, v), recorded at
     280x100; pole is (ctx, x, baseY, H, c). */
window.Assets = (() => {
  const TAU = Math.PI * 2;

  /* rounded-rect path helper, shared with the animated asset modules */
  function rr(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* real-world height ranges in meters: static assets from the SVGs'
     data-meters (via GEN.sizes); animated modules register their own.
     The engine turns meters into pixels by depth — see scene.js. */
  const Assets = { rr, sizes: Object.assign({}, window.GEN.sizes) };

  /* ---- compile one SVG source into variant layer lists ---- */
  const parser = new DOMParser();
  function compile(src) {
    const svg = parser.parseFromString(src, 'image/svg+xml').documentElement;
    const clips = {};
    svg.querySelectorAll('clipPath').forEach(cp => {
      clips[cp.getAttribute('id')] = new Path2D(cp.firstElementChild.getAttribute('d'));
    });
    const variants = [];
    for (const g of svg.children) {
      if (g.tagName !== 'g') continue;
      const layers = [];
      for (const p of g.children) {
        const stroke = p.getAttribute('stroke');
        const clipRef = p.getAttribute('clip-path');
        layers.push({
          path: new Path2D(p.getAttribute('d')),
          role: p.getAttribute('class'),
          color: stroke || p.getAttribute('fill'),
          stroke: !!stroke,
          lw: stroke ? parseFloat(p.getAttribute('stroke-width') || '1') : 0,
          cap: p.getAttribute('stroke-linecap') || 'butt',
          alpha: parseFloat(p.getAttribute('fill-opacity')
            || p.getAttribute('stroke-opacity') || '1'),
          clip: clipRef ? clips[clipRef.slice(5, -1)] : null,
        });
      }
      if (layers.length) variants.push(layers);
    }
    return variants;
  }

  /* ---- per-frame painter: transforms + prebuilt paths only ---- */
  function paint(ctx, variants, v, c) {
    const vi = variants.length > 1
      ? Math.min(variants.length - 1, (v * variants.length) | 0)
      : 0;
    const a0 = ctx.globalAlpha;
    for (const L of variants[vi]) {
      if (L.role === 'window') {
        // glow-reactive pane: dark by day, warm light as night falls
        ctx.globalAlpha = a0 * L.alpha;
        ctx.fillStyle = c.dark || L.color;
        ctx.fill(L.path);
        const ga = c.glowA || 0;
        if (ga > 0) {
          ctx.globalAlpha = a0 * L.alpha * (0.35 + 0.6 * ga);
          ctx.fillStyle = '#ffc66a';
          ctx.fill(L.path);
        }
        continue;
      }
      const col = (L.role && c[L.role]) || L.color;
      ctx.globalAlpha = L.alpha < 1 ? a0 * L.alpha : a0;
      if (L.clip) { ctx.save(); ctx.clip(L.clip); }
      if (L.stroke) {
        ctx.strokeStyle = col;
        ctx.lineWidth = L.lw;
        ctx.lineCap = L.cap;
        ctx.stroke(L.path);
        if (L.cap !== 'butt') ctx.lineCap = 'butt';
      } else {
        ctx.fillStyle = col;
        ctx.fill(L.path);
      }
      if (L.clip) ctx.restore();
    }
    ctx.globalAlpha = a0;
  }

  for (const [name, src] of Object.entries(window.GEN.svgs)) {
    const variants = compile(src);
    if (name === 'mesa') {
      Assets.mesa = (ctx, x, y, mw, mh, c, v) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(mw / 280, mh / 100);
        paint(ctx, variants, v || 0, c);
        ctx.restore();
      };
    } else if (name === 'pole') {
      Assets.pole = (ctx, x, baseY, H, c) => {
        ctx.save();
        ctx.translate(x, baseY);
        ctx.scale(H / 100, H / 100);
        paint(ctx, variants, 0, c);
        ctx.restore();
      };
    } else {
      Assets[name] = (ctx, x, y, s, c, v) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s / 100, s / 100);
        paint(ctx, variants, v || 0, c);
        ctx.restore();
      };
    }
  }

  return Assets;
})();
