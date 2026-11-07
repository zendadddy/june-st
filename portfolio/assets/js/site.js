/* Site-level behaviors added on top of the Webflow export. Loaded on every page after the Webflow scripts. */
(function () {
  var nav = document.querySelector('.navigation');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Always start a new page at the top ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);
  window.addEventListener('pageshow', function (e) { if (e.persisted && !location.hash) window.scrollTo(0, 0); });

  /* ---------- 2. Page transition ----------
     Leaving: a soft white wave rises from the bottom; we navigate only once the screen is covered.
     Arriving: the new page waits off-screen (on the same white) until its fonts and visible images are in,
     then the whole page slides up from the bottom. A tiny script in <head> sets html.is-arriving before first paint. */
  var root = document.documentElement;
  var wipe = document.createElement('div');
  wipe.className = 'page-wipe';
  wipe.innerHTML = '<svg class="page-wipe_wave" viewBox="0 0 1440 36" preserveAspectRatio="none" aria-hidden="true"><path d="M0,22 C480,8 960,8 1440,22 L1440,36 L0,36 Z"/></svg><div class="page-wipe_body"></div>';
  document.body.appendChild(wipe);

  function afterArrive() {
    root.classList.remove('is-arriving', 'is-rising');
    // layout measured while the page sat off-screen is stale: re-measure scroll-linked things
    try { if (window.ScrollTrigger) ScrollTrigger.refresh(); } catch (err) {}
    window.dispatchEvent(new Event('resize'));
  }
  if (root.classList.contains('is-arriving')) {
    if (reduce) { afterArrive(); }
    else {
      var risen = false;
      var rise = function () {
        if (risen) return; risen = true;
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          root.classList.add('is-rising');
          var pw = document.querySelector('.page-wrapper');
          var done = function (e) { if (!e || e.target === pw) { if (pw) pw.removeEventListener('transitionend', done); afterArrive(); } };
          if (pw) pw.addEventListener('transitionend', done); setTimeout(done, 1400);
        }); });
      };
      // ready = fonts loaded and every image currently in view decoded; never wait longer than 1.6s
      var waits = [];
      if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
      var vh = window.innerHeight;
      document.querySelectorAll('.page-wrapper img').forEach(function (im) {
        var r = im.getBoundingClientRect(); var top = r.top - vh; // the wrapper is shifted down one screen
        if (top < vh && r.bottom - vh > -50 && !im.complete) { im.loading = 'eager'; waits.push(new Promise(function (res) { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); })); }
      });
      Promise.race([Promise.all(waits), new Promise(function (res) { setTimeout(res, 1600); })]).then(rise);
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
  window.addEventListener('pageshow', function (e) { if (e.persisted) { leaving = false; wipe.classList.remove('is-entering'); afterArrive(); } });

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

  /* ---------- 3. Nav: tuck away on scroll down, return on scroll up ---------- */
  var lastY = window.scrollY, hidden = false, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    var dy = y - lastY;
    if (nav) {
      if (y < window.innerHeight * 0.75) { if (hidden) { nav.classList.remove('is-tucked'); hidden = false; } }
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
  /* ---------- 5. Playground: a stack of cards that pins, deals into a grid, then holds ---------- */
  function initPlayground(pg) {
    var cards = Array.prototype.slice.call(pg.querySelectorAll('.pg_card'));
    var grid = pg.querySelector('.pg_grid'), track = pg.querySelector('.pg_track'), sticky = pg.querySelector('.pg_sticky');
    if (!cards.length || !grid || !track) return;
    // fixed jitter per card so the pile looks tossed, the same on every load
    var jitter = cards.map(function (c, n) { var s = Math.sin(n * 12.9898) * 43758.5453, f = s - Math.floor(s), s2 = Math.sin(n * 78.233) * 12543.21, g = s2 - Math.floor(s2); return { rot: (f - .5) * 16, dx: (g - .5) * 80, dy: (f - .5) * 46 }; });
    var homes = [], pinH = 0, gridH = 0;
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function measure() {
      cards.forEach(function (c) { c.style.transform = 'none'; });
      var vh = window.innerHeight;
      gridH = grid.getBoundingClientRect().height;
      var canPin = gridH < vh * .92;
      pg.classList.toggle('is-pinned', canPin);
      // pinned: the track is the grid plus 0.8 screens of scroll to play the deal over
      pinH = canPin ? Math.round(vh * 0.8) : 0;
      track.style.height = canPin ? (gridH + pinH) + 'px' : '';
      pg.style.setProperty('--pg-top', Math.max(12, (vh - gridH) / 2) + 'px');
      var gr = grid.getBoundingClientRect(), cx = gr.left + gr.width / 2, cy = gr.top + gr.height / 2;
      homes = cards.map(function (c) { var r = c.getBoundingClientRect(); return { x: cx - (r.left + r.width / 2), y: cy - (r.top + r.height / 2) }; });
      layout();
    }
    function layout() {
      if (!homes.length) return;
      var vh = window.innerHeight, p;
      if (pinH) {
        // 0 when the pin starts, 1 when it releases
        var top = parseFloat(getComputedStyle(pg).getPropertyValue('--pg-top')) || 0;
        p = (top - track.getBoundingClientRect().top) / pinH;
        // brief hold on the pile (12%), deal across the middle, brief hold on the grid (12%)
        p = (p - .12) / .76;
      } else {
        var r = grid.getBoundingClientRect();
        p = (vh * .8 - r.top) / (vh * .7);
      }
      p = Math.max(0, Math.min(1, p));
      cards.forEach(function (c, n) {
        var local = Math.max(0, Math.min(1, p * 1.4 - n * .05));
        var k = 1 - ease(local), h = homes[n], jt = jitter[n];
        c.style.transform = 'translate3d(' + ((h.x + jt.dx) * k).toFixed(1) + 'px,' + ((h.y + jt.dy) * k).toFixed(1) + 'px,0) rotate(' + (jt.rot * k).toFixed(2) + 'deg) scale(' + (1 + .08 * k).toFixed(3) + ')';
      });
    }
    var queued = false;
    window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; layout(); }); } }, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    cards.forEach(function (c) { var im = c.querySelector('img'); if (im && !im.complete) im.addEventListener('load', measure, { once: true }); });
    measure();
  }
  if (!reduce) document.querySelectorAll('[data-playground]').forEach(initPlayground);

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

  // Sample at load, after fonts/images, and on resize.
  sampleBackdrop();
  window.addEventListener('load', function () { sampleBackdrop(); setTimeout(sampleBackdrop, 300); });
  window.addEventListener('resize', function () { lastKey = null; sampleBackdrop(); });
  document.querySelectorAll('img').forEach(function (im) { if (!im.complete) im.addEventListener('load', function () { lastKey = null; sampleBackdrop(); }, { once: true }); });
})();
