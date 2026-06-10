/* Endless Drive — the cars. Each car is drawn facing right with its wheels on
   the ground line at o.y, centered on o.x. Cars are a FIXED pixel size — they
   are the scale reference for the whole scene.

   o = { x, y, time, light (0..1 final daylight), wheelRot (rad), bob (px),
         speed, shade(baseColor[r,g,b]) -> css string tinted for time of day }   */
window.Cars = (() => {
  const { TAU } = U;
  const C = U.col;

  function wheel(ctx, x, y, r, rot, o) {
    // the tire squishes slightly into the road: the center sits a touch
    // low and everything below the ground line is clipped off, leaving a
    // flat contact patch
    const cy = y - r + r * 0.10;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - r - 3, y - r * 2 - 6, r * 2 + 6, r * 2 + 6);
    ctx.clip();
    ctx.fillStyle = o.shade(C('#181a20'));
    ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = o.shade(C('#9aa0a8'));
    ctx.beginPath(); ctx.arc(x, cy, r * 0.52, 0, TAU); ctx.fill();
    ctx.strokeStyle = o.shade(C('#3c4048'));
    ctx.lineWidth = r * 0.16;
    for (let i = 0; i < 4; i++) {
      const a = rot + i * TAU / 4;
      ctx.beginPath();
      ctx.moveTo(x, cy);
      ctx.lineTo(x + Math.cos(a) * r * 0.44, cy + Math.sin(a) * r * 0.44);
      ctx.stroke();
    }
    ctx.fillStyle = o.shade(C('#d8dade'));
    ctx.beginPath(); ctx.arc(x, cy, r * 0.13, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* Headlight cone + lamps + taillight, shared by all cars.
     nose/tail are {x,y} in car-local coords (y up from ground). */
  function lights(ctx, o, nose, tail) {
    const k = U.clamp((0.45 - o.light) / 0.4, 0, 1);
    if (k <= 0.02) return;
    const nx = o.x + nose.x, ny = o.y - nose.y + o.bob;
    const tx = o.x + tail.x, ty = o.y - tail.y + o.bob;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const reach = 360;
    const g = ctx.createLinearGradient(nx, 0, nx + reach, 0);
    g.addColorStop(0, `rgba(255,232,170,${0.30 * k})`);
    g.addColorStop(1, 'rgba(255,232,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(nx, ny - 4);
    ctx.lineTo(nx + reach, ny - 34);
    ctx.lineTo(nx + reach, ny + 30);
    ctx.lineTo(nx, ny + 5);
    ctx.closePath();
    ctx.fill();
    // pool of light on the road ahead — the gradient is squashed with the
    // ellipse so it fades to nothing at the edge (no hard-edged stripe)
    ctx.save();
    ctx.translate(nx + 130, o.y + 6);
    ctx.scale(1, 0.17);
    const rg = ctx.createRadialGradient(0, 0, 10, 0, 0, 155);
    rg.addColorStop(0, `rgba(255,232,170,${0.16 * k})`);
    rg.addColorStop(1, 'rgba(255,232,170,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(0, 0, 155, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = `rgba(255,244,200,${0.95 * k})`;
    ctx.beginPath(); ctx.arc(nx, ny, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,64,48,${0.85 * k})`;
    ctx.beginPath(); ctx.arc(tx, ty, 3, 0, TAU); ctx.fill();
    const tg = ctx.createRadialGradient(tx, ty, 1, tx, ty, 16);
    tg.addColorStop(0, `rgba(255,64,48,${0.30 * k})`);
    tg.addColorStop(1, 'rgba(255,64,48,0)');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(tx, ty, 16, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function windowStyle(ctx, o) {
    ctx.fillStyle = o.shade(C(o.light > 0.45 ? '#a8c8dc' : '#23304a'));
  }

  /* ---- 1. Sunset Coupe — a faded-red 70s fastback ---- */
  const coupe = {
    name: 'Sunset Coupe',
    wheels: [-64, 66],
    draw(ctx, o) {
      const X = o.x, Y = o.y + o.bob;
      const body = o.shade(C('#c1453a'));
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(X - 102, Y - 14);
      ctx.lineTo(X - 106, Y - 30);
      ctx.quadraticCurveTo(X - 106, Y - 40, X - 96, Y - 42);
      ctx.quadraticCurveTo(X - 60, Y - 64, X - 26, Y - 67);
      ctx.lineTo(X + 14, Y - 67);
      ctx.quadraticCurveTo(X + 38, Y - 64, X + 50, Y - 45);
      ctx.lineTo(X + 98, Y - 41);
      ctx.quadraticCurveTo(X + 107, Y - 39, X + 107, Y - 26);
      ctx.lineTo(X + 103, Y - 14);
      ctx.lineTo(X + 86, Y - 12);
      ctx.lineTo(X - 88, Y - 12);
      ctx.closePath();
      ctx.fill();
      // fastback side glass
      windowStyle(ctx, o);
      ctx.beginPath();
      ctx.moveTo(X - 52, Y - 47);
      ctx.quadraticCurveTo(X - 38, Y - 60, X - 22, Y - 62);
      ctx.lineTo(X + 10, Y - 62);
      ctx.quadraticCurveTo(X + 28, Y - 60, X + 40, Y - 46);
      ctx.lineTo(X + 8, Y - 46);
      ctx.closePath();
      ctx.fill();
      // chrome bumpers + rocker shadow
      ctx.fillStyle = o.shade(C('#d9dade'));
      ctx.fillRect(X - 108, Y - 22, 14, 5);
      ctx.fillRect(X + 95, Y - 22, 14, 5);
      ctx.fillStyle = o.shade(C('#7e2820'));
      ctx.fillRect(X - 88, Y - 15, 174, 4);
      const dr = o.drops || [0, 0];
      wheel(ctx, X - 64, o.y + dr[0], 18, o.wheelRot, o);
      wheel(ctx, X + 66, o.y + dr[1], 18, o.wheelRot, o);
      lights(ctx, o, { x: 107, y: 30 }, { x: -106, y: 32 });
    },
  };

  /* ---- 2. Wanderer Van — a two-tone 60s camper bus ---- */
  const van = {
    name: 'Wanderer Van',
    wheels: [-62, 60],
    draw(ctx, o) {
      const X = o.x, Y = o.y + o.bob;
      const lower = o.shade(C('#4e87a0'));
      const upper = o.shade(C('#e8e2d2'));
      // upper shell
      ctx.fillStyle = upper;
      ctx.beginPath();
      ctx.moveTo(X - 98, Y - 12);
      ctx.lineTo(X - 100, Y - 58);
      ctx.quadraticCurveTo(X - 100, Y - 76, X - 80, Y - 76);
      ctx.lineTo(X + 62, Y - 76);
      ctx.quadraticCurveTo(X + 88, Y - 74, X + 94, Y - 48);
      ctx.quadraticCurveTo(X + 97, Y - 30, X + 96, Y - 12);
      ctx.closePath();
      ctx.fill();
      // lower color with a front V dip
      ctx.fillStyle = lower;
      ctx.beginPath();
      ctx.moveTo(X - 98, Y - 12);
      ctx.lineTo(X - 99, Y - 44);
      ctx.lineTo(X + 30, Y - 44);
      ctx.quadraticCurveTo(X + 62, Y - 44, X + 84, Y - 30);
      ctx.lineTo(X + 96, Y - 24);
      ctx.lineTo(X + 96, Y - 12);
      ctx.closePath();
      ctx.fill();
      // windows
      windowStyle(ctx, o);
      const wy = Y - 70, wh = 20;
      ctx.fillRect(X - 90, wy, 28, wh);
      ctx.fillRect(X - 56, wy, 28, wh);
      ctx.fillRect(X - 22, wy, 28, wh);
      ctx.beginPath(); // windshield
      ctx.moveTo(X + 14, wy);
      ctx.lineTo(X + 58, wy);
      ctx.quadraticCurveTo(X + 76, wy + 4, X + 82, wy + wh);
      ctx.lineTo(X + 14, wy + wh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = o.shade(C('#caa84e')); // roof rack box
      ctx.fillRect(X - 60, Y - 84, 78, 7);
      ctx.fillStyle = o.shade(C('#d9dade'));
      ctx.fillRect(X - 104, Y - 20, 12, 5);
      ctx.fillRect(X + 93, Y - 20, 12, 5);
      const dr = o.drops || [0, 0];
      wheel(ctx, X - 62, o.y + dr[0], 17, o.wheelRot, o);
      wheel(ctx, X + 60, o.y + dr[1], 17, o.wheelRot, o);
      lights(ctx, o, { x: 96, y: 34 }, { x: -100, y: 30 });
    },
  };

  /* ---- 3. Ranch Pickup — an olive workhorse ---- */
  const pickup = {
    name: 'Ranch Pickup',
    wheels: [-66, 62],
    draw(ctx, o) {
      const X = o.x, Y = o.y + o.bob;
      const body = o.shade(C('#76865a'));
      ctx.fillStyle = body;
      ctx.beginPath(); // bed + cab + hood in one silhouette
      ctx.moveTo(X - 104, Y - 12);
      ctx.lineTo(X - 106, Y - 44);
      ctx.lineTo(X - 30, Y - 44);
      ctx.lineTo(X - 28, Y - 64);
      ctx.quadraticCurveTo(X - 26, Y - 70, X - 18, Y - 70);
      ctx.lineTo(X + 16, Y - 70);
      ctx.quadraticCurveTo(X + 24, Y - 69, X + 32, Y - 48);
      ctx.quadraticCurveTo(X + 60, Y - 45, X + 96, Y - 42);
      ctx.quadraticCurveTo(X + 104, Y - 40, X + 104, Y - 26);
      ctx.lineTo(X + 101, Y - 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = o.shade(C('#3c4434')); // bed interior shadow line
      ctx.fillRect(X - 100, Y - 44, 68, 5);
      windowStyle(ctx, o);
      ctx.beginPath(); // cab glass
      ctx.moveTo(X - 22, Y - 48);
      ctx.lineTo(X - 21, Y - 64);
      ctx.lineTo(X + 13, Y - 64);
      ctx.quadraticCurveTo(X + 19, Y - 62, X + 25, Y - 48);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = o.shade(C('#d9dade'));
      ctx.fillRect(X - 110, Y - 20, 13, 5);
      ctx.fillRect(X + 98, Y - 20, 13, 5);
      const dr = o.drops || [0, 0];
      wheel(ctx, X - 66, o.y + dr[0], 19, o.wheelRot, o);
      wheel(ctx, X + 62, o.y + dr[1], 19, o.wheelRot, o);
      lights(ctx, o, { x: 104, y: 32 }, { x: -106, y: 30 });
    },
  };

  /* ---- 4. Dune Roadster — a little mustard convertible ---- */
  const roadster = {
    name: 'Dune Roadster',
    wheels: [-56, 56],
    draw(ctx, o) {
      const X = o.x, Y = o.y + o.bob;
      const body = o.shade(C('#d2a13c'));
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(X - 88, Y - 13);
      ctx.lineTo(X - 92, Y - 28);
      ctx.quadraticCurveTo(X - 92, Y - 42, X - 72, Y - 44);
      ctx.quadraticCurveTo(X - 48, Y - 46, X - 36, Y - 40);
      ctx.lineTo(X + 26, Y - 40);
      ctx.quadraticCurveTo(X + 50, Y - 44, X + 78, Y - 40);
      ctx.quadraticCurveTo(X + 92, Y - 38, X + 93, Y - 24);
      ctx.lineTo(X + 89, Y - 13);
      ctx.lineTo(X + 72, Y - 11);
      ctx.lineTo(X - 72, Y - 11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = o.shade(C('#2a2622')); // cockpit opening
      ctx.beginPath();
      ctx.ellipse(X - 12, Y - 40, 34, 6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = o.shade(C('#8a6420')); // headrest fairing
      ctx.beginPath();
      ctx.moveTo(X - 50, Y - 40);
      ctx.quadraticCurveTo(X - 42, Y - 54, X - 32, Y - 40);
      ctx.closePath();
      ctx.fill();
      windowStyle(ctx, o); // little windscreen
      ctx.beginPath();
      ctx.moveTo(X + 26, Y - 40);
      ctx.lineTo(X + 36, Y - 56);
      ctx.lineTo(X + 42, Y - 56);
      ctx.lineTo(X + 34, Y - 40);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = o.shade(C('#d9dade'));
      ctx.fillRect(X - 96, Y - 20, 12, 4);
      ctx.fillRect(X + 86, Y - 20, 12, 4);
      const dr = o.drops || [0, 0];
      wheel(ctx, X - 56, o.y + dr[0], 16, o.wheelRot, o);
      wheel(ctx, X + 56, o.y + dr[1], 16, o.wheelRot, o);
      lights(ctx, o, { x: 93, y: 28 }, { x: -92, y: 26 });
    },
  };

  return { LIST: [coupe, van, pickup, roadster], WHEEL_R: 18 };
})();
