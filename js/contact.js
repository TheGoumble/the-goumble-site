/* ============================================================
   CONTACT (black hole)
   ------------------------------------------------------------
   Owns: what happens when you click #blackhole. The whole page is
   sucked into the hole (everything spirals toward its centre and
   shrinks), the hole swells to fill the screen, then we go to
   contact.html, which is the black void with the sky window.

   The spinning rings/pulsing core are pure CSS (see contact.css).

   Also: makes the hole keyboard-friendly (Enter / Space), skips the
   animation for people who prefer reduced motion, and resets
   everything if you come back with the browser's Back button.

   Depends on: data.profile.email from data.json (only used as a
   fallback if the transition cannot run). Call AFTER data.json loads.

   Call: initContact(email)
   ============================================================ */

function initContact(email) {
  const hole = document.getElementById('blackhole');
  if (!hole) return;
  const TARGET = 'contact.html';
  const DURATION = 1300;                        // ms the page takes to fall in
  let going = false;

  hole.setAttribute('role', 'link');
  hole.setAttribute('tabindex', '0');
  hole.setAttribute('aria-label', 'Send me a message');

  const pieces = () => Array.from(document.querySelectorAll(
    '#shipnav, #hero, #about, #field, #resume, #contactLabel'));

  function reset() {
    going = false;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    pieces().forEach(el => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; el.style.transformOrigin = ''; });
    hole.style.transition = ''; hole.style.transform = ''; hole.style.zIndex = '';
    const o = document.getElementById('bhOverlay'); if (o) o.remove();
  }

  function go() {
    if (going) return;
    going = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { window.location.href = TARGET; return; }

    const hr = hole.getBoundingClientRect();
    const cx = hr.left + hr.width / 2, cy = hr.top + hr.height / 2;   // hole centre, in the viewport
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // everything falls toward the hole's centre, spinning a little
    pieces().forEach((el, i) => {
      const r = el.getBoundingClientRect();
      el.style.transformOrigin = (cx - r.left) + 'px ' + (cy - r.top) + 'px';
      el.style.transition = 'transform ' + DURATION + 'ms cubic-bezier(.6,0,.9,.35) ' + (i * 40) + 'ms, opacity ' + (DURATION * 0.6) + 'ms ease-in ' + (DURATION * 0.4 + i * 40) + 'ms';
      void el.offsetWidth;
      el.style.transform = 'rotate(' + (i % 2 ? -1 : 1) * 380 + 'deg) scale(0.02)';
      el.style.opacity = '0';
    });

    // the hole stays on top and swells until it covers the screen
    hole.style.zIndex = '60';
    const need = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) * 2 / (hr.width * 0.4) + 2;
    hole.style.transition = 'transform ' + (DURATION * 0.75) + 'ms cubic-bezier(.7,0,.9,.4) ' + (DURATION * 0.45) + 'ms';
    void hole.offsetWidth;
    hole.style.transform = 'scale(' + need + ')';

    // black fades in at the end so the swap to the next page is seamless
    const ov = document.createElement('div');
    ov.id = 'bhOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;z-index:70;pointer-events:none;transition:opacity 350ms ease-in ' + (DURATION * 0.95) + 'ms';
    document.body.appendChild(ov);
    void ov.offsetWidth;
    ov.style.opacity = '1';

    setTimeout(() => { window.location.href = TARGET; }, DURATION * 0.95 + 380);
  }

  hole.addEventListener('click', go);
  hole.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) reset(); });   // Back button (bfcache)
}