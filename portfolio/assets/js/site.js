/* Site-level behaviors added on top of the Webflow export. Loaded on every page after the Webflow scripts. */
(function () {
  var nav = document.querySelector('.navigation');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Always start a new page at the top ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);
  window.addEventListener('pageshow', function (e) { if (e.persisted && !location.hash) window.scrollTo(0, 0); });

  /* ---------- 2. Page transition: a soft white wave rises from the bottom ---------- */
  var wipe = document.createElement('div');
  wipe.className = 'page-wipe';
  wipe.innerHTML = '<svg class="page-wipe_wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0,80 C240,20 480,140 720,80 C960,20 1200,140 1440,80 L1440,120 L0,120 Z"/></svg><div class="page-wipe_body"></div>';
  document.body.appendChild(wipe);
  // Arrive: the wipe starts covering the page and lifts away.
  if (!reduce) {
    wipe.classList.add('is-covering');
    requestAnimationFrame(function () { requestAnimationFrame(function () { wipe.classList.remove('is-covering'); wipe.classList.add('is-leaving'); }); });
    wipe.addEventListener('transitionend', function onEnd(e) { if (e.target === wipe && wipe.classList.contains('is-leaving')) { wipe.classList.remove('is-leaving'); wipe.removeEventListener('transitionend', onEnd); } });
  }
  // Depart: on internal link clicks, raise the wipe, then navigate.
  function isInternal(a) {
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download') || a.hasAttribute('data-no-wipe')) return false;
    try { var u = new URL(href, location.href); return u.origin === location.origin && (u.pathname !== location.pathname || u.hash === ''); } catch (err) { return false; }
  }
  document.addEventListener('click', function (e) {
    if (reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a'); if (!a || !isInternal(a)) return;
    e.preventDefault();
    var href = a.href;
    wipe.classList.remove('is-leaving'); wipe.classList.add('is-entering');
    setTimeout(function () { location.href = href; }, 620);
  });

  /* ---------- 3. Nav: tuck away on scroll down, return on scroll up ---------- */
  var lastY = window.scrollY, hidden = false, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    var dy = y - lastY;
    if (nav) {
      if (y < 80) { if (hidden) { nav.classList.remove('is-tucked'); hidden = false; } }
      else if (dy > 6 && !hidden) { nav.classList.add('is-tucked'); hidden = true; }
      else if (dy < -6 && hidden) { nav.classList.remove('is-tucked'); hidden = false; }
    }
    lastY = y;
    sampleBackdrop();
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });

  /* ---------- 4. Nav gradient follows whatever is behind it ---------- */
  // Finds the element under the nav's bottom edge, reads its background color, or samples the top of a cover image, and feeds the color into --nav-sky. The CSS transitions the color so changes are barely noticeable.
  var sampleCanvas = document.createElement('canvas'); sampleCanvas.width = 8; sampleCanvas.height = 8;
  var sctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  var lastKey = null;
  function parseRGBA(str) { var m = /rgba?\(([^)]+)\)/.exec(str || ''); if (!m) return null; var p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  function imageAverage(img) {
    try {
      var w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) return null;
      // sample a band across the top 12% of the image, where the nav sits
      sctx.drawImage(img, 0, 0, w, Math.max(1, h * 0.12), 0, 0, 8, 8);
      var d = sctx.getImageData(0, 0, 8, 8).data, r = 0, g = 0, b = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      return { r: r / n, g: g / n, b: b / n, a: 1 };
    } catch (err) { return null; }
  }
  function colorBehind() {
    if (!nav) return null;
    var r = nav.getBoundingClientRect();
    var x = Math.min(window.innerWidth - 2, Math.max(1, window.innerWidth * 0.5));
    var y = Math.min(window.innerHeight - 2, r.bottom + 2);
    nav.style.pointerEvents = 'none';
    var el = document.elementFromPoint(x, y);
    nav.style.pointerEvents = '';
    var guard = 0;
    while (el && el !== document.documentElement && guard++ < 40) {
      if (el.classList && (el.classList.contains('page-wipe') || el.classList.contains('totop'))) { el = el.parentElement; continue; }
      var cs = getComputedStyle(el);
      if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
        if (el.tagName === 'IMG' && el.complete) { var avg = imageAverage(el); if (avg) return avg; }
        if (el.tagName === 'VIDEO') return { r: 46, g: 46, b: 46, a: 1 };
      }
      var bg = parseRGBA(cs.backgroundColor);
      if (bg && bg.a > 0.5) return bg;
      var bi = cs.backgroundImage;
      if (bi && bi !== 'none') {
        var urlm = /url\(["']?([^"')]+)["']?\)/.exec(bi);
        if (urlm) { var im = cachedImage(urlm[1]); if (im && im.complete) { var a2 = imageAverage(im); if (a2) return a2; } }
        var cm = /rgba?\([^)]+\)|#[0-9a-f]{3,8}/i.exec(bi);
        if (cm && cm[0].charAt(0) === 'r') { var c = parseRGBA(cm[0]); if (c && c.a > 0.5) return c; }
      }
      el = el.parentElement;
    }
    var body = parseRGBA(getComputedStyle(document.body).backgroundColor);
    if (body && body.a > 0.5) return body;
    var html = parseRGBA(getComputedStyle(document.documentElement).backgroundColor);
    return html && html.a > 0.5 ? html : { r: 250, g: 250, b: 250, a: 1 };
  }
  var imgCache = {};
  function cachedImage(src) { if (!imgCache[src]) { var im = new Image(); im.src = src; imgCache[src] = im; } return imgCache[src]; }
  function sampleBackdrop() {
    if (!nav) return;
    var c = colorBehind(); if (!c) return;
    var key = Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b);
    if (key === lastKey) return; lastKey = key;
    var lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
    // Keep the sky feeling: nudge the sampled color toward the original gradient blue when it is light and bluish, otherwise follow it.
    nav.style.setProperty('--nav-sky', 'rgb(' + key + ')');
    nav.classList.toggle('is-on-dark', lum < 0.45);
  }
  /* ---------- 5. Playground: stack of cards that deals into a grid ---------- */
  var pg = document.querySelector('[data-playground]');
  if (pg && !reduce) {
    var cards = Array.prototype.slice.call(pg.querySelectorAll('.pg_card'));
    var grid = pg.querySelector('.pg_grid');
    // fixed, hand-feel jitter per card so the stack looks tossed, not random each load
    var jitter = cards.map(function (c, n) { var s = Math.sin(n * 12.9898) * 43758.5453; var f = s - Math.floor(s); var s2 = Math.sin(n * 78.233) * 12543.21; var g = s2 - Math.floor(s2); return { rot: (f - .5) * 14, dx: (g - .5) * 70, dy: (f - .5) * 40 }; });
    var homes = [];
    function measure() {
      cards.forEach(function (c) { c.style.transform = 'none'; });
      var gr = grid.getBoundingClientRect();
      var cx = gr.left + gr.width / 2, cy = gr.top + Math.min(gr.height, window.innerHeight) / 2;
      homes = cards.map(function (c) { var r = c.getBoundingClientRect(); return { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) }; });
      layoutPg();
    }
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function layoutPg() {
      if (!homes.length) return;
      var r = grid.getBoundingClientRect(), vh = window.innerHeight;
      // 0 while the grid's top is in the lower part of the screen, 1 once it reaches 25% from the top
      var raw = (vh * 0.85 - r.top) / (vh * 0.6);
      var p = Math.max(0, Math.min(1, raw));
      cards.forEach(function (c, n) {
        var stagger = Math.max(0, Math.min(1, p * 1.35 - n * 0.04));
        var k = 1 - ease(stagger);
        var h = homes[n], jt = jitter[n];
        c.style.transform = 'translate3d(' + ((h.x + jt.dx) * k).toFixed(1) + 'px,' + ((h.y + jt.dy) * k).toFixed(1) + 'px,0) rotate(' + (jt.rot * k).toFixed(2) + 'deg) scale(' + (1 + .06 * k).toFixed(3) + ')';
      });
    }
    window.addEventListener('scroll', function () { requestAnimationFrame(layoutPg); }, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    measure();
  }

  // Sample at load, after fonts/images, and on resize.
  sampleBackdrop();
  window.addEventListener('load', function () { sampleBackdrop(); setTimeout(sampleBackdrop, 300); });
  window.addEventListener('resize', function () { lastKey = null; sampleBackdrop(); });
  document.querySelectorAll('img').forEach(function (im) { if (!im.complete) im.addEventListener('load', function () { lastKey = null; sampleBackdrop(); }, { once: true }); });
})();
