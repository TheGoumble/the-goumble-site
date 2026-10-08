/* ============================================================
   MAIN
   ------------------------------------------------------------
   Orchestrator only. Owns no visuals or animation itself —
   just starts up each module in the right order:

     1. initStarfield() — background, no data needed
     2. initTether()    — hero drag/float, no data needed
     3. loadData()       — fetches data.json, fills in text,
                            then hands the right pieces to:
          - initNav(data.nav)
          - initField(data.projects, data.skills)
          - initContact(data.profile.email)

   If you're looking for the code that actually MOVES something,
   it's not here — check starfield.js, tether.js, or field.js's
   CSS-driven drift (style.css).
   ============================================================ */

initStarfield();
initTether();
initEyes();

loadData(data => {
  initNav(data.nav);
  initField(data.projects, data.skills);
  initContact(data.profile.email);
});