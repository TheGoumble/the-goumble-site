/* ============================================================
   TETHER
   ------------------------------------------------------------
   Owns: nothing directly — wires together the draggable character
   (#character) in the hero, the rope/cable connecting it to the
   nav ship (#tetherPath), and its zero-g floating motion, out of
   four sub-modules (loaded before this file, see index.html):

     - AnchorTracker  (js/tether/AnchorTracker.js)
         where the rope attaches, tracked live from the ship
     - DriftZone      (js/tether/DriftZone.js)
         the elliptical soft-wall region the character wanders in
     - DragController (js/tether/DragController.js)
         pointer/touch drag + release-velocity fling
     - RopePhysics     (js/tether/RopePhysics.js)
         ambient drift, the hard leash, and the verlet rope chain

   This file just creates charPos/velocity (shared, mutated by
   reference across modules), wires the sub-modules to the right
   DOM elements, and runs the main animation loop.

   Depends on: nothing. No data.json values used here — this is
   pure physics/interaction, independent of your personal info.

   Call: initTether() — safe to call once DOM is ready, and once
   AnchorTracker.js / DriftZone.js / DragController.js / RopePhysics.js
   have already loaded.
   ============================================================ */
   
function initTether() {
  const hero = document.getElementById('hero');
  const character = document.getElementById('character');
  const tetherPath = document.getElementById('tetherPath');
  const navEl = document.getElementById('shipnav');

  const charPos = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  const spin = { angle: 0, omega: 0 };    // rotation (radians) and spin speed (radians/frame)
  const ropeEnd = { x: 0, y: 0 };         // where the rope is attached on him

  // --- spin tuning -----------------------------------------------------------
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AMBIENT_SPIN = reducedMotion ? 0 : (Math.random() < 0.5 ? -1 : 1) * 0.0025;  // lazy drift (~9°/s)
  const SPIN_FADE = 0.988;     // per frame: how fast a spin fades toward the lazy drift (closer to 1 = longer)
  const MAX_OMEGA = 0.25;      // spin speed cap (radians/frame)
  const ATTACH_Y = -0.17;      // rope attaches this far above his centre (fraction of his height): upper back / chest

  const anchorTracker = createAnchorTracker(hero, navEl);
  const driftZone = createDriftZone(hero, anchorTracker.anchor);
  const dragController = createDragController(hero, character, charPos, velocity, spin);
  const ropePhysics = createRopePhysics(anchorTracker.anchor, driftZone, charPos, velocity, ropeEnd);

  function layout() {
    const rect = hero.getBoundingClientRect();
    if (charPos.x === 0 && charPos.y === 0) {
      charPos.x = rect.width * 0.5;
      charPos.y = rect.height * 0.3;
    }
  }
  layout();
  window.addEventListener('resize', layout);

  function animate() {
    const t = Date.now() / 1000;

    // recover if a bad value ever sneaks in (NaN would blank the rope path)
    if (!Number.isFinite(charPos.x) || !Number.isFinite(charPos.y)) {
      charPos.x = 0; charPos.y = 0; velocity.x = 0; velocity.y = 0; layout();
    }
    if (!Number.isFinite(spin.angle) || !Number.isFinite(spin.omega)) { spin.angle = 0; spin.omega = 0; }

    anchorTracker.update();
    driftZone.update();

    if (dragController.isDragging()) {
      dragController.step();                       // held: swings around the grabbed point
    } else {
      ropePhysics.stepCharacter();
      // free spin: fades toward a lazy drift, never past the speed cap
      spin.omega = AMBIENT_SPIN + (spin.omega - AMBIENT_SPIN) * SPIN_FADE;
      spin.omega = Math.max(-MAX_OMEGA, Math.min(MAX_OMEGA, spin.omega));
      spin.angle += spin.omega;
    }

    // wall at the page's top border: his rotated outline (not a fixed radius) can't cross it
    const w = character.offsetWidth, h = character.offsetHeight;
    const cos = Math.cos(spin.angle), sin = Math.sin(spin.angle);
    const halfH = Math.abs(cos) * h / 2 + Math.abs(sin) * w / 2;
    const pageTop = -(hero.getBoundingClientRect().top + window.scrollY);
    charPos.y = Math.max(charPos.y, pageTop + halfH + 4);

    character.style.transform =
      `translate(${charPos.x - w / 2}px, ${charPos.y - h / 2}px) rotate(${spin.angle}rad)`;

    // the rope is attached on his back/chest and turns with him
    const ay = ATTACH_Y * h;
    ropeEnd.x = charPos.x - ay * sin;
    ropeEnd.y = charPos.y + ay * cos;

    ropePhysics.updateRope(t);
    tetherPath.setAttribute('d', ropePhysics.ropeToPath());

    requestAnimationFrame(animate);
  }
  animate();
}