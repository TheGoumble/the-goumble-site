function initNav(navItems) {
  const container = document.getElementById('navLinks');
  const toggle = document.getElementById('navToggle');
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
      container.classList.add('closed'); // auto-close mobile menu after a click
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
  const FIRST = 0.42, LAST = 0.72;   // centres of the first / last ring (fraction of ship width)
  const FIT = 0.92;                  // ring diameter as a share of the hull height

  function placeLinks() {
    const links = [...container.querySelectorAll('.nav-link')];
    if (window.innerWidth <= 700) {            // mobile dropdown: CSS lays them out
      links.forEach(l => { l.style.left = l.style.top = l.style.width = l.style.fontSize = ''; });
      return;
    }
    const W = container.clientWidth;
    const line = 0.0105;                       // ring thickness, fraction of W (matches CSS)
    links.forEach((l, i) => {
      const f = links.length > 1 ? FIRST + (LAST - FIRST) * i / (links.length - 1) : (FIRST + LAST) / 2;
      const d = FIT * hullHeight(f);           // ring diameter, fraction of W
      const inner = (d - 2 * line) * W;        // room for the label, in px
      const fit = inner * 0.9 / (0.62 * l.textContent.length);
      l.style.left = (f * 100) + '%';
      l.style.top = (49 - 5 * (f - 0.4)) + '%';
      l.style.width = (d * 100) + '%';
      l.style.fontSize = Math.min(0.02 * W, fit) + 'px';
    });
  }
  placeLinks();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeLinks);
  window.addEventListener('resize', placeLinks);

  toggle.addEventListener('click', () => {
    container.classList.toggle('closed');
  });

  // start collapsed on mobile widths
  if (window.innerWidth <= 700) container.classList.add('closed');
}