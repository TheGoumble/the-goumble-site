/* ============================================================
   DriftZone
   ------------------------------------------------------------
   Owns: the elliptical soft-wall region the character ambiently
   wanders inside — nearly the full hero section, from just below
   the ship down to near its bottom edge, so there's real room to
   drift across the screen rather than being confined to a sliver.
   Measured live every frame so it adapts to viewport size.

   This module only describes the zone and answers "how far past
   the edge is this point, and which way is back toward center?"
   It does not move anything itself — RopePhysics uses it to push
   the character back when it strays too close to the edge.

   Depends on: a live `anchor` object (from AnchorTracker) to
   measure "near the ship" from.

   Call: createDriftZone(hero, anchor)
     -> { zone, update, distanceFraction }
     - zone: { centerX, centerY, radiusX, radiusY } — mutated in place
     - update(): re-measures the zone from current layout
     - distanceFraction(pos): returns how far outside the zone `pos`
       is (0 = center, 1 = exactly on the edge) plus the unit
       direction back toward center
   ============================================================ */

function createDriftZone(hero, anchor) {
  const zone = { centerX: 0, centerY: 0, radiusX: 0, radiusY: 0 };

  function update() {
    const heroRect = hero.getBoundingClientRect();

    const top = anchor.y + 60;             // near the ship
    const bottom = heroRect.height - 40;   // down to near the bottom of the hero section

    zone.centerX = heroRect.width * 0.5;
    zone.centerY = (top + bottom) / 2;
    zone.radiusX = heroRect.width * 0.46;  // nearly full width
    zone.radiusY = (bottom - top) / 2;     // nearly full height below the ship
  }

  function distanceFraction(pos) {
    const nx = (pos.x - zone.centerX) / zone.radiusX;
    const ny = (pos.y - zone.centerY) / zone.radiusY;
    const normDist = Math.sqrt(nx * nx + ny * ny);
    return {
      normDist,
      dirX: normDist > 0 ? nx / normDist : 0,
      dirY: normDist > 0 ? ny / normDist : 0
    };
  }

  return { zone, update, distanceFraction };
}