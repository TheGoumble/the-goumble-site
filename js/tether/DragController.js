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

function createDragController(hero, character, charPos, velocity) {
  const HISTORY_WINDOW_MS = 120; // how far back to look when measuring release speed
  const MAX_FLING = 14;          // top speed after release — lower = gentler cap
  const FLING_SCALE = 0.55;      // scales raw flick speed down before clamping, so slow/
                                  // medium/fast releases spread across the range instead
                                  // of most of them saturating at MAX_FLING

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  let dragging = false;
  let dragOffset = { x: 0, y: 0 };
  let posHistory = []; // recent {x, y, t} samples

  function pointerPos(e, rect) {
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }

  character.addEventListener('pointerdown', e => {
    dragging = true;
    const rect = hero.getBoundingClientRect();
    const p = pointerPos(e, rect);
    dragOffset = { x: p.x - charPos.x, y: p.y - charPos.y };
    character.setPointerCapture(e.pointerId);
    posHistory = [{ x: p.x, y: p.y, t: performance.now() }];
  });

  character.addEventListener('pointermove', e => {
    if (!dragging) return;
    const rect = hero.getBoundingClientRect();
    const p = pointerPos(e, rect);
    charPos.x = p.x - dragOffset.x;
    charPos.y = p.y - dragOffset.y;

    const now = performance.now();
    posHistory.push({ x: p.x, y: p.y, t: now });
    while (posHistory.length > 2 && now - posHistory[0].t > HISTORY_WINDOW_MS) {
      posHistory.shift();
    }
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;

    // release velocity = average speed over the last ~120ms, not the
    // last single frame — this is what makes a gentle release measure
    // as gentle even if one in-between mousemove sample was noisy
    const first = posHistory[0];
    const last = posHistory[posHistory.length - 1];
    const distance = posHistory.length >= 2
      ? Math.hypot(last.x - first.x, last.y - first.y)
      : 0;

    // a too-quick grab-and-release (dt near 0ms) divides a tiny, often
    // accidental pixel movement by a near-zero time and blows it up into
    // a huge velocity. Flooring dt at MIN_RELEASE_DT_MS (and requiring a
    // real minimum distance) means a quick tap reads as "no fling" instead
    // of an unpredictable launch.
    const MIN_RELEASE_DT_MS = 30;
    const MIN_FLING_DIST = 4; // px — movement below this is just jitter/a tap

    if (posHistory.length >= 2 && distance >= MIN_FLING_DIST) {
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

  return { isDragging: () => dragging };
}