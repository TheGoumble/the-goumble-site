/* ============================================================
   DragController
   ------------------------------------------------------------
   Owns: pointer/touch drag handling for #character. Tracks
   recent position samples while dragging so release hands off a
   smoothed fling velocity instead of one noisy last-frame delta.

   Mutates charPos/velocity directly (both passed in by reference)
   so RopePhysics and the main loop see the result immediately —
   no return-and-reassign plumbing needed between modules.

   Depends on: #character existing in the DOM.

   Call: createDragController(hero, character, charPos, velocity)
     -> { isDragging }
     - charPos/velocity: live state objects, mutated in place
     - isDragging(): true while the character is being held
   ============================================================ */
function createDragController(hero, character, charPos, velocity, spin) {
  const HISTORY_WINDOW_MS = 120; // how far back to look when measuring release speed
  const MAX_FLING = 14;          // top speed after release — lower = gentler cap
  const FLING_SCALE = 0.55;      // scales raw flick speed down before clamping, so slow/
                                  // medium/fast releases spread across the range instead
                                  // of most of them saturating at MAX_FLING

  // --- swing around the grabbed point ---------------------------------------
  const SWING_K = 0.022;         // how hard the body is pulled to trail behind the cursor
  const SWING_DAMP = 0.10;       // friction while held (lower = swingier, higher = calmer)
  const LEVER_FULL = 40;         // px from the centre at which the swing is at full strength
  const MAX_OMEGA = 0.25;        // spin speed cap (radians/frame, ~14 rad/s)

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }   // -> (-PI, PI]
  function rot(v, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  }

  let dragging = false;
  let grab = { x: 0, y: 0 };        // where you grabbed, relative to his centre, in HIS rotated frame
  let pointer = { x: 0, y: 0 };     // latest pointer position (hero-local)
  let lastPointer = { x: 0, y: 0 };
  let pointerVel = { x: 0, y: 0 };  // smoothed pointer speed (px/frame)
  let posHistory = []; // recent {x, y, t} samples of his centre

  function pointerPos(e, rect) {
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }

  character.addEventListener('pointerdown', e => {
    dragging = true;
    const rect = hero.getBoundingClientRect();
    const p = pointerPos(e, rect);
    grab = rot({ x: p.x - charPos.x, y: p.y - charPos.y }, -spin.angle);
    pointer = { x: p.x, y: p.y };
    lastPointer = { x: p.x, y: p.y };
    pointerVel = { x: 0, y: 0 };
    character.setPointerCapture(e.pointerId);
    posHistory = [{ x: charPos.x, y: charPos.y, t: performance.now() }];
  });

  character.addEventListener('pointermove', e => {
    if (!dragging) return;
    const rect = hero.getBoundingClientRect();
    pointer = pointerPos(e, rect);
  });

  // Runs every frame while held. The grabbed point is pinned to the cursor and the
  // rest of him swings around it, drifting to trail behind the direction you move.
  function step() {
    pointerVel.x += ((pointer.x - lastPointer.x) - pointerVel.x) * 0.25;
    pointerVel.y += ((pointer.y - lastPointer.y) - pointerVel.y) * 0.25;
    lastPointer = { x: pointer.x, y: pointer.y };
    const speed = Math.hypot(pointerVel.x, pointerVel.y);
    const lever = Math.min(Math.hypot(grab.x, grab.y) / LEVER_FULL, 1);   // 0 = grabbed dead centre

    let alpha = -SWING_DAMP * spin.omega;
    if (lever > 0.1 && speed > 0.4) {
      const strength = Math.min(speed / 5, 1);
      const target = Math.atan2(pointerVel.y, pointerVel.x) - Math.atan2(grab.y, grab.x);
      alpha += SWING_K * lever * strength * wrap(target - spin.angle);
    }
    spin.omega = clamp(spin.omega + alpha, -MAX_OMEGA, MAX_OMEGA);
    spin.angle += spin.omega;

    const c = rot(grab, spin.angle);
    charPos.x = pointer.x - c.x;
    charPos.y = pointer.y - c.y;

    const now = performance.now();
    posHistory.push({ x: charPos.x, y: charPos.y, t: now });
    while (posHistory.length > 2 && now - posHistory[0].t > HISTORY_WINDOW_MS) {
      posHistory.shift();
    }
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;

    // release velocity = average speed over the last ~120ms (stale samples ignored)
    const now = performance.now();
    const recent = posHistory.filter(s => now - s.t <= HISTORY_WINDOW_MS);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const distance = recent.length >= 2
      ? Math.hypot(last.x - first.x, last.y - first.y)
      : 0;

    const MIN_RELEASE_DT_MS = 30;
    const MIN_FLING_DIST = 4; // px — movement below this is just jitter/a tap

    if (recent.length >= 2 && distance >= MIN_FLING_DIST) {
      const dt = Math.max(last.t - first.t, MIN_RELEASE_DT_MS) / 1000;
      const rawVx = (last.x - first.x) / dt / 60;
      const rawVy = (last.y - first.y) / dt / 60;
      velocity.x = clamp(rawVx * FLING_SCALE, -MAX_FLING, MAX_FLING);
      velocity.y = clamp(rawVy * FLING_SCALE, -MAX_FLING, MAX_FLING);
    } else {
      velocity.x = 0;
      velocity.y = 0;
    }
  }
  character.addEventListener('pointerup', endDrag);
  character.addEventListener('pointercancel', endDrag);

  return { isDragging: () => dragging, step };
}