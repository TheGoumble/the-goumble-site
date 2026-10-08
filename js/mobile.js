/* ============================================================
   MOBILE
   ------------------------------------------------------------
   Owns: the resume viewer on phones and other devices that can't
   show a PDF inline (they show a blank box). On those devices the
   pages are drawn onto the page with PDF.js so the resume is
   still viewable right there, tapping them opens a full-screen,
   scrollable, zoomed-in view, and an "Open in new tab" button is
   added as a backup. If PDF.js can't load or the PDF can't be
   drawn, the viewer falls back to a note plus that button.
   (Desktop browsers keep the normal embedded PDF viewer.)

   Moves on its own: nothing. PDF.js (about 300 KB) is only loaded
   when the resume section is close to the screen.

   Depends on: .resume-viewer (with an <object data="...pdf">) and
   the PDF at that address. PDF.js comes from cdnjs. Styles live in
   css/mobile.css.

   Call: starts by itself when the page loads.
   ============================================================ */

(function () {
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

  function needsFallback() {
    return navigator.pdfViewerEnabled === false ||
      (window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 900);
  }

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error('pdf.js did not load'));
      document.head.appendChild(s);
    });
  }

  let pdfDoc = null;
  function getDoc(url) {
    if (!pdfDoc) pdfDoc = loadPdfJs().then(pdfjs => pdfjs.getDocument(url).promise);
    return pdfDoc;
  }

  // draw every page into `box`, `cssWidth` px wide, sharp on high-density screens
  async function drawPages(url, box, cssWidth, inline) {
    const pdf = await getDoc(url);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (cssWidth / base.width) * dpr });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.style.width = inline ? '100%' : cssWidth + 'px';   // inline: always fit the box; zoom: fixed wide size
      canvas.style.height = 'auto';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Resume, page ' + n + ' of ' + pdf.numPages);
      box.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    }
  }

  // full-screen zoomed view: pages drawn about 2.4x wider than the screen, scroll or pinch around them
  function openZoom(url, opener) {
    const overlay = document.createElement('div');
    overlay.className = 'pdf-zoom';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Resume, zoomed in');
    const bar = document.createElement('div');
    bar.className = 'pdf-zoom-bar';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'resume-btn pdf-zoom-close';
    close.textContent = 'Close';
    bar.appendChild(close);
    const body = document.createElement('div');
    body.className = 'pdf-zoom-body';
    const pages = document.createElement('div');
    pages.className = 'pdf-zoom-pages';
    body.appendChild(pages);
    overlay.append(bar, body);
    document.body.appendChild(overlay);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function shut() {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      overlay.remove();
      if (opener) opener.focus();
    }
    function onKey(e) { if (e.key === 'Escape') shut(); }
    document.addEventListener('keydown', onKey);
    close.addEventListener('click', shut);
    close.focus();

    const w = Math.round(Math.max(760, Math.min(window.innerWidth * 2.4, 1400)));
    drawPages(url, pages, w).catch(() => {
      pages.textContent = 'The resume couldn’t be shown here. Use “Open in new tab”.';
    });
  }

  function fixResumeViewer() {
    const viewer = document.querySelector('.resume-viewer');
    if (!viewer || !needsFallback()) return;
    const obj = viewer.querySelector('object');
    const url = (obj && obj.getAttribute('data') || 'assets/resume.pdf').split('#')[0];

    // backup button: open the real PDF in its own tab (placed right under the viewer)
    const open = document.createElement('a');
    open.className = 'resume-btn resume-open';
    open.href = url;
    open.target = '_blank';
    open.rel = 'noopener';
    open.textContent = 'Open in new tab';
    viewer.insertAdjacentElement('afterend', open);
    const hint = document.createElement('p');
    hint.className = 'pdf-hint';
    hint.textContent = 'Tap the resume to zoom in';
    viewer.insertAdjacentElement('afterend', hint);

    const showFallback = () => {
      viewer.classList.remove('pdf-pages');
      viewer.classList.add('no-inline-pdf');
      viewer.innerHTML = '<p>The resume couldn’t be shown here. Use the button below to open it.</p>';
    };

    // swap the (blank) embedded viewer for drawn pages, but only once the section is close
    let started = false;
    function start() {
      if (started) return;
      started = true;
      viewer.classList.add('pdf-pages');
      viewer.innerHTML = '<p class="pdf-status">Loading resume…</p>';
      const pages = document.createElement('div');
      pages.className = 'pdf-canvases';
      viewer.appendChild(pages);
      drawPages(url, pages, viewer.clientWidth || 320, true)
        .then(() => {
          const st = viewer.querySelector('.pdf-status'); if (st) st.remove();
          // tap the resume to zoom
          viewer.tabIndex = 0;
          viewer.setAttribute('role', 'button');
          viewer.setAttribute('aria-label', 'Resume. Tap to zoom in.');
          viewer.addEventListener('click', () => openZoom(url, viewer));
          viewer.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZoom(url, viewer); } });
        })
        .catch(showFallback);
    }
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '600px 0px' });
      io.observe(viewer);
    } else {
      start();
    }
  }

  function start() { fixResumeViewer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();