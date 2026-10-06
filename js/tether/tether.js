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

  const anchorTracker = createAnchorTracker(hero, navEl);
  const driftZone = createDriftZone(hero, anchorTracker.anchor);
  const dragController = createDragController(hero, character, charPos, velocity);
  const ropePhysics = createRopePhysics(anchorTracker.anchor, driftZone, charPos, velocity);

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

    anchorTracker.update();
    driftZone.update();

    if (!dragController.isDragging()) {
      ropePhysics.stepCharacter();
    }

    character.style.transform = `translate(${charPos.x - 23}px, ${charPos.y - 23}px)`;

    ropePhysics.updateRope(t);
    tetherPath.setAttribute('d', ropePhysics.ropeToPath());

    requestAnimationFrame(animate);
  }
  animate();
}