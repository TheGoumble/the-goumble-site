/* ============================================================
   NAV
   ------------------------------------------------------------
   Owns: the nav links positioned as "windows" along the ship
   hull (#navLinks) and the phone placement of the satellite.

   Moves on its own: nothing animated here — links are static
   once placed. Only changes on click (active state).

   Depends on: data.nav (array of {label, href}) from data.json.
   Must be called AFTER data.json has loaded.

   Call: initNav(navItems)
   ============================================================ */

function initNav(navItems) {
  const container = document.getElementById('navLinks');
  container.innerHTML = '';

  navItems.forEach((item) => {
    const a = document.createElement('a');
    a.href = item.href;
    a.className = 'nav-link';
    a.textContent = item.label;

    // nothing is highlighted on load; a link lights up only once it is clicked
    a.addEventListener('click', () => {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      a.classList.add('active');
    });

    container.appendChild(a);
  });

  // Portholes follow the real shape of the hull. The hull is tallest near the
  // wings and tapers to the nose, so each ring is sized to the hull height where
  // it sits (big -> small), and its centre rides the hull's tilted centre line.
  // Heights are measured from ship.svg, as fractions of the ship's width.
  const HULL_H = [[0.30,68],[0.38,73],[0.46,78],[0.58,76],[0.66,71],[0.74,59],[0.82,43],[0.90,23]]
    .map(([x, h]) => [x, h / 640]);
  const hullHeight = (f) => {
    if (f <= HULL_H[0][0]) return HULL_H[0][1];
    for (let i = 1; i < HULL_H.length; i++) {
      const [x1, h1] = HULL_H[i], [x0, h0] = HULL_H[i - 1];
      if (f <= x1) return h0 + (h1 - h0) * (f - x0) / (x1 - x0);
    }
    return HULL_H[HULL_H.length - 1][1];
  };
  const FIRST = 0.40, LAST = 0.745;  // centres of the first / last ring (fraction of ship width)
  const FIT = 0.92;                  // ring diameter as a share of the hull height (3 links)
  const FIT_CROWDED = 0.85;          // smaller rings when there are 4+ links, so they don't touch

  function placeLinks() {
    const links = [...container.querySelectorAll('.nav-link')];
    const phone = window.innerWidth <= 700;     // phones: the ship is cropped, so the portholes bunch in the wide middle of the hull
    const first = phone ? 0.45 : FIRST, last = phone ? 0.69 : LAST;
    const W = container.clientWidth;
    const line = 0.0105;                       // ring thickness, fraction of W (matches CSS)
    links.forEach((l, i) => {
      const f = links.length > 1 ? first + (last - first) * i / (links.length - 1) : (first + last) / 2;
      const d = (links.length > 3 ? FIT_CROWDED : FIT) * hullHeight(f);           // ring diameter, fraction of W
      const inner = (d - 2 * line) * W;        // room for the label, in px
      const fit = inner * 0.9 / (0.62 * l.textContent.length);
      l.style.left = (f * 100) + '%';
      l.style.top = (49 - 5 * (f - 0.4)) + '%';
      l.style.width = (d * 100) + '%';
      l.style.fontSize = Math.max(phone ? 10 : 0, Math.min(0.02 * W, fit)) + 'px';
    });
  }
  placeLinks();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeLinks);
  window.addEventListener('resize', placeLinks);

  // phones: the satellite floats lower down, left of centre under your name (not beside the ship).
  // Measured from the bottom of the name/role block so it keeps its place on any screen height.
  const sat = document.getElementById('satellite');
  function placeSatellite() {
    if (!sat) return;
    const nav = document.getElementById('shipnav');
    const text = document.getElementById('heroText');
    if (window.innerWidth > 700 || !nav || !text || !text.offsetHeight) {
      sat.style.left = sat.style.top = sat.style.right = '';      // desktop / tablet: CSS decides
      return;
    }
    const n = nav.getBoundingClientRect(), t = text.getBoundingClientRect();
    const cx = window.innerWidth * 0.266, cy = t.bottom + 105;       // centre of the spot
    sat.style.right = 'auto';
    sat.style.left = (cx - sat.offsetWidth / 2 - n.left) + 'px';
    sat.style.top = (cy - sat.offsetHeight / 2 - 10 - n.top) + 'px'; // -10: leaves room for the label below
  }
  placeSatellite();
  window.addEventListener('resize', placeSatellite);
  window.addEventListener('load', placeSatellite);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeSatellite);
  const heroTextEl = document.getElementById('heroText');
  if (heroTextEl) {
    if (window.ResizeObserver) new ResizeObserver(placeSatellite).observe(heroTextEl);
    if (window.MutationObserver) new MutationObserver(placeSatellite).observe(heroTextEl, { childList: true, characterData: true, subtree: true });
  }
}