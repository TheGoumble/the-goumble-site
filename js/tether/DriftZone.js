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
  const EDGE_MARGIN = 40;   // soft-wall inset from the page's top border
  const CHAR_RADIUS = 23;   // half the character's 46px size
  const zone = { centerX: 0, centerY: 0, radiusX: 0, radiusY: 0, minY: 0 };

  function update() {
    const heroRect = hero.getBoundingClientRect();

    // hero-local y of the very top of the page (the hero starts below the ship)
    const pageTop = -(heroRect.top + window.scrollY);
    const top = pageTop + EDGE_MARGIN;     // walled at the page's top border
    const bottom = heroRect.height - 40;

    zone.centerX = heroRect.width * 0.5;
    zone.centerY = (top + bottom) / 2;
    zone.radiusX = heroRect.width * 0.46;
    zone.radiusY = (bottom - top) / 2;
    zone.minY = pageTop + CHAR_RADIUS + 4; // hard floor, even while dragging
  }

  function distanceFraction(pos) {
    const nx = (pos.x - zone.centerX) / zone.radiusX;
    const ny = (pos.y - zone.centerY) / zone.radiusY;
    const ax = Math.abs(nx), ay = Math.abs(ny);
    const normDist = Math.max(ax, ay);
    return {
      normDist,
      dirX: ax >= ay ? Math.sign(nx) : 0,
      dirY: ay > ax ? Math.sign(ny) : 0
    };
  }

  return { zone, update, distanceFraction };
}