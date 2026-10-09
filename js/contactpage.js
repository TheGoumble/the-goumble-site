/* ============================================================
   CONTACT PAGE
   ------------------------------------------------------------
   Owns: the form on contact.html, sending it, and the delivery
   scene: the paper folds in thirds, shrinks into an envelope,
   your arm reaches down out of the sky window, grabs it (the thumb
   piece sits in front, so it looks gripped) and pulls it back up.

   Sending uses Web3Forms (free, no server). Put your access key
   in contact.html: <form id="mail" data-access-key="...">.
   While it still says YOUR_ACCESS_KEY_HERE the page runs in demo
   mode: nothing is sent, the animation just plays so you can test.

   Honest by design: the "delivered" scene only plays after the
   service says the message went through. If it fails, the form
   stays as it was and a message explains what to do.
   ============================================================ */

(function () {
  'use strict';

  const ENDPOINT = 'https://api.web3forms.com/submit';
  const PLACEHOLDER_KEY = 'YOUR_ACCESS_KEY_HERE';

  // arm.png geometry (fractions of its size) -- where the envelope's top edge is gripped,
  // and where the thumb piece sits on the arm (in the arm image's own pixels, 493 x 901)
  const ARM_W = 493, ARM_H = 901;
  const THUMB_DX = 356, THUMB_DY = 631;   // where the thumb piece sits on the arm (arm image pixels)
  // the sky window's upper edges (fractions of sky-window.png): left tip, top point, right tip
  const SKY_L = [0.0036, 0.556], SKY_T = [0.5082, 0.0063], SKY_R = [0.9964, 0.5506];
  const GRIP_X = 0.68, GRIP_Y = 0.795;
  
  const TILT = 18;                        // the drawn arm leans ~18deg (top to the left); turn it clockwise so it hangs straight

  const $ = (id) => document.getElementById(id);
  // this script and contact.html are a pair: if an element is missing, you have an old copy of one of them
  const need = ['scene','mail','stage','folder','envelope','arm','thumb','armClip','thumbClip','done','skyWrap','sky','formMsg','sendBtn','againBtn'];
  const missing = need.filter(id => !document.getElementById(id));
  if (missing.length) { console.error('[contact] contact.html is out of date. Missing ids: ' + missing.join(', ') + '. Replace it with the newest contact.html.'); return; }
  const scene = $('scene'), form = $('mail'), stage = $('stage'), folder = $('folder');
  const envelope = $('envelope'), arm = $('arm'), thumb = $('thumb'), done = $('done');
  const skyWrap = $('skyWrap'), msg = $('formMsg'), sendBtn = $('sendBtn');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- your email, for the plain-email fallback ---------- */
  let myEmail = '';
  fetch('data.json').then(r => r.json()).then(d => {
    myEmail = (d.profile && d.profile.email) || '';
    if (myEmail && $('fallbackMail')) $('fallbackMail').href = 'mailto:' + myEmail;
  }).catch(() => {});
  const fb = $('fallbackMail');
  if (fb) fb.addEventListener('click', (e) => { if (!myEmail) e.preventDefault(); });

  /* ---------- validation ---------- */
  function check() {
    const fields = [$('fName'), $('fEmail'), $('fMessage')];
    let first = null;
    fields.forEach(f => f.removeAttribute('aria-invalid'));
    const bad = (f, text) => { f.setAttribute('aria-invalid', 'true'); if (!first) { first = f; msg.textContent = text; } };
    if (!$('fName').value.trim()) bad($('fName'), 'Please tell me your name.');
    const em = $('fEmail').value.trim();
    if (!em) bad($('fEmail'), 'Please add your email so I can reply.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) bad($('fEmail'), 'That email address does not look right.');
    if ($('fMessage').value.trim().length < 5) bad($('fMessage'), 'Write a short message first.');
    if (first) {
      first.focus();
      stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
      return false;
    }
    return true;
  }

  /* ---------- sending ---------- */
  async function send() {
    const key = form.dataset.accessKey;
    if (!key || key === PLACEHOLDER_KEY) {                     // demo mode: nothing is sent
      console.info('[contact] demo mode: set data-access-key in contact.html to really send.');
      await wait(700);
      return;
    }
    if (form.elements.website.value) return;                   // bot filled the hidden field: pretend it worked
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: key,
        subject: 'New message from ' + $('fName').value.trim() + ' via thegoumble.com',
        from_name: 'The Goumble',
        name: $('fName').value.trim(),
        email: $('fEmail').value.trim(),
        message: $('fMessage').value.trim(),
        botcheck: form.elements.botcheck.checked,
      }),
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok || !data.success) throw new Error(data.message || ('HTTP ' + res.status));
  }

  const setHidden = (el, v) => { if (v) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); };  // SVG has no .hidden property
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    if (!check()) return;
    sendBtn.disabled = true; sendBtn.textContent = 'Sending...';
    try {
      await Promise.all([send(), wait(450)]);
    } catch (err) {
      console.error('[contact] send failed:', err);
      sendBtn.disabled = false; sendBtn.textContent = 'Send transmission';
      msg.innerHTML = 'That did not go through. Please try again' +
        (myEmail ? ', or email me at <a href="mailto:' + myEmail + '">' + myEmail + '</a>.' : '.');
      return;
    }
    deliver();
  });

  /* ---------- the delivery scene ---------- */
  let anims = [], skipped = false, finished = false;

  function run(el, keyframes, opts) {
    const a = el.animate(keyframes, Object.assign({ fill: 'forwards' }, opts));
    anims.push(a);
    return a.finished.catch(() => {});
  }
  const rel = (r, base) => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });

  async function deliver() {
    if (reduceMotion) return showDone();

    scene.classList.add('busy');
    skipped = false; finished = false; anims = [];
    const skip = () => { if (finished) return; skipped = true; anims.forEach(a => { try { a.cancel(); } catch (_) {} }); showDone(); };
    scene.addEventListener('pointerdown', skip, { once: true });
    const alive = () => !skipped;

    // 1. measure the paper, swap in three strips that look like it (with scribbles for your words)
    const card = form.getBoundingClientRect();
    stage.style.height = card.height + 'px';
    folder.style.width = card.width + 'px';
    folder.style.height = card.height + 'px';
    folder.innerHTML = '<div class="panel mid"></div><div class="panel bottom"></div><div class="panel top"></div>';
    folder.hidden = false;
    const top = folder.querySelector('.top'), bottom = folder.querySelector('.bottom');
    await Promise.all([
      run(form, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' }),
      run(folder, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' }),
    ]);
    if (!alive()) return;
    form.style.visibility = 'hidden';

    // 2. fold the bottom third up, then the top third down
    await run(bottom, [{ transform: 'rotateX(0)' }, { transform: 'rotateX(180deg)' }], { duration: 650, easing: 'cubic-bezier(.45,0,.2,1)' });
    if (!alive()) return;
    await run(top, [{ transform: 'rotateX(0)' }, { transform: 'rotateX(-180deg)' }], { duration: 650, easing: 'cubic-bezier(.45,0,.2,1)' });
    if (!alive()) return;

    // 3. the folded strip shrinks and turns into an envelope
    setHidden(envelope, false);
    const stageR = stage.getBoundingClientRect();
    const eR = envelope.getBoundingClientRect();
    const ew = eR.width, eh = eR.height;
    envelope.style.left = (stageR.width / 2 - ew / 2) + 'px';
    envelope.style.top = (card.height / 2 - eh / 2) + 'px';
    const stripH = card.height * 0.337;
    const shrink = ew / card.width;
    await Promise.all([
      run(folder, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(' + shrink + ')', opacity: 0 }], { duration: 480, easing: 'cubic-bezier(.5,0,.2,1)' }),
      run(envelope, [
        { transform: 'scale(' + (card.width / ew) + ',' + (stripH / eh) + ')', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ], { duration: 480, easing: 'cubic-bezier(.5,0,.2,1)' }),
    ]);
    if (!alive()) return;
    folder.hidden = true;

    // 3b. the envelope floats up under the window's middle, where the arm will take it from the other side.
    //     (the arm is measured while invisible, so we know how long it is)
    arm.style.visibility = thumb.style.visibility = 'hidden';
    setHidden(arm, false); setHidden(thumb, false);
    const aw = arm.getBoundingClientRect().width;
    const s = aw / ARM_W;
    const ah = ARM_H * s;
    const gx = GRIP_X * aw, gy = GRIP_Y * ah;
    const skyR = $('sky').getBoundingClientRect();
    const apexX = skyR.left + SKY_T[0] * skyR.width, apexY = skyR.top + SKY_T[1] * skyR.height;
    const e0 = envelope.getBoundingClientRect();
    // the sleeve must reach above the window's top point, so its cut end is never seen
    const wantTop = apexY + (GRIP_Y * ah) * 0.93 - 60;
    const fx = apexX - (e0.left + e0.width / 2), fy = wantTop - e0.top;
    await run(envelope, [{ transform: 'translate(0px,0px)' }, { transform: 'translate(' + fx + 'px,' + fy + 'px)' }], { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)' });
    if (!alive()) return;
    envelope.style.left = (parseFloat(envelope.style.left) + fx) + 'px';
    envelope.style.top = (parseFloat(envelope.style.top) + fy) + 'px';
    envelope.getAnimations().forEach(a => a.cancel());
    anims = anims.filter(a => a.playState !== 'idle');

    // 4. the arm reaches out of the sky window (a portal: it starts hidden above the window, then slides down through it)
    const sceneR = scene.getBoundingClientRect();
    const env = envelope.getBoundingClientRect();
    const sky = skyR;
    const gripX = env.left + env.width / 2 - sceneR.left;     // the envelope's top-centre, in #scene coords
    const gripY = env.top - sceneR.top;

    arm.style.left = (gripX - gx) + 'px';  arm.style.top = (gripY - gy) + 'px';
    arm.style.transformOrigin = gx + 'px ' + gy + 'px';
    arm.style.visibility = thumb.style.visibility = '';
    thumb.style.left = (gripX - gx + THUMB_DX * s) + 'px';  thumb.style.top = (gripY - gy + THUMB_DY * s) + 'px';
    thumb.style.transformOrigin = (gx - THUMB_DX * s) + 'px ' + (gy - THUMB_DY * s) + 'px';

    // the portal cut: everything above the window's upper edges is hidden, so the arm seems to come out of the sky itself
    const pt = (f, ox, oy) => [sky.left + f[0] * sky.width - ox, sky.top + f[1] * sky.height - oy];
    const cut = (ox, oy) => {
      const L = pt(SKY_L, ox, oy), T = pt(SKY_T, ox, oy), R = pt(SKY_R, ox, oy), far = 4000;
      return 'polygon(' + [[-far, L[1]], L, T, R, [far, R[1]], [far, far], [-far, far]].map(p => p[0] + 'px ' + p[1] + 'px').join(',') + ')';
    };
    armClip.style.clipPath = thumbClip.style.clipPath = cut(sceneR.left, sceneR.top);
    const stageBox = stage.getBoundingClientRect();
    stage.style.clipPath = cut(stageBox.left, stageBox.top);

    // start with the whole arm hidden above the window, then slide down through it
    const inside = (sky.top + sky.height * SKY_T[1]) - (sceneR.top + gripY + 0.42 * ah) - 12;   // negative = move up
    const tilt = 'rotate(' + TILT + 'deg)';
    const at = (ty) => 'translate(0px,' + ty + 'px) ' + tilt;
    const lvl = (ty) => 'translate(0px,' + ty + 'px)';          // the envelope stays level; only the arm is turned
    const ease = 'cubic-bezier(.3,.6,.25,1)';
    await Promise.all([
      run(arm,   [{ transform: at(inside) }, { transform: at(0) }], { duration: 1500, easing: ease }),
      run(thumb, [{ transform: at(inside) }, { transform: at(0) }], { duration: 1500, easing: ease }),
    ]);
    if (!alive()) return;

    // 5. grab: the envelope tips with the hand
    await run(envelope, [{ transform: lvl(0) }, { transform: lvl(-5) }], { duration: 230, easing: 'ease-out' });
    if (!alive()) return;
    await wait(120);
    if (!alive()) return;

    // 6. pull it all back into the window
    const out = { duration: 1500, easing: 'cubic-bezier(.55,.05,.7,.45)' };
    await Promise.all([
      run(arm,      [{ transform: at(0) },  { transform: at(inside) }], out),
      run(thumb,    [{ transform: at(0) },  { transform: at(inside) }], out),
      run(envelope, [{ transform: lvl(-5) }, { transform: lvl(inside - 5) }], out),
    ]);
    if (!alive()) return;

    // 7. the window flashes as it takes the letter
    await run(skyWrap, [
      { filter: 'brightness(1)', transform: 'scale(1)' },
      { filter: 'brightness(1.6)', transform: 'scale(1.04)', offset: 0.4 },
      { filter: 'brightness(1)', transform: 'scale(1)' },
    ], { duration: 650, easing: 'ease-in-out' });
    if (!alive()) return;

    scene.removeEventListener('pointerdown', skip);
    showDone();
  }

  function showDone() {
    if (finished) return;
    finished = true;
    if (!stage.style.height) stage.style.height = form.getBoundingClientRect().height + 'px';
    anims.forEach(a => { try { a.cancel(); } catch (_) {} });
    anims = [];
    [arm, thumb, envelope, folder].forEach(el => setHidden(el, true));
    stage.style.clipPath = '';
    form.style.display = 'none';
    done.hidden = false;
    done.classList.add('fade-in');
    const first = done.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  }

  $('againBtn').addEventListener('click', () => {
    finished = false; skipped = false;
    done.hidden = true; done.classList.remove('fade-in');
    form.reset(); form.style.display = ''; form.style.visibility = ''; form.getAnimations().forEach(a => a.cancel());
    form.style.opacity = '';
    stage.style.height = '';
    sendBtn.disabled = false; sendBtn.textContent = 'Send transmission';
    msg.textContent = '';
    scene.classList.remove('busy');
    $('fName').focus();
  });
})();