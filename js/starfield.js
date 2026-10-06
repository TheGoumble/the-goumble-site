/* ============================================================
   STARFIELD
   ------------------------------------------------------------
   Owns: the full-page background canvas (#starfield) — the
   twinkling dots behind everything, plus random shooting stars.

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

  // ---- static star positions, regenerated on resize ----
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.floor((canvas.width * canvas.height) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.2,
      tw: Math.random() * Math.PI * 2 // twinkle phase offset
    }));
  }
  window.addEventListener('resize', resize);
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

    stars.forEach(s => {
      const alpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.5 + s.tw));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,230,255,${alpha})`;
      ctx.fill();
    });

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