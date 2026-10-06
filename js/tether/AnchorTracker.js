/* ============================================================
   AnchorTracker
   ------------------------------------------------------------
   Owns: where the rope attaches. Measures the ship's "about" button
   (or the nav's center) real on-screen position every frame and
   converts it into hero-local coordinates, so the rope stays
   attached no matter where the nav actually is (scroll, resize,
   layout changes).

   Depends on: #hero and #shipnav existing in the DOM.

   Call: createAnchorTracker(hero, navEl) -> { anchor, update }
     - anchor: { x, y } — mutated in place, read it after update()
     - update(): re-measures anchor from the ship's current position
   ============================================================ */

function createAnchorTracker(hero, navEl) {
  const anchor = { x: 0, y: 0 };

  function update() {
    const heroRect = hero.getBoundingClientRect();
    // attach at the "about" button (the middle of the ship). If it isn't on screen
    // (mobile menu closed, links not built yet), fall back to the nav's center.
    const about = navEl.querySelector('a[href="#about"]');
    const aboutRect = about && about.getBoundingClientRect();
    const navRect = aboutRect && aboutRect.width > 0 ? aboutRect : navEl.getBoundingClientRect();
    anchor.x = (navRect.left + navRect.width / 2) - heroRect.left;
    anchor.y = (navRect.top + navRect.height / 2) - heroRect.top;
  }

  return { anchor, update };
}