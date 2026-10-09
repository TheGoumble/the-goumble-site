/* ============================================================
   STARFIELD
   ------------------------------------------------------------
   Owns: the background canvas (#starfield) — the twinkling dots
   behind everything, plus random shooting stars (hero only).

   Stars scroll with the page, with parallax: the canvas stays
   pinned to the screen, but the star layer is a tile (about 1.75
   screens tall) that slides at PARALLAX x the page's scroll speed
   and wraps around, so a short tile covers a page of any length.

   Moves on its own: runs continuously via requestAnimationFrame,
   independent of any other section. Doesn't touch nav, hero,
   planet, asteroids, or contact.

   Depends on: nothing. No data.json values used here.

   Call: initStarfield() — safe to call once DOM is ready.
   ============================================================ */

function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  const hero = document.getElementById('hero');
  let stars = [];
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;  // no twinkle, shooting stars or scroll drift

  // ---- star look: dense field of solid white dots in mixed sizes ----
  const PX_PER_STAR = 1200;   // one star per this many px² — lower = denser
  const MIN_R = 0.8;          // smallest dot radius (px)
  const MAX_R = 4.2;          // largest dot radius (px)
  const SIZE_SKEW = 3;        // higher = more tiny dots, fewer big ones
  const TWINKLE = 0.25;       // 0 = perfectly solid, higher = more flicker
  const PARALLAX = 0.6;       // star scroll speed vs the page: 1 = locked to the page,
                              // lower = drifts slower (more depth), 0 = pinned to screen
  const TILE_SCREENS = 1.75;  // star tile height in screen heights — taller = the
                              // repeat is harder to notice

  // ---- star tile: positions live in tile coordinates (0..tileH) and are
  // wrapped into view each frame. Regenerated when the width changes, but
  // NOT on height-only resizes (mobile URL bar showing/hiding) so the stars
  // don't reshuffle mid-scroll ----
  let tileH = 0;
  function resize() {
    const widthChanged = canvas.width !== window.innerWidth;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (stars.length && !widthChanged && tileH >= canvas.height * 1.2) return;

    tileH = Math.round(canvas.height * TILE_SCREENS);
    const count = Math.floor((canvas.width * tileH) / PX_PER_STAR);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * tileH,
      r: MIN_R + (MAX_R - MIN_R) * Math.pow(Math.random(), SIZE_SKEW),
      tw: Math.random() * Math.PI * 2 // twinkle phase offset
    }));
  }
  window.addEventListener('resize', () => { resize(); if (still) draw(); });
  resize();

  // ---- shooting stars: short-lived streaks spawned at random, but only
  // within the hero section's current on-screen position. #starfield is a
  // fixed full-viewport canvas (same coordinates whether you've scrolled
  // or not) while #hero scrolls normally, so its visible rect has to be
  // re-measured live rather than assumed to match the canvas. ----
  let shooting = [];

  function visibleHeroRect() {
    const r = hero.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= canvas.height || r.right <= 0 || r.left >= canvas.width) {
      return null; // hero isn't on screen right now — nothing to spawn into
    }
    return {
      top: Math.max(r.top, 0),
      bottom: Math.min(r.bottom, canvas.height),
      left: Math.max(r.left, 0),
      right: Math.min(r.right, canvas.width)
    };
  }

  function maybeSpawnShootingStar() {
    if (Math.random() >= 0.01 || shooting.length >= 3) return;
    const zone = visibleHeroRect();
    if (!zone) return;
    shooting.push({
      x: zone.left + Math.random() * (zone.right - zone.left) * 0.6,
      y: zone.top + Math.random() * (zone.bottom - zone.top) * 0.3,
      vx: 6 + Math.random() * 4,
      vy: 3 + Math.random() * 2,
      life: 1 // fades from 1 -> 0
    });
  }

  // ---- main draw loop ----
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = Date.now() / 1000;

    const offset = still ? 0 : window.scrollY * PARALLAX;
    stars.forEach(s => {
      // wrap the star's tile position into the tile for this scroll offset,
      // then shift it up one tile if it landed below the screen (so stars
      // near the wrap seam still show at the top edge)
      let y = ((s.y - offset) % tileH + tileH) % tileH;
      if (y > canvas.height + s.r) {
        y -= tileH;
        if (y < -s.r) return; // off-screen either way
      }
      const alpha = still ? 1 : 1 - TWINKLE * Math.abs(Math.sin(t * 0.5 + s.tw));
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });

    if (still) return;

    maybeSpawnShootingStar();
    shooting.forEach(s => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,255,255,${s.life})`;
      ctx.lineWidth = 1.5;
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 4, s.y - s.vy * 4);
      ctx.stroke();
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.02;
    });

    // confine to the hero's current on-screen area every frame, not just at
    // spawn — without this a star can fly past the hero's edge mid-flight
    // and keep drawing itself over whatever section is below/beside it
    const heroZone = visibleHeroRect();
    shooting = shooting.filter(s => {
      if (s.life <= 0) return false;
      if (!heroZone) return false;
      return s.x >= heroZone.left && s.x <= heroZone.right &&
             s.y >= heroZone.top && s.y <= heroZone.bottom;
    });

    requestAnimationFrame(draw);
  }
  draw();
}