/* ============================================================
   EYES (hero watchers)
   ------------------------------------------------------------
   Owns: four star-dot eyes (pairs, single eyes, some turned sideways)
   that fill the empty parts of the hero and watch the astronaut. Drawn on their own canvas
   inside #hero (so they scroll with the hero and never show in
   other sections), in the same white twinkling dots as the stars.

   Moves on its own: the pupils slide to point at the astronaut
   (eased, so they trail him a little). Only the innermost circle is
   kept inside the lid; the outer rings slide under it, and any dot
   that reaches the lid shrinks away so nothing overlaps. Every dot
   twinkles like the starfield. The eyes stay open.

   Depends on: EYE_PAIRS from js/eyes-data.js (generated from the
   hand-drawn eyes), and the live positions of #character, #shipnav,
   #satellite, #heroName and #heroRole to find the empty space.

   Call: initEyes() — after the DOM is ready and eyes-data.js has loaded.
   ============================================================ */

function initEyes() {
  if (window.__eyesStarted) return;          // safe to call twice (main.js and the auto-start below)
  const hero = document.getElementById('hero');
  const character = document.getElementById('character');
  if (typeof EYE_PAIRS === 'undefined') { console.warn('[eyes] EYE_PAIRS is missing — is js/eyes-data.js loaded?'); return; }
  if (!hero || !character) { console.warn('[eyes] #hero or #character not found'); return; }
  window.__eyesStarted = true;

  // ---- look (matches js/starfield.js) ----
  const TWINKLE = 0.25;          // same flicker amount as the stars
  const MIN_DOT = 0.9;           // never draw a dot smaller than this (px)
  const FOLLOW_EASE = 0.12;      // seconds for the pupils to catch up — bigger = lazier
  const FULL_LOOK_DIST = 160;    // px: farther than this the pupils are fully turned
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- where the eyes would like to sit (fractions of the hero), best first.
  // kind 'pair' = both eyes, 'single' = one eye (which = 0 left, 1 right).
  // rot turns a whole eye (90 = sideways); tilt is a small extra lean.
  // Only the first MAX_EYES that fit are shown; a spot that would land on the
  // ship, the title, the satellite or another eye is skipped. ----
  const MAX_EYES = 4;
  // ship: true means fy is replaced by dy = pixels below the ship's middle (for a 760px ship; scales with it),
  // so those eyes line up with the nav. Otherwise fx / fy are fractions of the FIRST SCREEN (the ship area plus the top of the
  // hero, i.e. what is visible without scrolling), not of the whole tall hero.
  const SLOTS = [
    { ship: true, fx: 0.115, dy: 30, kind: 'pair',   tilt: 0, rot: -52, scale: 1.0 },   // upper left, running up-right along the diagonal
    { ship: true, fx: 0.915, dy: 52, kind: 'single', which: 1, tilt: 0, rot: 51, scale: 1.5 },   // upper right, running down-right
    { fx: 0.84, fy: 0.72, kind: 'pair',   tilt: -5, rot:  0,  scale: 1.0 },
    { fx: 0.17, fy: 0.62, kind: 'single', which: 0, tilt:  4, rot:  0,  scale: 1.5 },
    // spares, used only if one of the spots above is blocked
    { fx: 0.82, fy: 0.48, kind: 'pair',   tilt:  3, rot:  0,  scale: 0.8 },
    { fx: 0.05, fy: 0.42, kind: 'single', which: 1, tilt:  0, rot: -90, scale: 1.3 },
    { fx: 0.30, fy: 0.45, kind: 'single', which: 0, tilt: -3, rot:  0,  scale: 1.2 },
  ];

  if (!EYE_PAIRS.every(p => p.eyes.every(e => e.c && e.c.length))) {
    console.warn('[eyes] js/eyes-data.js is the OLD version (no eye-opening outline), so pupils will not slide under the lids. Replace it with the new eyes-data.js and hard refresh.');
  }

  const byName = {};
  const PAIR = () => byName.stars || EYE_PAIRS[0];
  EYE_PAIRS.forEach(p => {
    byName[p.name] = p;
    p.eyes.forEach(e => {                       // bounding box of each eye, in pair units
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < e.o.length; i += 3) {
        x0 = Math.min(x0, e.o[i] - e.o[i + 2]); x1 = Math.max(x1, e.o[i] + e.o[i + 2]);
        y0 = Math.min(y0, e.o[i + 1] - e.o[i + 2]); y1 = Math.max(y1, e.o[i + 1] + e.o[i + 2]);
      }
      e.bb = { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    });
  });

  const canvas = document.createElement('canvas');
  canvas.id = 'heroEyes';
  canvas.setAttribute('aria-hidden', 'true');
  // positioned here (not in hero.css) so the eyes always sit behind the hero's content
  canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:0;';
  hero.insertBefore(canvas, hero.firstChild);
  const ctx = canvas.getContext('2d');

  let placed = [];     // pairs currently on screen
  let W = 0, H = 0, extra = 0;   // extra = how far the canvas reaches above the hero (to cover the ship area)

  // ---- find empty space ----
  const rel = (r, hr) => ({ l: r.left - hr.left, t: r.top - hr.top, r: r.right - hr.left, b: r.bottom - hr.top });
  const hit = (a, b, pad) => !(a.r + pad < b.l || a.l - pad > b.r || a.b + pad < b.t || a.t - pad > b.b);

  function textRect(el, hr) {
    if (!el) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    return rel(range.getBoundingClientRect(), hr);
  }

  function layout() {
    const hr = hero.getBoundingClientRect();
    W = hr.width; H = hr.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // reach up over the ship area too, so eyes can sit beside the nav
    extra = Math.max(0, Math.min(700, Math.round(hr.top + (window.scrollY || 0))));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round((H + extra) * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = (H + extra) + 'px';
    canvas.style.top = -extra + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, extra * dpr);   // drawing coordinates stay relative to the hero's top-left

    const blockers = [];
    let ship = null;
    ['shipnav', 'satellite'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { const r = rel(el.getBoundingClientRect(), hr); blockers.push(r); if (id === 'shipnav') ship = r; }
    });
    ['heroName', 'heroRole'].forEach(id => {
      const r = textRect(document.getElementById(id), hr);
      if (r) blockers.push(r);
    });

    // only place eyes on the first screen: from the top of the page down to the bottom of the window
    const heroTop = hr.top + (window.scrollY || 0);
    const visH = Math.max(320, Math.min(H, window.innerHeight - Math.max(0, heroTop)));
    const basePx = Math.max(130, Math.min(250, W * 0.17));
    placed = [];
    const maxEyes = W < 600 ? 3 : MAX_EYES;   // keep phones calm
    const pair = PAIR();
    SLOTS.forEach(slot => {
      if (placed.length >= maxEyes) return;
      const px = basePx * slot.scale / 100;
      const single = slot.kind === 'single';
      const e0 = single ? pair.eyes[slot.which] : null;
      // size of what is drawn, in pair units, and where its middle is
      const uw = single ? e0.bb.x1 - e0.bb.x0 : 100;
      const uh = single ? e0.bb.y1 - e0.bb.y0 : pair.h;
      const off = single ? { x: e0.bb.cx, y: e0.bb.cy } : { x: 0, y: 0 };
      const rot = (slot.rot + slot.tilt) * Math.PI / 180;
      const cs = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
      let cx = slot.fx * W;
      let cy = slot.fy * visH;
      let sz = px;
      if (slot.ship) {
        if (!ship) return;
        cy = (ship.t + ship.b) / 2 + slot.dy * ((ship.r - ship.l) / 760);
      }
      const bw = (uw * cs + uh * sn) * sz, bh = (uw * sn + uh * cs) * sz;
      cx = Math.max(bw / 2 + 12, Math.min(W - bw / 2 - 12, cx));   // keep inside the hero
      const box = { l: cx - bw / 2, r: cx + bw / 2, t: cy - bh / 2, b: cy + bh / 2 };
      if (slot.ship) { if (box.t < -extra + 8) return; }
      else if (box.t < 8 || box.b > visH - 8) return;
      if (blockers.some(b => hit(box, b, 18))) return;
      if (placed.some(p => hit(box, p.box, 14))) return;
      const list = single ? [e0] : pair.eyes;
      placed.push({
        box, cx, cy, px: sz, rot, off,
        eyes: list.map(e => ({
          e, ox: 0, oy: 0,
          phO: Float32Array.from({ length: e.o.length / 3 }, () => Math.random() * 6.283),
          phP: Float32Array.from({ length: e.p.length / 3 }, () => Math.random() * 6.283),
        })),
      });
    });
  }

  // how far the pupil may travel toward angle `a` (radians), interpolated from the 32-entry table
  function limitAt(lim, a) {
    const f = ((a / (Math.PI * 2)) % 1 + 1) % 1 * 32;
    const i = Math.floor(f), k = f - i;
    return lim[i % 32] * (1 - k) + lim[(i + 1) % 32] * k;
  }

  // distance from (x,y) to the eye opening: positive inside, negative outside
  function openingDist(c, x, y) {
    let inside = false, best = 1e9;
    for (let i = 0, n = c.length / 2, j = n - 1; i < n; j = i++) {
      const ax = c[i * 2], ay = c[i * 2 + 1], bx = c[j * 2], by = c[j * 2 + 1];
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      const vx = bx - ax, vy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
      const d = Math.hypot(x - ax - t * vx, y - ay - t * vy);
      if (d < best) best = d;
    }
    return inside ? best : -best;
  }

  const smooth = v => v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);

  function drawDots(arr, ph, ox, oy, px, t, clip) {
    for (let i = 0, n = arr.length / 3; i < n; i++) {
      const x = arr[i * 3] + ox, y = arr[i * 3 + 1] + oy, r = arr[i * 3 + 2];
      let size = r * px;
      if (clip) {                      // shrink dots away as they slide under the lid
        const k = smooth((openingDist(clip, x, y) - r * 0.3) / (r * 3));
        if (k <= 0.02) continue;
        size = Math.max(MIN_DOT * 0.5, size * k);
      } else {
        size = Math.max(MIN_DOT, size);
      }
      ctx.globalAlpha = reduced ? 0.9 : 1 - TWINKLE * Math.abs(Math.sin(t * 0.5 + ph[i]));
      ctx.beginPath();
      ctx.arc(x * px, y * px, size, 0, 6.2832);
      ctx.fill();
    }
  }

  let last = performance.now();
  let running = false;

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const k = 1 - Math.exp(-dt / FOLLOW_EASE);

    const hr = hero.getBoundingClientRect();
    const cr = character.getBoundingClientRect();
    const tx = cr.left + cr.width / 2 - hr.left;     // astronaut centre, hero coords
    const ty = cr.top + cr.height / 2 - hr.top;

    ctx.clearRect(0, -extra, W, H + extra);
    ctx.fillStyle = '#fff';

    placed.forEach(p => {
      // direction to him, in this eye's own (turned) frame
      let dx = tx - p.cx, dy = ty - p.cy;
      const dist = Math.hypot(dx, dy) || 1;
      const c = Math.cos(-p.rot), s = Math.sin(-p.rot);
      [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
      const ang = Math.atan2(dy, dx);
      const turn = Math.min(1, dist / FULL_LOOK_DIST);

      ctx.save();
      ctx.translate(p.cx, p.cy);
      ctx.rotate(p.rot);
      ctx.translate(-p.off.x * p.px, -p.off.y * p.px);
      p.eyes.forEach(eye => {
        const reach = limitAt(eye.e.lim, ang) * turn;
        eye.ox += (Math.cos(ang) * reach - eye.ox) * k;
        eye.oy += (Math.sin(ang) * reach - eye.oy) * k;
        drawDots(eye.e.o, eye.phO, 0, 0, p.px, t, null);
        drawDots(eye.e.p, eye.phP, eye.ox, eye.oy, p.px, t, eye.e.c);
      });
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  function stop() { running = false; }

  layout();
  if (!placed.length) console.warn('[eyes] no empty space found for any eye (hero ' + Math.round(W) + 'x' + Math.round(H) + ')');
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(hero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  // the name and role are filled in after data.json loads, so re-find the empty space then
  const heroText = document.getElementById('heroText');
  if (heroText && window.MutationObserver) {
    new MutationObserver(layout).observe(heroText, { childList: true, characterData: true, subtree: true });
  }

  // only animate while the hero is on screen
  if (window.IntersectionObserver) {
    new IntersectionObserver(entries => entries[0].isIntersecting ? start() : stop()).observe(hero);
  } else {
    start();
  }
}

// start on its own, so it works even if main.js doesn't call initEyes()
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initEyes);
else initEyes();