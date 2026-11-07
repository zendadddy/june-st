/* Site-level behaviors added on top of the Webflow export. Loaded on every page after the Webflow scripts. */
(function () {
  var nav = document.querySelector('.navigation');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 0. Password gate (modal) ----------
     Every project page needs the password (the /projects overview is open). While locked, clicking a link to one opens a white modal over the
     current page instead of navigating. The right password unlocks everything for 72 hours in this browser.
     Opening a project URL directly redirects to index.html?gate=<page>, which opens the modal on load.
     Soft protection: the check runs in the browser. Change the password by replacing PASS_HASH (SHA-256 of the lowercase password). */
  var siteRoot = (function () { try { return new URL('../../', document.currentScript.src); } catch (e) { return new URL('./', location.href); } })();
  var gate = (function () {
    var PASS_HASH = 'b534e1e550a346e0f8b2dcbd974453332682d8f6fe8b103d904fbde0e492e8cc'; // sha256("famouslastname")
    var HOURS = 72, KEY = 'fb-unlock', GATED = /^projects\/[a-z0-9-]+\.html$/; // individual project pages; /projects itself is open
    function unlocked() { try { return +localStorage.getItem(KEY) > Date.now(); } catch (e) { return false; } }
    // reset: open any page with #lock (or ?lock) to clear the 72-hour unlock in this browser
    function relock() {
      if (location.hash !== '#lock' && !new URLSearchParams(location.search).has('lock')) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      try { var q0 = new URLSearchParams(location.search); q0.delete('lock'); var qs = q0.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
    }
    relock(); window.addEventListener('hashchange', relock);
    function relOf(href) { try { var u = new URL(href, location.href); if (u.origin !== siteRoot.origin) return null; return u.pathname.slice(siteRoot.pathname.length); } catch (e) { return null; } }
    function hex(a) { return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
    function sha256Fallback(m) { // for pages opened from disk, where crypto.subtle is unavailable
      var K = [], H = [], i, j; function frac(x) { return (x - Math.floor(x)) * 4294967296 | 0; }
      for (var c = 2, n = 0; n < 64; c++) { for (j = 2; j * j <= c; j++) if (c % j === 0) break; if (j * j > c) { if (n < 8) H[n] = frac(Math.pow(c, 1 / 2)); K[n++] = frac(Math.pow(c, 1 / 3)); } }
      var l = m.length, words = []; for (i = 0; i < l; i++) words[i >> 2] |= m[i] << (24 - (i % 4) * 8);
      words[l >> 2] |= 0x80 << (24 - (l % 4) * 8); words[((l + 8 >> 6) << 4) + 15] = l * 8;
      function r(x, s) { return (x >>> s) | (x << (32 - s)); }
      for (i = 0; i < words.length; i += 16) {
        var w = [], a = H.slice(0);
        for (j = 0; j < 64; j++) {
          if (j < 16) w[j] = words[i + j] | 0; else { var s0 = r(w[j - 15], 7) ^ r(w[j - 15], 18) ^ (w[j - 15] >>> 3), s1 = r(w[j - 2], 17) ^ r(w[j - 2], 19) ^ (w[j - 2] >>> 10); w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0; }
          var t1 = (a[7] + (r(a[4], 6) ^ r(a[4], 11) ^ r(a[4], 25)) + ((a[4] & a[5]) ^ (~a[4] & a[6])) + K[j] + w[j]) | 0, t2 = ((r(a[0], 2) ^ r(a[0], 13) ^ r(a[0], 22)) + ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]))) | 0;
          a = [(t1 + t2) | 0].concat(a.slice(0, 7)); a[4] = (a[4] + t1) | 0;
        }
        for (j = 0; j < 8; j++) H[j] = (H[j] + a[j]) | 0;
      }
      return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
    }
    function sha256(str) { var b = new TextEncoder().encode(str); if (window.crypto && crypto.subtle) return crypto.subtle.digest('SHA-256', b).then(function (d) { return hex(new Uint8Array(d)); }); return Promise.resolve(sha256Fallback(b)); }

    var modal = null, next = 'projects.html', lastFocus = null;
    function build() {
      modal = document.createElement('div');
      modal.className = 'gate-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'gate-title'); modal.hidden = true;
      modal.innerHTML = '<div class="gate-modal_backdrop" data-gate-close></div>' +
        '<div class="gate-modal_card">' +
          '<button type="button" class="gate-modal_close" aria-label="Close" data-gate-close><svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.25"/></svg></button>' +
          '<div class="u-vflex-center-top u-vgap-12"><h2 id="gate-title" class="u-align-center">Private <span class="h2 cc-alt">work</span></h2><p class="u-align-center u-color-secondary">My projects are under wraps for now.</p></div>' +
          '<form class="form u-vflex-right-top gate-modal_form" autocomplete="off" novalidate>' +
            '<div class="input-group u-w-100"><label for="gate-pass" class="u-sr-only">Password</label><input class="input w-input" type="password" id="gate-pass" placeholder="Password" required></div>' +
            '<p class="gate-modal_error eyebrow-sm" role="alert" hidden>That’s not it. Try again?</p>' +
            '<input type="submit" class="btn w-button" value="Unlock">' +
          '</form>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelectorAll('[data-gate-close]').forEach(function (el) { el.addEventListener('click', close); });
      var form = modal.querySelector('form'), input = modal.querySelector('input[type=password]'), err = modal.querySelector('.gate-modal_error'), card = modal.querySelector('.gate-modal_card');
      form.addEventListener('submit', function (e) {
        e.preventDefault(); err.hidden = true;
        sha256(input.value.trim().toLowerCase()).then(function (h) {
          if (h !== PASS_HASH) { err.hidden = false; card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake'); input.select(); return; }
          try { localStorage.setItem(KEY, String(Date.now() + HOURS * 3600 * 1000)); } catch (x) {}
          var a = document.createElement('a'); a.href = new URL(next, siteRoot).href; document.body.appendChild(a); a.click(); // continue through the page wave
        });
      });
      modal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { close(); return; }
        if (e.key !== 'Tab') return; // keep focus inside the modal
        var f = modal.querySelectorAll('button, input'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }
    function open(to) {
      if (!modal) build();
      next = GATED.test(to || '') ? to : 'projects.html';
      lastFocus = document.activeElement;
      modal.querySelector('.gate-modal_error').hidden = true; modal.querySelector('input[type=password]').value = '';
      modal.hidden = false; document.documentElement.classList.add('has-gate');
      try { if (typeof lenis !== 'undefined' && lenis.stop) lenis.stop(); } catch (e) {}
      requestAnimationFrame(function () { modal.classList.add('is-open'); setTimeout(function () { modal.querySelector('input[type=password]').focus(); }, 60); });
    }
    function close() {
      if (!modal || modal.hidden) return;
      modal.classList.remove('is-open'); document.documentElement.classList.remove('has-gate');
      try { if (typeof lenis !== 'undefined' && lenis.start) lenis.start(); } catch (e) {}
      setTimeout(function () { modal.hidden = true; }, 450);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    // intercept gated links before the page-wave handler sees them
    document.addEventListener('click', function (e) {
      if (unlocked() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      var rel = relOf(a.getAttribute('href')); if (!rel || !GATED.test(rel)) return;
      e.preventDefault(); e.stopImmediatePropagation(); open(rel);
    }, true);
    // arriving from a gated page that redirected here
    var q = new URLSearchParams(location.search), want = q.get('gate');
    if (want !== null && !unlocked()) { open(want); try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} }
    return { open: open, close: close, unlocked: unlocked };
  })();

  /* ---------- 1. Always start a new page at the top ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);
  window.addEventListener('load', function () { if (!location.hash && window.scrollY > 0 && !window.__userScrolled) window.scrollTo(0, 0); });
  ['wheel', 'touchmove', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { window.__userScrolled = true; }, { once: true, passive: true }); });
  window.addEventListener('pageshow', function (e) { if (e.persisted && !location.hash) window.scrollTo(0, 0); });

  /* ---------- 2. Page transition ----------
     Leaving: a soft white wave rises from the bottom; we navigate only once the screen is covered.
     Arriving: the new page stays hidden on the same white until its fonts and visible images are in,
     then the white lifts away. A tiny script in <head> sets html.is-arriving before first paint. */
  var root = document.documentElement;
  var wipe = document.createElement('div');
  wipe.className = 'page-wipe';
  wipe.innerHTML = '<svg class="page-wipe_wave" viewBox="0 0 1440 36" preserveAspectRatio="none" aria-hidden="true"><path d="M0,22 C480,8 960,8 1440,22 L1440,36 L0,36 Z"/></svg><div class="page-wipe_body"></div>';
  document.body.appendChild(wipe);

  function toTop() {
    window.scrollTo(0, 0);
    try { if (typeof lenis !== 'undefined' && lenis.scrollTo) lenis.scrollTo(0, { immediate: true, force: true }); } catch (err) {}
  }
  function reveal() {
    toTop();
    // put the white cover up instantly, show the page underneath, then lift the cover away
    wipe.classList.add('is-covering');
    root.classList.remove('is-arriving');
    try { if (window.ScrollTrigger) ScrollTrigger.refresh(); } catch (err) {}
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      wipe.classList.remove('is-covering'); wipe.classList.add('is-leaving');
      var end = function () { wipe.classList.remove('is-leaving'); };
      wipe.addEventListener('transitionend', function (e) { if (e.target === wipe) end(); }, { once: true });
      setTimeout(end, 1200);
    }); });
  }
  if (root.classList.contains('is-arriving')) {
    if (reduce) { root.classList.remove('is-arriving'); }
    else {
      // ready = fonts loaded and every image currently in view loaded; never wait longer than 1.6s
      var waits = [], vh = window.innerHeight, revealed = false;
      if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
      document.querySelectorAll('.page-wrapper img').forEach(function (im) {
        var r = im.getBoundingClientRect();
        if (r.top < vh && r.bottom > -50 && !im.complete) { im.loading = 'eager'; waits.push(new Promise(function (res) { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); })); }
      });
      Promise.race([Promise.all(waits), new Promise(function (res) { setTimeout(res, 1600); })]).then(function () { if (!revealed) { revealed = true; reveal(); } });
    }
  }

  // Leaving
  function isInternal(a) {
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download') || a.hasAttribute('data-no-wipe')) return false;
    try { var u = new URL(href, location.href); return u.origin === location.origin && (u.pathname !== location.pathname || u.hash === ''); } catch (err) { return false; }
  }
  // Prefetch: on hover/touch for any internal link, and the nav pages once this page is idle
  var fetched = {};
  function prefetch(url) {
    var u = url.split('#')[0]; if (fetched[u] || u === location.href.split('#')[0]) return; fetched[u] = true;
    var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u; l.as = 'document'; document.head.appendChild(l);
  }
  ['pointerenter', 'touchstart', 'focusin'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { var a = e.target.closest && e.target.closest('a'); if (a && isInternal(a)) prefetch(a.href); }, { passive: true, capture: true });
  });
  window.addEventListener('load', function () {
    var idle = window.requestIdleCallback || function (f) { setTimeout(f, 1200); };
    idle(function () { document.querySelectorAll('.navigation a[href], .nav_sun[href]').forEach(function (a) { if (isInternal(a)) prefetch(a.href); }); });
  });

  var leaving = false;
  document.addEventListener('click', function (e) {
    if (reduce || leaving || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a'); if (!a || !isInternal(a)) return;
    e.preventDefault(); leaving = true;
    var href = a.href; prefetch(href);
    try { sessionStorage.setItem('fb-arrive', '1'); } catch (err) {}
    wipe.classList.add('is-entering');
    var gone = false;
    var go = function () { if (!gone) { gone = true; location.href = href; } };
    wipe.addEventListener('transitionend', function (ev) { if (ev.target === wipe) go(); }, { once: true });
    setTimeout(go, 900);
  });
  // Back/forward cache: a page restored mid-wipe should be uncovered
  window.addEventListener('pageshow', function (e) { if (e.persisted) { leaving = false; wipe.classList.remove('is-entering', 'is-covering', 'is-leaving'); root.classList.remove('is-arriving'); } });

  /* ---------- 2b. Header sun: ease its spin to a stop on hover ---------- */
  var sun = document.querySelector('.nav_sun');
  if (sun) {
    function sunTimelines() {
      if (typeof gsap === 'undefined') return [];
      var els = sun.querySelectorAll('svg g'), seen = [], out = [];
      els.forEach(function (g) {
        gsap.getTweensOf(g).forEach(function (t) {
          var tl = (t.parent && t.parent !== gsap.globalTimeline && !t.parent.scrollTrigger) ? t.parent : t;
          if (tl.scrollTrigger || (t.vars && t.vars.scrollTrigger)) return; // leave the scroll-linked turn alone
          if (seen.indexOf(tl) === -1) { seen.push(tl); out.push(tl); }
        });
      });
      return out;
    }
    sun.addEventListener('mouseenter', function () { sunTimelines().forEach(function (tl) { gsap.to(tl, { timeScale: 0, duration: .8, ease: 'power2.out', overwrite: true }); }); });
    sun.addEventListener('mouseleave', function () { sunTimelines().forEach(function (tl) { gsap.to(tl, { timeScale: 1, duration: 1.2, ease: 'power2.in', overwrite: true }); }); });
  }

  /* ---------- 3. Nav: stays in view; scroll drives the backdrop color sampling ---------- */
  var lastY = window.scrollY, hidden = false, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    var dy = y - lastY;
    if (nav) {
    }
    lastY = y;
    sampleBackdrop();
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });

  /* ---------- 4. Nav gradient follows whatever is behind it ----------
     Samples three points just under the nav (left, centre, right). For photos it reads the pixels actually under each point,
     taking object-fit cropping into account. The three colours become a left-to-right gradient that fades downward. */
  var sampleCanvas = document.createElement('canvas'); sampleCanvas.width = 6; sampleCanvas.height = 6;
  var sctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  var lastKey = null;
  function parseRGBA(str) { var m = /rgba?\(([^)]+)\)/.exec(str || ''); if (!m) return null; var p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  function avgRegion(img, sx, sy, sw, sh) {
    try {
      sctx.clearRect(0, 0, 6, 6); sctx.drawImage(img, sx, sy, Math.max(1, sw), Math.max(1, sh), 0, 0, 6, 6);
      var d = sctx.getImageData(0, 0, 6, 6).data, r = 0, g = 0, b = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) { if (d[i + 3] < 10) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      return n ? { r: r / n, g: g / n, b: b / n, a: 1 } : null;
    } catch (err) { return null; }
  }
  // the part of an <img> that is drawn under screen point (x, y)
  function imageAt(img, x, y) {
    var nw = img.naturalWidth, nh = img.naturalHeight; if (!nw || !nh) return null;
    var r = img.getBoundingClientRect(), fit = getComputedStyle(img).objectFit, s, ox = 0, oy = 0, sx, sy;
    if (fit === 'cover' || fit === 'contain') {
      s = fit === 'cover' ? Math.max(r.width / nw, r.height / nh) : Math.min(r.width / nw, r.height / nh);
      ox = (r.width - nw * s) / 2; oy = (r.height - nh * s) / 2;
      sx = (x - r.left - ox) / s; sy = (y - r.top - oy) / s;
    } else { sx = (x - r.left) / r.width * nw; sy = (y - r.top) / r.height * nh; s = r.width / nw; }
    var bw = Math.max(4, 90 / s), bh = Math.max(4, 40 / s); // about 90 x 40 screen pixels around the point
    sx = Math.max(0, Math.min(nw - bw, sx - bw / 2)); sy = Math.max(0, Math.min(nh - bh, sy - bh / 2));
    return avgRegion(img, sx, sy, bw, bh);
  }
  var imgCache = {};
  function cachedImage(src) { if (!imgCache[src]) { var im = new Image(); im.src = src; imgCache[src] = im; } return imgCache[src]; }
  function gradientAt(bi, el, y) {
    var m = /linear-gradient\(([^]*)\)/.exec(bi); if (!m) return null;
    var stops = [], re = /(rgba?\([^)]+\))\s*([\d.]+%)?/g, s;
    while ((s = re.exec(m[1]))) { var c = parseRGBA(s[1]); if (c) stops.push({ c: c, p: s[2] ? parseFloat(s[2]) / 100 : null }); }
    if (!stops.length) return null;
    if (stops[0].p === null) stops[0].p = 0;
    if (stops[stops.length - 1].p === null) stops[stops.length - 1].p = 1;
    for (var i = 1; i < stops.length - 1; i++) if (stops[i].p === null) { // spread unpositioned stops evenly
      var j = i; while (stops[j].p === null) j++;
      for (var k = i; k < j; k++) stops[k].p = stops[i - 1].p + (stops[j].p - stops[i - 1].p) * (k - i + 1) / (j - i + 1);
    }
    var r = el.getBoundingClientRect(), t = Math.max(0, Math.min(1, (y - r.top) / Math.max(1, r.height)));
    for (var n = 0; n < stops.length - 1; n++) {
      var a = stops[n], b = stops[n + 1];
      if (t <= b.p || n === stops.length - 2) {
        var f = b.p > a.p ? Math.max(0, Math.min(1, (t - a.p) / (b.p - a.p))) : 0;
        var out = { r: a.c.r + (b.c.r - a.c.r) * f, g: a.c.g + (b.c.g - a.c.g) * f, b: a.c.b + (b.c.b - a.c.b) * f, a: a.c.a + (b.c.a - a.c.a) * f };
        return out.a > .5 ? out : null;
      }
    }
    return null;
  }
  function colorAt(x, y) {
    nav.style.pointerEvents = 'none';
    var stack = document.elementsFromPoint(x, y);
    nav.style.pointerEvents = '';
    for (var k = 0; k < stack.length; k++) {
      var el = stack[k];
      if (nav.contains(el) || el === nav) continue;
      if (el.closest && el.closest('.page-wipe, .totop, .gate-modal')) continue;
      if (el.tagName === 'IMG' && el.complete) { var c0 = imageAt(el, x, y); if (c0) return c0; continue; }
      if (el.tagName === 'VIDEO' || el.tagName === 'IFRAME') return { r: 46, g: 46, b: 46, a: 1 };
      if (el.tagName === 'CANVAS') continue;
      var cs = getComputedStyle(el);
      if (parseFloat(cs.opacity) < .5) continue;
      var bg = parseRGBA(cs.backgroundColor);
      if (bg && bg.a > 0.5) return bg;
      var bi = cs.backgroundImage;
      if (bi && bi !== 'none') {
        var urlm = /url\(["']?([^"')]+)["']?\)/.exec(bi);
        if (urlm) { var im = cachedImage(urlm[1]); if (im && im.complete && im.naturalWidth) { var er = el.getBoundingClientRect(); var c1 = avgRegion(im, (x - er.left) / er.width * im.naturalWidth - 20, (y - er.top) / er.height * im.naturalHeight - 10, 40, 20); if (c1) return c1; } }
        // a top-to-bottom CSS gradient: find the colour at this height from all of its stops
        var gc = gradientAt(bi, el, y);
        if (gc) return gc;
      }
    }
    var html = parseRGBA(getComputedStyle(document.documentElement).backgroundColor);
    return html && html.a > 0.5 ? html : { r: 250, g: 250, b: 250, a: 1 };
  }
  function sampleBackdrop() {
    if (!nav) return;
    var r = nav.getBoundingClientRect(), w = document.documentElement.clientWidth;
    var y = Math.min(window.innerHeight - 2, r.bottom + 4);
    var cols = [.12, .5, .88].map(function (f) { return colorAt(Math.round(w * f), y); });
    var key = cols.map(function (c) { return Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b); }).join('|');
    if (key === lastKey) return; lastKey = key;
    ['--nav-l', '--nav-c', '--nav-r'].forEach(function (v, i) { var c = cols[i]; nav.style.setProperty(v, 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')'); });
    var lum = cols.reduce(function (s, c) { return s + (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255; }, 0) / 3;
    nav.classList.toggle('is-on-dark', lum < 0.45);
  }
  /* ---------- 5. Playground ----------
     Full-bleed grid of photos. It starts as a loose fan of large prints, pins, deals into the grid as you scroll, then holds.
     Hover works at every stage: the card under the pointer glides to the center, larger, above the rest. */
  function initPlayground(pg) {
    var grid = pg.querySelector('.pg_grid'), track = pg.querySelector('.pg_track'), stage = pg.querySelector('.pg_sticky');
    var allSlots = Array.prototype.slice.call(pg.querySelectorAll('.pg_slot'));
    if (!grid || !track || !allSlots.length) return;
    var slots = [], cards = [], homes = [], jitter = [], rest = [], pinH = 0, focus = -1;
    var cur = 0, target = 0, ticking = false, pointer = null, latched = false, floating = false, idle = 0;
    var canHover = window.matchMedia('(hover: hover)').matches;
    function rnd(n, k) { var s = Math.sin(n * k) * 43758.5453; return s - Math.floor(s); }
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function progress() {
      var vh = window.innerHeight, p;
      if (pinH) { var top = parseFloat(pg.style.getPropertyValue('--pg-top')) || 0; p = ((top - track.getBoundingClientRect().top) / pinH - .12) / .76; }
      else { p = (vh * .8 - grid.getBoundingClientRect().top) / (vh * .7); }
      return Math.max(0, Math.min(1, p));
    }
    function measure() {
      slots = allSlots.filter(function (s) { return s.offsetParent !== null; });
      cards = slots.map(function (s) { return s.querySelector('.pg_card'); });
      allSlots.forEach(function (s) { s.querySelector('.pg_card').style.transform = 'none'; });
      var vh = window.innerHeight, gh = grid.getBoundingClientRect().height;
      var canPin = gh < vh * .92;
      pg.classList.toggle('is-pinned', canPin);
      pinH = canPin ? Math.round(vh * 1.1) : 0;
      track.style.height = canPin ? (gh + pinH) + 'px' : '';
      pg.style.setProperty('--pg-top', Math.max(12, (vh - gh) / 2) + 'px');
      var gr = grid.getBoundingClientRect(), cx = gr.left + gr.width / 2, cy = gr.top + gr.height / 2;
      homes = cards.map(function (c) { var r = c.getBoundingClientRect(); return { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) }; });
      // the pile: six large prints in a loose fan; the rest slide in from the sides
      var spread = Math.min(gr.width * .45, 860), vw = document.documentElement.clientWidth, FAN = 6;
      jitter = cards.map(function (c, n) {
        var w = c.offsetWidth || 1, h = c.offsetHeight || 1, rot = (rnd(n, 12.9898) - .5) * 8;
        if (n < FAN) { // the opening fan: a few large prints spaced evenly around the centre, with a little wobble
          var order = [2, 0, 4, 1, 5, 3][n], fx = (order / (FAN - 1) - .5) * spread * .7 + (rnd(n, 78.233) - .5) * 40;
          return { sx: homes[n].x + fx, sy: homes[n].y + (rnd(n, 39.425) - .5) * vh * .06, rot: rot, s: (vh * .42) / Math.sqrt(w * h) };
        }
        // everything else waits just off the nearest side of the screen, at its own row height
        var sr = slots[n].getBoundingClientRect(), cxs = sr.left + sr.width / 2, side = cxs < vw / 2 ? -1 : 1;
        var off = side < 0 ? -(cxs + w * .7 + rnd(n, 7.13) * 60) : (vw - cxs) + w * .7 + rnd(n, 7.13) * 60;
        return { sx: off, sy: (rnd(n, 39.425) - .5) * vh * .08, rot: rot * .6, s: 1.05 };
      });
      cur = target = progress();
      layout();
    }
    // where each card sits when it is not the focused one (offset from its slot, scale)
    function restOf(n, p, N) {
      var local = Math.max(0, Math.min(1, p * 1.25 - (N > 1 ? n / (N - 1) : 0) * .25));
      var k = 1 - ease(local), h0 = homes[n], jt = jitter[n];
      return { tx: jt.sx * k, ty: jt.sy * k, rot: jt.rot * k, s: 1 + (jt.s - 1) * k };
    }
    function layout() {
      if (!homes.length) return;
      var N = cards.length;
      pg.classList.toggle('is-settled', cur >= .985);
      cards.forEach(function (c, n) {
        var r = restOf(n, cur, N); rest[n] = r;
        if (n === focus) {
          var sr = slots[n].getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
          var s = Math.min(window.innerHeight * .62 / h, window.innerWidth * .42 / w);
          var dx = window.innerWidth / 2 - (sr.left + sr.width / 2), dy = window.innerHeight / 2 - (sr.top + sr.height / 2);
          c.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')';
        } else {
          c.style.transform = 'translate3d(' + r.tx.toFixed(1) + 'px,' + r.ty.toFixed(1) + 'px,0) rotate(' + r.rot.toFixed(2) + 'deg) scale(' + r.s.toFixed(3) + ')';
        }
      });
    }
    // which card's resting footprint is under the pointer (top-most first; the focused card is judged by its resting place too)
    function hitTest(x, y) {
      for (var n = 0; n < cards.length; n++) {
        var r = rest[n]; if (!r) continue;
        var sr = slots[n].getBoundingClientRect(), c = cards[n];
        var w = c.offsetWidth * r.s / 2, h = c.offsetHeight * r.s / 2;
        var cx = sr.left + sr.width / 2 + r.tx, cy = sr.top + sr.height / 2 + r.ty;
        if (x >= cx - w && x <= cx + w && y >= cy - h && y <= cy + h) return n;
      }
      return -1;
    }
    function animate(c) { c.classList.add('is-moving'); clearTimeout(c._mv); c._mv = setTimeout(function () { c.classList.remove('is-moving'); }, 750); }
    function setFocus(n) {
      if (focus === n) return;
      if (focus > -1 && cards[focus]) { cards[focus].classList.remove('is-focus'); animate(cards[focus]); }
      focus = n;
      pg.classList.toggle('has-focus', n > -1);
      if (n > -1) { cards[n].classList.add('is-focus'); animate(cards[n]); }
      stage.style.cursor = n > -1 ? 'zoom-in' : '';
      layout();
    }
    function updateHover() { if (!pointer) return; if (cur < .8) { setFocus(-1); return; } setFocus(hitTest(pointer.x, pointer.y)); } // hover only once the grid is 80% dealt
    if (canHover) {
      stage.addEventListener('pointermove', function (e) { pointer = { x: e.clientX, y: e.clientY }; updateHover(); });
      stage.addEventListener('pointerleave', function () { pointer = null; setFocus(-1); });
    }
    // ease the shown progress toward the scroll position so wheel and trackpad steps don't judder
    function tick() {
      var d = target - cur;
      if (Math.abs(d) < .0008) { cur = target; ticking = false; floating = false; layout(); updateHover(); return; }
      cur += d * (floating ? .05 : .12); layout(); updateHover(); requestAnimationFrame(tick);
    }
    // when the visitor rests mid-way through the pin, the photos float on into the grid by themselves
    function kick() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
    window.addEventListener('scroll', function () {
      var p = progress();
      if (p <= .001) latched = false;
      target = latched ? 1 : p;
      if (!floating) kick();
      clearTimeout(idle);
      idle = setTimeout(function () {
        var q = progress();
        if (pinH && q > .001 && q < .999 && !latched) { latched = true; floating = true; target = 1; kick(); }
      }, 1000);
    }, { passive: true });
    window.addEventListener('resize', function () { setFocus(-1); measure(); });
    window.addEventListener('load', measure);
    allSlots.forEach(function (s) { var im = s.querySelector('img'); if (im && !im.complete) im.addEventListener('load', measure, { once: true }); });
    measure();
  }
  if (!reduce) document.querySelectorAll('[data-playground]').forEach(initPlayground);

  /* Footer clouds: fade in once loaded */
  document.querySelectorAll('img.footer_bg').forEach(function (im) {
    var done = function () { im.classList.add('is-loaded'); };
    if (im.complete && im.naturalWidth) done(); else { im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true }); }
  });

  /* ---------- 6. Contact: live LA cams over the mirror photo ---------- */
  var cam = document.querySelector('[data-livecam]');
  if (cam) {
    var list; try { list = JSON.parse(cam.getAttribute('data-livecam')); } catch (err) { list = []; }
    var slides = [{ id: null, place: 'Los Angeles' }].concat(list);
    var screen = cam.querySelector('.livecam_screen'), placeEl = cam.querySelector('.livecam_place'), src = cam.querySelector('.livecam_src');
    var idx = 0, player = null, dead = {}, apiReady = false, dir = 1;
    function label(s) { placeEl.textContent = s.id ? 'Live · ' + s.place : s.place; if (s.id) src.href = 'https://www.youtube.com/watch?v=' + s.id; }
    function show(i) {
      var n = slides.length, guard = 0; idx = (i + n) % n;
      while (slides[idx].id && dead[slides[idx].id] && guard++ < n) idx = (idx + dir + n) % n;
      var s = slides[idx]; label(s); cam.classList.remove('is-live');
      if (!s.id) { if (player && player.pauseVideo) player.pauseVideo(); return; }
      if (!player) {
        var host = document.createElement('div'); screen.appendChild(host);
        player = new YT.Player(host, { host: 'https://www.youtube-nocookie.com', videoId: s.id,
          playerVars: { autoplay: 1, mute: 1, controls: 0, playsinline: 1, modestbranding: 1, rel: 0, iv_load_policy: 3, disablekb: 1 },
          events: {
            onReady: function (e) { e.target.mute(); e.target.playVideo(); },
            onStateChange: function (e) { if (e.data === 1 && slides[idx].id) cam.classList.add('is-live'); },
            // offline, removed or not embeddable: remember it and move on in the same direction
            onError: function () { dead[slides[idx].id] = true; show(idx + dir); }
          } });
      } else { player.loadVideoById(s.id); }
    }
    cam.querySelectorAll('.livecam_btn').forEach(function (b) { b.addEventListener('click', function () { if (!apiReady) return; dir = +b.getAttribute('data-dir'); show(idx + dir); }); });
    // Load YouTube's player API. If it never arrives (blocked network, sandboxed preview), the photo stays and the arrows stay hidden.
    var prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prevReady) prevReady(); apiReady = true; cam.classList.add('is-ready'); label(slides[0]); };
    var tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; tag.async = true; document.head.appendChild(tag);
  }

  /* ---------- 7. Project thumbnails: a single glitched frame on hover ----------
     Effect is set on <body data-thumb-hover="mosh|pixelate|dither"> (default: mosh). Hover shows one fixed glitched frame; leaving restores the photo. */
  (function () {
    if (reduce || !window.matchMedia('(hover: hover)').matches) return;
    var mode = document.body.getAttribute('data-thumb-hover') || 'mosh';
    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    document.querySelectorAll('.project').forEach(function (card) {
      var img = card.querySelector('img'); if (!img) return;
      var holder = img.parentElement; if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
      var cv = document.createElement('canvas'); cv.className = 'thumb-fx'; cv.setAttribute('aria-hidden', 'true');
      img.insertAdjacentElement('afterend', cv);
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      var off = document.createElement('canvas'), octx = off.getContext('2d');
      var tmp = document.createElement('canvas'), tctx = tmp.getContext('2d', { willReadFrequently: true });
      var raf = 0, t0 = 0, D = 620;
      function prep() {
        var w = img.clientWidth, h = img.clientHeight; if (!w || !h || !img.naturalWidth) return false;
        cv.width = off.width = w; cv.height = off.height = h;
        var s = Math.max(w / img.naturalWidth, h / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        octx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh); return true;
      }
      function mosh(i, w, h) {
        ctx.drawImage(off, 0, 0);
        var bands = 3 + Math.floor(i * 10);
        for (var b = 0; b < bands; b++) {
          var y = Math.floor(Math.random() * h), bh = Math.max(2, Math.floor(Math.random() * h * .16 * i + 2)), dx = (Math.random() - .5) * w * .6 * i;
          if (Math.random() < .45) { var sx = Math.floor(Math.max(0, Math.min(w - 2, w / 2 + dx))); ctx.drawImage(off, sx, y, 2, bh, 0, y, Math.floor(w * (.4 + .6 * Math.random())), bh); }
          else ctx.drawImage(off, 0, y, w, bh, dx, y, w, bh);
        }
        for (var k = 0; k < Math.floor(i * 8); k++) { var bw = 12 + Math.random() * w * .22, bh2 = 8 + Math.random() * h * .1, x = Math.random() * (w - bw), y2 = Math.random() * (h - bh2); ctx.drawImage(off, x, y2, bw, bh2, x + (Math.random() - .5) * w * .25 * i, y2, bw, bh2); }
      }
      function pixelate(i, w, h) {
        var px = Math.max(1, Math.round(1 + i * 30)); tmp.width = Math.ceil(w / px); tmp.height = Math.ceil(h / px);
        tctx.drawImage(off, 0, 0, tmp.width, tmp.height); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, w, h); ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, w, h);
      }
      function dither(i, w, h) {
        var s = 3; tmp.width = Math.ceil(w / s); tmp.height = Math.ceil(h / s); tctx.drawImage(off, 0, 0, tmp.width, tmp.height);
        var d = tctx.getImageData(0, 0, tmp.width, tmp.height), a = d.data;
        for (var y = 0; y < tmp.height; y++) for (var x = 0; x < tmp.width; x++) { var q = (y * tmp.width + x) * 4, l = (a[q] * .299 + a[q + 1] * .587 + a[q + 2] * .114) / 255, v = l > (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16 ? 250 : 46; a[q] += (v - a[q]) * i; a[q + 1] += (v - a[q + 1]) * i; a[q + 2] += (v - a[q + 2]) * i; }
        tctx.putImageData(d, 0, 0); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, w, h); ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, w, h);
      }
      var fx = mode === 'pixelate' ? pixelate : mode === 'dither' ? dither : mosh;
      // two states: hover shows one fixed glitched frame, leaving shows the clean photo
      var MAX = mode === 'mosh' ? .38 : mode === 'pixelate' ? .32 : .6, seed = 1 + Array.prototype.indexOf.call(document.querySelectorAll('.project'), card);
      function seeded(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
      card.addEventListener('mouseenter', function () {
        if (!img.complete || !prep()) return;
        var real = Math.random; Math.random = seeded(seed * 7919); // the same glitch every time for this card
        try { fx(MAX, cv.width, cv.height); } finally { Math.random = real; }
        cv.classList.add('is-on');
      });
      card.addEventListener('mouseleave', function () { cv.classList.remove('is-on'); });
    });
  })();

  /* ---------- 8. Home carousels (projects, courses): native scroll, mouse drag, arrow pills ---------- */
  var PAG_HTML = "<div class=\"testimonial_pagination\"><div class=\"testimonial_controls cc-prev\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" viewBox=\"0 0 23 18\" fill=\"none\" class=\"u-icon cc-24 u-z-index-1\"><path d=\"M8.38769 17.28L9.79569 16L3.8117 9.6H22.4997V7.712H3.8117L9.79569 1.312L8.38769 0L0.387695 8.64L8.38769 17.28Z\" fill=\"currentColor\"></path></svg></div><div class=\"testimonial_controls cc-next\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" viewBox=\"0 0 25 25\" fill=\"none\" class=\"u-icon cc-24 u-z-index-1\"><path d=\"M15.612 21.28L14.204 20L20.188 13.6L1.5 13.6V11.712H20.188L14.204 5.312L15.612 4L23.612 12.64L15.612 21.28Z\" fill=\"currentColor\"></path></svg></div></div>";
  document.querySelectorAll('.swiper-wrapper.cc-project').forEach(function (wrap) {
    var sc = wrap.parentElement; if (!sc) return;
    sc.setAttribute('data-lenis-prevent-wheel', ''); // let sideways trackpad scrolling through; vertical wheel still scrolls the page
    // bleed off the right edge of the screen; the last card still lines up with the page column at the end
    function bleed() {
      sc.style.marginRight = '0px'; sc.style.paddingRight = '0px'; sc.style.marginLeft = '0px'; sc.style.paddingLeft = '0px';
      // flex wrappers between the carousel and its section must not grow to fit the row
      for (var el = sc; el && el.tagName !== 'SECTION'; el = el.parentElement) el.style.minWidth = '0';
      var row = sc.closest('.row'); if (row) row.style.alignSelf = 'stretch'; // in a left-aligned column the row would size to its content
      // size the cards from the column width (3 across, or 80% on phones) and let the row contain them, so the end padding applies
      wrap.style.width = '';
      var colW = sc.clientWidth, g = parseFloat(getComputedStyle(wrap).columnGap) || 0;
      var w = window.innerWidth < 768 ? colW * .8 : (colW - 2 * g) / 3;
      wrap.style.width = 'max-content';
      Array.prototype.forEach.call(wrap.children, function (s) { s.style.width = w + 'px'; });
      var edge = Math.max(0, document.documentElement.clientWidth - sc.getBoundingClientRect().right);
      sc.style.marginRight = -edge + 'px'; sc.style.paddingRight = edge + 'px';
      // same on the left: cards can scroll past the left edge of the screen, but rest aligned with the page column
      var lead = Math.max(0, sc.getBoundingClientRect().left);
      sc.style.marginLeft = -lead + 'px'; sc.style.paddingLeft = lead + 'px'; sc.style.scrollPaddingLeft = lead + 'px';
    }
    bleed(); window.addEventListener('resize', bleed); window.addEventListener('load', bleed);
    // arrow pill (the courses one; Projects gets a copy): each tap slides one card
    var section = sc.closest('section'), pag = null;
    if (section) section.querySelectorAll('.testimonial_pagination').forEach(function (p) { if (!pag && sc.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) pag = p; });
    if (!pag) { var tmp = document.createElement('div'); tmp.innerHTML = PAG_HTML; pag = tmp.firstChild; pag.classList.add('cc-added'); sc.insertAdjacentElement('afterend', pag); }
    var prev = pag.querySelector('.cc-prev'), next = pag.querySelector('.cc-next');
    function step() { var s = wrap.children[0]; return s ? s.getBoundingClientRect().width + (parseFloat(getComputedStyle(wrap).columnGap) || 0) : sc.clientWidth; }
    function ends() { var max = sc.scrollWidth - sc.clientWidth - 2; if (prev) prev.classList.toggle('is-disabled', sc.scrollLeft <= 2); if (next) next.classList.toggle('is-disabled', sc.scrollLeft >= max); }
    [prev, next].forEach(function (b, i) { if (!b) return; b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0'); b.setAttribute('aria-label', i ? 'Next' : 'Previous');
      var go = function () { sc.scrollBy({ left: (i ? 1 : -1) * step(), behavior: 'smooth' }); };
      b.addEventListener('click', go); b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
    sc.addEventListener('scroll', ends, { passive: true }); window.addEventListener('resize', ends); setTimeout(ends, 50);
    sc.addEventListener('wheel', function (e) {
      // a vertical wheel over the carousel keeps scrolling the page smoothly
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); try { if (typeof lenis !== 'undefined') lenis.scrollTo(window.scrollY + e.deltaY * 1.0); else window.scrollBy(0, e.deltaY); } catch (x) { window.scrollBy(0, e.deltaY); } }
    }, { passive: false });
    var down = false, moved = false, x0 = 0, s0 = 0, v = 0, lx = 0, lt = 0, raf = 0;
    sc.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; x0 = lx = e.clientX; s0 = sc.scrollLeft; lt = performance.now(); v = 0; cancelAnimationFrame(raf);
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 5) { moved = true; sc.classList.add('is-dragging'); }
      if (moved) { sc.scrollLeft = s0 - dx; var t = performance.now(); v = (lx - e.clientX) / Math.max(1, t - lt); lx = e.clientX; lt = t; }
    });
    window.addEventListener('pointerup', function () {
      if (!down) return; down = false;
      if (!moved) return;
      // a little momentum, then let snapping settle it
      (function glide() { v *= .94; sc.scrollLeft += v * 16; if (Math.abs(v) > .05) raf = requestAnimationFrame(glide); else sc.classList.remove('is-dragging'); })();
    });
    // a drag should not count as a click on the card underneath
    sc.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  /* ---------- 9. Forms: submit is disabled while every field is empty ---------- */
  document.querySelectorAll('form.form').forEach(function (form) {
    if (form.closest('.gate-modal')) return; // the password modal has its own handling
    var fields = Array.prototype.slice.call(form.querySelectorAll('input:not([type=submit]):not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select'));
    var submit = form.querySelector('[type=submit]'); if (!submit || !fields.length) return;
    function update() { var empty = fields.every(function (f) { return !String(f.value || '').trim(); }); submit.disabled = empty; submit.setAttribute('aria-disabled', empty ? 'true' : 'false'); }
    form.addEventListener('input', update); form.addEventListener('change', update); update();
    window.addEventListener('load', function () { update(); setTimeout(update, 300); }); // Webflow's form script re-enables the button when it starts up
  });

  // Sample at load, after fonts/images, and on resize.
  sampleBackdrop();
  window.addEventListener('load', function () { sampleBackdrop(); setTimeout(sampleBackdrop, 300); });
  window.addEventListener('resize', function () { lastKey = null; sampleBackdrop(); });
  document.querySelectorAll('img').forEach(function (im) { if (!im.complete) im.addEventListener('load', function () { lastKey = null; sampleBackdrop(); }, { once: true }); });
})();
