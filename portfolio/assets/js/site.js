/* Site-level behaviors added on top of the Webflow export. Loaded on every page after the Webflow scripts. */
(function () {
  var nav = document.querySelector('.navigation');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 00. Touch screens: taps are not hovers ----------
     On devices without a real hover, every :hover style is removed from the page's stylesheets, so a tap never
     leaves a link lifted, dimmed or underlined. Selectors that also cover :focus-visible etc. keep those parts. */
  (function () {
    if (!window.matchMedia || !matchMedia('(hover: none)').matches) return;
    function strip(list) {
      for (var i = list.length - 1; i >= 0; i--) {
        var r = list[i];
        if (r.cssRules && !r.selectorText) { try { strip(r.cssRules); } catch (e) {} continue; } // @media, @supports, @layer
        if (!r.selectorText || r.selectorText.indexOf(':hover') === -1) continue;
        var keep = r.selectorText.split(/,(?![^(]*\))/).filter(function (s) { return s.indexOf(':hover') === -1; });
        try { if (keep.length) r.selectorText = keep.join(','); else (r.parentRule || r.parentStyleSheet).deleteRule(i); } catch (e) {}
      }
    }
    function run() { [].forEach.call(document.styleSheets, function (sh) { try { strip(sh.cssRules); } catch (e) {} }); }
    run(); window.addEventListener('load', run);
  })();

  /* modal forms: the button wakes up only once the field is filled in (a real-looking email, or any password) */
  function syncModalBtn(form) {
    var f = form && form.querySelector('input[type=email], input[type=password]'), b = form && form.querySelector('input[type=submit]');
    if (!f || !b) return; form.classList.toggle('is-typing', !!f.value || form.classList.contains('is-done'));
    if (b.value === 'Sending…') return;
    b.disabled = f.type === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()) : !f.value;
  }
  document.addEventListener('input', function (e) { var f = e.target.closest && e.target.closest('.gate-modal_form'); if (f) syncModalBtn(f); });

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
          '<div class="u-vflex-left-top u-vgap-12"><h2 id="gate-title" class="gate-title"><svg class="gate-lock" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.5"/></svg><span>Private <span class="h2 cc-alt">work</span></span></h2><p class="u-color-secondary">My projects are under wraps for now. Unless…</p></div>' +
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
      modal.querySelector('.gate-modal_error').hidden = true; modal.querySelector('input[type=password]').value = ''; syncModalBtn(modal.querySelector('form'));
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

  /* ---------- 0b. Courses "Coming soon" modal ----------
     Course cards (a.project_link with href="#") open a modal styled like the password gate.
     The mailing list form goes in .soon-modal_signup. */
  (function () {
    var MC_URL = 'https://francoisbach.us19.list-manage.com/subscribe/post-json?u=b2ac57f991427e5f4a30aab6f&id=8286cccf33&f_id=00efaae4f0',
        MC_BOT = 'b_b2ac57f991427e5f4a30aab6f_8286cccf33';
    var modal = null, lastFocus = null;
    // Mailchimp only answers cross-site sign-ups as JSONP, so the form loads a script with a callback
    function subscribe(email, bot, done) {
      var cb = 'mcCb' + Date.now(), s = document.createElement('script'), t = setTimeout(function () { finish({ result: 'error', msg: 'timeout' }); }, 12000);
      function finish(r) { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); done(r || {}); }
      window[cb] = finish; s.onerror = function () { finish({ result: 'error', msg: 'network' }); };
      s.src = MC_URL + '&EMAIL=' + encodeURIComponent(email) + '&' + MC_BOT + '=' + encodeURIComponent(bot) + '&c=' + cb;
      document.body.appendChild(s);
    }
    function build() {
      modal = document.createElement('div');
      modal.className = 'gate-modal soon-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'soon-title'); modal.hidden = true;
      modal.innerHTML = '<div class="gate-modal_backdrop" data-soon-close></div>' +
        '<div class="gate-modal_card">' +
          '<button type="button" class="gate-modal_close" aria-label="Close" data-soon-close><svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.25"/></svg></button>' +
          '<img class="soon-modal_icon" alt="" width="258" height="296" hidden>' +
          '<div class="u-vflex-left-top u-vgap-12"><h2 id="soon-title"></h2><p class="u-color-secondary soon-modal_text"></p></div>' +
          '<div class="soon-modal_signup"><form class="form u-vflex-right-top gate-modal_form soon-modal_form" novalidate>' +
            '<div class="input-group u-w-100"><label for="soon-email" class="u-sr-only">Email address</label><input class="input w-input" type="email" id="soon-email" name="EMAIL" placeholder="Email address" autocomplete="email" required></div>' +
            '<div aria-hidden="true" style="position:absolute;left:-5000px"><input type="text" name="' + MC_BOT + '" tabindex="-1" value=""></div>' +
            '<p class="soon-modal_msg eyebrow-sm" role="status" hidden></p>' +
            '<input type="submit" class="btn w-button" value="Notify me">' +
          '</form></div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelectorAll('[data-soon-close]').forEach(function (el) { el.addEventListener('click', close); });
      var form = modal.querySelector('form'), email = form.querySelector('input[type=email]'), msg = form.querySelector('.soon-modal_msg'), btn = form.querySelector('input[type=submit]'), card = modal.querySelector('.gate-modal_card');
      function say(text, ok) { msg.textContent = text; msg.hidden = false; msg.classList.toggle('is-ok', !!ok); }
      form.addEventListener('submit', function (e) {
        e.preventDefault(); var v = email.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { say('That email doesn’t look right. Try again?'); card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake'); email.focus(); return; }
        btn.disabled = true; btn.value = 'Sending…'; msg.hidden = true;
        subscribe(v, form.querySelector('input[name=' + MC_BOT + ']').value, function (r) {
          btn.value = 'Notify me'; syncModalBtn(form);
          var m = String(r.msg || '').replace(/<[^>]*>/g, '').replace(/^\d+\s*-\s*/, '');
          if (r.result === 'success') { form.classList.add('is-done'); say('You’re on the list. Check your inbox to confirm.', true); soonAutoClose = setTimeout(close, 8000); return; }
          if (/already subscribed/i.test(m)) { form.classList.add('is-done'); say('You’re already on the list. I’ll be in touch.', true); soonAutoClose = setTimeout(close, 8000); return; }
          if (/too many/i.test(m)) { say('Too many tries just now. Please wait a few minutes.'); return; }
          if (m === 'network' || m === 'timeout') { // the page could not reach Mailchimp directly: post the way the Mailchimp embed does, in a new tab
            var f = document.createElement('form'); f.method = 'post'; f.target = '_blank'; f.action = MC_URL.replace('/post-json?', '/post?'); f.style.display = 'none';
            f.innerHTML = '<input type="email" name="EMAIL"><input type="text" name="' + MC_BOT + '" value="">'; f.querySelector('[name=EMAIL]').value = v;
            document.body.appendChild(f); f.submit(); setTimeout(function () { f.remove(); }, 1000);
            form.classList.add('is-done'); say('Almost there. Finish in the Mailchimp tab that just opened.', true); return;
          }
          say(m || 'Something went wrong. Please try again.');
        });
      });
      modal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { close(); return; }
        if (e.key !== 'Tab') return;
        var f = modal.querySelectorAll('button, input:not([tabindex="-1"]), a[href], select, textarea'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }
    var COPY = {
      courses: ['Coming <span class="h2 cc-alt">soon</span>', 'These courses are all on the way. Join my mailing list and I’ll let you know when they’re live.'],
      newsletter: ['My <span class="h2 cc-alt">newsletter</span>', 'Occasional notes on design, building things, and new courses as they launch. No spam, unsubscribe any time.']
    };
    function open(kind) {
      if (!modal) build();
      var c = COPY[kind] || COPY.courses; syncModalBtn(modal.querySelector('form'));
      modal.querySelector('#soon-title').innerHTML = c[0]; modal.querySelector('.soon-modal_text').textContent = c[1];
      var icon = modal.querySelector('.soon-modal_icon'); icon.hidden = kind !== 'newsletter';
      // find the assets folder from the page's own favicon link (works wherever the site is hosted, at any page depth)
      if (!icon.hidden && !icon.getAttribute('src')) { var fav = document.querySelector('link[rel~="icon"]'); icon.src = fav ? fav.href.replace(/[^/]*$/, 'newsletter-face.png') : new URL('assets/newsletter-face.png', siteRoot).href; }
      lastFocus = document.activeElement;
      modal.hidden = false; document.documentElement.classList.add('has-gate');
      try { if (typeof lenis !== 'undefined' && lenis.stop) lenis.stop(); } catch (e) {}
      requestAnimationFrame(function () { modal.classList.add('is-open'); setTimeout(function () { var i = modal.querySelector('.soon-modal_signup input[type=email], .soon-modal_signup input:not([type=hidden])'); (i || modal.querySelector('.gate-modal_close')).focus(); }, 60); });
    }
    var soonAutoClose = 0; // after a successful signup the popup closes itself after 8 seconds
    function close() {
      clearTimeout(soonAutoClose); if (!modal || modal.hidden) return;
      modal.classList.remove('is-open'); document.documentElement.classList.remove('has-gate');
      try { if (typeof lenis !== 'undefined' && lenis.start) lenis.start(); } catch (e) {}
      setTimeout(function () { modal.hidden = true; }, 450);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    document.addEventListener('click', function (e) {
      if (e.button !== 0) return;
      var a = e.target.closest && e.target.closest('a.project_link[href="#"], a[data-newsletter]'); if (!a) return;
      e.preventDefault(); e.stopImmediatePropagation(); open(a.hasAttribute('data-newsletter') ? 'newsletter' : 'courses');
    }, true);
  })();

  /* Footer "Design & Dev": once the cities have slid out, they stay out */
  document.querySelectorAll('.footer_dd').forEach(function (dd) {
    function keep() { dd.classList.add('is-open'); }
    dd.addEventListener('pointerenter', keep, { once: true }); dd.addEventListener('focusin', keep, { once: true }); dd.addEventListener('click', keep, { once: true });
  });

  /* ---------- 0c. Mobile menu ----------
     Below 768px the nav links live in .nav_list, a full-screen panel; "Menu" toggles it. */
  (function () {
    var nav = document.querySelector('.navigation'), btn = nav && nav.querySelector('.nav_menu'), list = nav && nav.querySelector('.nav_list');
    if (!btn || !list) return;
    var label = btn.querySelector('div') || btn, root = document.documentElement;
    label.innerHTML = '<span class="nav_menu_word">Menu</span>';
    var X_ICON = '<svg class="nav_menu_x" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.25"/></svg>'; // same X as the modals
    list.id = list.id || 'site-menu';
    btn.setAttribute('role', 'button'); btn.setAttribute('tabindex', '0'); btn.setAttribute('aria-controls', list.id); btn.setAttribute('aria-expanded', 'false');
    [].forEach.call(list.querySelectorAll('a'), function (a, i) { a.style.setProperty('--i', i); });
    label.insertAdjacentHTML('beforeend', X_ICON); label.classList.add('nav_menu_label');
    function set(open) {
      root.classList.toggle('has-menu', open); nav.classList.toggle('is-menu-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) btn.setAttribute('aria-label', 'Close menu'); else btn.removeAttribute('aria-label'); // the word and the X cross-fade in CSS
      try { if (typeof lenis !== 'undefined') { if (open && lenis.stop) lenis.stop(); if (!open && lenis.start) lenis.start(); } } catch (e) {}
      if (open) { var first = list.querySelector('a'); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60); }
    }
    function toggle() { set(!root.classList.contains('has-menu')); }
    btn.addEventListener('click', toggle);
    btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('has-menu')) { set(false); btn.focus(); } });
    // picking a page: the open menu is already a full white cover, so go straight there; the next page arrives by
    // lifting that white away upward with the wave edge (section 2), the same paper transition as desktop
    list.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a || e.defaultPrevented || !root.classList.contains('has-menu')) return;
      if (a.target && a.target !== '_self') return;
      e.preventDefault(); e.stopImmediatePropagation();
      a.classList.add('is-picked'); nav.classList.add('is-menu-leaving');
      try { sessionStorage.setItem('fb-arrive', '1'); } catch (err) {}
      setTimeout(function () { location.href = a.href; }, 560); // let the text fade out first
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 768 && root.classList.contains('has-menu')) set(false); });
    window.addEventListener('pageshow', function () { nav.classList.remove('is-menu-leaving'); set(false); });
  })();

  /* Nav: the link to the page you're on is greyed out and inert (the Frank Bach wordmark and the sun always stay live) */
  document.querySelectorAll('.nav_list .nav_link.w--current').forEach(function (a) {
    var here = location.pathname.replace(/index\.html$/, ''), to = new URL(a.href, location.href).pathname.replace(/index\.html$/, '');
    if (to !== here) { a.classList.remove('w--current'); a.removeAttribute('aria-current'); return; } // e.g. 'Projects' while reading a project: still a way back
    a.setAttribute('aria-current', 'page'); a.setAttribute('aria-disabled', 'true'); a.setAttribute('tabindex', '-1');
    a.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); }, true);
  });

  /* ---------- 0d. About: accolades stay quiet ----------
     Each list (Speaking, Awards, Interviews, Podcasts) shows its three most recent entries; "Show all" expands the rest. */
  (function () {
    var marker = [].filter.call(document.querySelectorAll('.section_marker .cc-marker'), function (h) { return /accolades/i.test(h.textContent); })[0];
    var section = marker && marker.closest('section'); if (!section) return;
    section.classList.add('acc-section');
    var SHOW = 3, lists = [];
    section.querySelectorAll('ul').forEach(function (ul) {
      var box = ul.firstElementChild, rows = box ? [].slice.call(box.querySelectorAll(':scope > .accolade_link')) : [];
      if (rows.length <= SHOW) return;
      box.classList.add('acc-box');
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'acc-toggle eyebrow';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span class="acc-toggle_label">Show all</span><span class="acc-toggle_icon" aria-hidden="true"></span>';
      ul.after(btn);
      var item = { box: box, rows: rows, btn: btn, open: false };
      function collapsedH() { var last = rows[SHOW - 1]; return last.offsetTop + last.offsetHeight - rows[0].offsetTop; }
      item.layout = function () {
        rows.forEach(function (r, i) { if (i >= SHOW) { r.classList.add('acc-extra'); r.style.setProperty('--k', Math.min(i - SHOW, 14)); if (item.open) r.removeAttribute('inert'); else r.setAttribute('inert', ''); } });
        box.style.height = (item.open ? box.scrollHeight : collapsedH()) + 'px';
      };
      btn.addEventListener('click', function () {
        item.open = !item.open; btn.setAttribute('aria-expanded', String(item.open)); box.classList.toggle('is-open', item.open);
        btn.querySelector('.acc-toggle_label').textContent = item.open ? 'Show less' : 'Show all';
        if (!item.open) { // collapsing from far down the list: keep the toggle in view
          var top = section.getBoundingClientRect().top; var bt = btn.getBoundingClientRect().top;
          item.layout();
          setTimeout(function () { var r = box.getBoundingClientRect(); if (r.top < 0) { try { if (typeof lenis !== 'undefined' && lenis.scrollTo) lenis.scrollTo(box, { offset: -120 }); else box.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} } }, 50);
        } else item.layout();
        try { if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 950); } catch (e) {} // after the box has settled
      });
      lists.push(item);
    });
    function all() { lists.forEach(function (it) { it.layout(); }); }
    all(); window.addEventListener('load', all); window.addEventListener('resize', all);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
  })();

  /* ---------- 0e. Contact: the secret snail-mail stamp ----------
     A faint postage stamp (the sun) in the Get in touch section; tapping it opens the Snail mail Q&A letter as a modal. */
  (function () {
    var trig = document.querySelector('.snail-trigger'), src = document.getElementById('snail-mail'); if (!trig || !src) return;
    var sun = document.querySelector('.nav_sun svg');
    document.querySelectorAll('[data-sun]').forEach(function (s) { if (sun) { var c = sun.cloneNode(true); c.removeAttribute('width'); c.removeAttribute('height'); s.appendChild(c); } });
    var letter = src.querySelector('.snail_letter'); src.remove();
    var modal = document.createElement('div');
    modal.className = 'gate-modal snail-modal'; modal.id = 'snail-mail'; modal.hidden = true;
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'snail-title');
    modal.innerHTML = '<div class="gate-modal_backdrop" data-snail-close></div>';
    var close = document.createElement('button'); close.type = 'button'; close.className = 'gate-modal_close'; close.setAttribute('aria-label', 'Close'); close.setAttribute('data-snail-close', '');
    close.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.25"/></svg>';
    letter.insertBefore(close, letter.firstChild); letter.setAttribute('tabindex', '-1');
    var title = letter.querySelector('.snail_title'); if (title) title.id = 'snail-title';
    modal.appendChild(letter); document.body.appendChild(modal);
    // ruled paper: every text block's baseline is snapped onto the same grid as the drawn lines
    function baselineOf(el) { // offset of el's first baseline from the letter's top (offsetTop ignores the tilt)
      var probe = document.createElement('span'); probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      var host = el.matches('ol, ul') ? el.querySelector('li') : el; host.insertBefore(probe, host.firstChild);
      var y = 0, n = probe; while (n && n !== letter) { y += n.offsetTop; n = n.offsetParent; }
      probe.remove(); return y;
    }
    function rule() {
      var blocks = [].slice.call(letter.querySelectorAll(':scope > .snail_eyebrow, :scope > .snail_title, :scope > p, :scope > ol'));
      if (!blocks.length) return;
      blocks.forEach(function (b) { b.style.paddingTop = '0px'; });
      var p = letter.querySelector(':scope > p'), row = parseFloat(getComputedStyle(p).lineHeight) || 28;
      var origin = baselineOf(blocks[0]);
      blocks.slice(1).forEach(function (b) { var off = ((origin - baselineOf(b)) % row + row) % row; if (off > .5) b.style.paddingTop = off + 'px'; });
      letter.style.setProperty('--row', row + 'px');
      letter.style.setProperty('--rule-y', (((origin + 3 - row) % row) + row) % row + 'px');
    }
    var last = null;
    function open() {
      last = document.activeElement; modal.hidden = false; document.documentElement.classList.add('has-gate'); trig.classList.add('is-found'); trig.setAttribute('aria-expanded', 'true');
      rule();
      try { if (typeof lenis !== 'undefined' && lenis.stop) lenis.stop(); } catch (e) {}
      requestAnimationFrame(function () { modal.classList.add('is-open'); setTimeout(function () { close.focus(); }, 80); });
    }
    function shut() {
      if (modal.hidden) return; modal.classList.remove('is-open'); document.documentElement.classList.remove('has-gate'); trig.setAttribute('aria-expanded', 'false');
      try { if (typeof lenis !== 'undefined' && lenis.start) lenis.start(); } catch (e) {}
      setTimeout(function () { modal.hidden = true; }, 450); if (last && last.focus) last.focus();
    }
    trig.addEventListener('click', open);
    window.addEventListener('resize', function () { if (!modal.hidden) rule(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!modal.hidden) rule(); });
    modal.querySelectorAll('[data-snail-close]').forEach(function (el) { el.addEventListener('click', shut); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { shut(); return; }
      if (e.key !== 'Tab') return;
      var f = modal.querySelectorAll('button, a[href]'), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  })();

  /* ---------- 0f. Homepage testimonials: the arrows crossfade between the quotes ---------- */
  document.querySelectorAll('[data-tm]').forEach(function (tm) {
    var slides = [].slice.call(tm.querySelectorAll('.tm_slide')), i = 0;
    var pag = tm.parentElement.parentElement.querySelector('.testimonial_pagination'); if (!pag || slides.length < 2) return;
    // arrows sit on either side of the quotes, so they stay put whatever the quote's length
    var wrap = document.createElement('div'); wrap.className = 'tm-wrap'; tm.parentNode.insertBefore(wrap, tm); wrap.appendChild(tm); wrap.appendChild(pag); pag.classList.add('tm-arrows');
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
    }
    [['.cc-prev', -1, 'Previous testimonial'], ['.cc-next', 1, 'Next testimonial']].forEach(function (d) {
      var b = pag.querySelector(d[0]); if (!b) return;
      b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0'); b.setAttribute('aria-label', d[2]);
      b.addEventListener('click', function () { show(i + d[1]); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i + d[1]); } });
    });
  });

  /* ---------- 0h. Footer copyright year: always the current year ---------- */
  document.querySelectorAll('.copyright-year').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- 0i. Contact form: post to contact.php (the server emails it), show the sent or failed note ---------- */
  document.querySelectorAll('form[data-contact]').forEach(function (form) {
    var wrap = form.parentElement, done = wrap.querySelector('.w-form-done'), fail = wrap.querySelector('.w-form-fail'), btn = form.querySelector('[type=submit]');
    // the button appears once you start typing, and wakes up only when every field is filled (with a real-looking email)
    var fields = [].slice.call(form.querySelectorAll('input[required], textarea[required]'));
    function sync() {
      var any = fields.some(function (f) { return f.value.trim(); });
      var full = fields.every(function (f) { return f.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()) : f.value.trim(); });
      form.classList.toggle('is-typing', any); if (btn.value !== 'Sending…') btn.disabled = !full;
    }
    form.addEventListener('input', sync); sync();
    form.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopImmediatePropagation(); if (!form.reportValidity()) return;
      var label = btn.value; btn.disabled = true; btn.value = 'Sending…'; if (fail) fail.style.display = 'none';
      fetch(form.action, { method: 'POST', body: new FormData(form) }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) { if (!d.ok) throw 0; form.style.display = 'none'; if (done) done.style.display = 'block'; })
        .catch(function () { if (fail) fail.style.display = 'block'; })
        .then(function () { btn.disabled = false; btn.value = label; });
    }, true);
  });

  /* ---------- 0g. Footer torn edge as a real shape (Safari can drop CSS masks on the footer's pseudo-element) ---------- */
  (function () {
    var f = document.querySelector('footer.footer'); if (!f) return;
    var fav = document.querySelector('link[rel~="icon"]'), file = '68e01f11b96ed794c55e8e4d_be70b9722cafdb3a464777bdf72afc9f_quote-top-clip.svg';
    var url = fav ? fav.href.replace(/[^/]*$/, file) : new URL('assets/' + file, siteRoot).href;
    fetch(url).then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/ d="([^"]+)"/); if (!m) return;
      f.insertAdjacentHTML('afterbegin', '<svg class="footer_tear" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="' + m[1] + '" fill="#534d6a"/></svg>');
      f.classList.add('has-tear');
    }).catch(function () {});
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
    // a link to the page you're already on (Frank Bach / the sun on the homepage, etc.) just glides back to the top
    try { var dest = new URL(a.href, location.href), norm = function (p) { return p.replace(/index\.html$/, ''); };
      if (dest.origin === location.origin && norm(dest.pathname) === norm(location.pathname) && !dest.hash) {
        e.preventDefault(); if (root.classList.contains('has-menu') && a.closest('.nav_list')) return;
        if (typeof lenis !== 'undefined' && lenis.scrollTo) lenis.scrollTo(0, { duration: 1.1 }); else window.scrollTo({ top: 0, behavior: 'smooth' });
        return; } } catch (err) {}
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
  var lastY = window.scrollY, hidden = false, ticking = false, navTravel = 0;
  function onScroll() {
    var y = window.scrollY;
    var dy = y - lastY;
    if (nav) {
      // phones: tuck the nav away while scrolling down, bring it back on any scroll up (always shown near the top or with the menu open)
      var small = window.innerWidth < 768, menuOpen = root.classList.contains('has-menu');
      if (!small || menuOpen || y < 80) { if (hidden) { hidden = false; root.classList.remove('nav-hidden'); } }
      else { // hide only after a deliberate scroll down (~32px); come back after a small scroll up
        navTravel = (dy > 0) === (navTravel > 0) ? navTravel + dy : dy;
        if (!hidden && navTravel > 32) { hidden = true; root.classList.add('nav-hidden'); }
        else if (hidden && navTravel < -8) { hidden = false; root.classList.remove('nav-hidden'); }
      }
    }
    lastY = y;
    sampleSoon();
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
  // sample a few times a second while scrolling, and once more when scrolling stops (the colour eases over ~1s anyway)
  var lastSample = 0, sampleTimer = 0;
  function sampleSoon() {
    var now = performance.now();
    if (now - lastSample > 180) { lastSample = now; sampleBackdrop(); }
    clearTimeout(sampleTimer); sampleTimer = setTimeout(function () { lastSample = performance.now(); sampleBackdrop(); }, 200);
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
    var simple = false; // phones: no pile and no pin, just the grid drifting with a little parallax
    function measure() {
      simple = window.innerWidth < 768;
      pg.classList.toggle('is-simple', simple);
      // a short last row sits centred, with even gaps either side (desktop grid is 14 half-columns, each photo spans 2)
      allSlots.forEach(function (s) { s.style.gridColumnStart = ''; });
      if (window.innerWidth >= 992) { var vis = allSlots.filter(function (s) { return s.offsetParent !== null; }), rem = vis.length % 7; if (rem) vis[vis.length - rem].style.gridColumnStart = String(7 - rem + 1); }
      slots = allSlots.filter(function (s) { return s.offsetParent !== null; });
      cards = slots.map(function (s) { return s.querySelector('.pg_card'); });
      allSlots.forEach(function (s) { s.querySelector('.pg_card').style.transform = 'none'; });
      var vh = window.innerHeight, gh = grid.getBoundingClientRect().height;
      var canPin = !simple && gh < vh * .92;
      pg.classList.toggle('is-pinned', canPin);
      pinH = canPin ? Math.round(vh * 1.35) : 0;
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
      // about one in five photos settles slightly off kilter in the finished grid
      var tilt = rnd(n, 3.731) < .2 ? (rnd(n, 9.17) < .5 ? -1 : 1) * (1.5 + rnd(n, 5.33) * 2.5) : 0;
      return { tx: jt.sx * k, ty: jt.sy * k, rot: jt.rot * k + tilt * (1 - k), s: 1 + (jt.s - 1) * k, k: k };
    }
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function layout() {
      if (!homes.length) return;
      var N = cards.length;
      if (simple) { // each photo drifts at its own gentle rate around the middle of the screen
        var vh0 = window.innerHeight; pg.classList.add('is-settled');
        cards.forEach(function (c, n) {
          var sr = slots[n].getBoundingClientRect(), mid = sr.top + sr.height / 2 - vh0 / 2;
          var rate = .03 + rnd(n, 2.171) * .06, tilt = (n % 2 ? 1 : -1) * (1.5 + rnd(n, 5.33) * 3.5); // every print sits a little askew, alternating left and right
          c.style.transform = 'translate3d(0,' + (-mid * rate).toFixed(1) + 'px,0) rotate(' + tilt.toFixed(2) + 'deg)';
          if (c._blur) { c._blur = 0; c.style.filter = ''; }
        });
        return;
      }
      pg.classList.toggle('is-settled', cur >= .985);
      cards.forEach(function (c, n) {
        var r = restOf(n, cur, N); rest[n] = r;
        if (n === focus) {
          var sr = slots[n].getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
          // grow out of its own spot: drift only ~30% toward the centre, and stay fully on screen
          var vw = document.documentElement.clientWidth, vh = window.innerHeight, M = 16;
          var s = Math.min(vh * .5 / h, vw * .34 / w);
          var cx0 = sr.left + sr.width / 2, cy0 = sr.top + sr.height / 2;
          var cx = cx0 + (vw / 2 - cx0) * .3, cy = cy0 + (vh / 2 - cy0) * .3;
          var hw = w * s / 2, hh = h * s / 2;
          cx = Math.max(M + hw, Math.min(vw - M - hw, cx)); cy = Math.max(M + hh, Math.min(vh - M - hh, cy));
          var dx = cx - cx0, dy = cy - cy0;
          c.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')';
        } else {
          c.style.transform = 'translate3d(' + r.tx.toFixed(1) + 'px,' + r.ty.toFixed(1) + 'px,0) rotate(' + r.rot.toFixed(2) + 'deg) scale(' + r.s.toFixed(3) + ')';
        }
        // like the project and course thumbnails: each photo comes into focus as it settles (the opening fan only softly)
        var b = n === focus || reduceMotion ? 0 : Math.round(r.k * (n < 6 ? 1.6 : 12) * 4) / 4;
        if (c._blur !== b) { c._blur = b; c.style.filter = b ? 'blur(' + b + 'px)' : ''; }
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
    function updateHover() { if (!pointer) return; if (cur < .5) { setFocus(-1); return; } setFocus(hitTest(pointer.x, pointer.y)); } // hover once the grid is half dealt
    if (canHover) {
      stage.addEventListener('pointermove', function (e) { pointer = { x: e.clientX, y: e.clientY }; updateHover(); });
      stage.addEventListener('pointerleave', function () { pointer = null; setFocus(-1); });
    }
    // ease the shown progress toward the scroll position so wheel and trackpad steps don't judder
    function tick() {
      var d = target - cur;
      if (Math.abs(d) < .0008) { cur = target; ticking = false; floating = false; layout(); updateHover(); return; }
      cur += d * (floating ? .04 : .085); layout(); updateHover(); requestAnimationFrame(tick);
    }
    // when the visitor rests mid-way through the pin, the photos float on into the grid by themselves
    function kick() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
    window.addEventListener('scroll', function () {
      if (simple) { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; layout(); }); } return; }
      var p = progress();
      if (p <= .001) latched = false;
      target = latched ? 1 : p;
      if (!floating) kick();
      clearTimeout(idle);
      idle = setTimeout(function () {
        var q = progress();
        if (pinH && q > .001 && q < .999 && !latched) { latched = true; floating = true; target = 1; kick(); }
      }, 1400);
    }, { passive: true });
    window.addEventListener('resize', function () { setFocus(-1); measure(); });
    window.addEventListener('load', measure);
    allSlots.forEach(function (s) { var im = s.querySelector('img'); if (im && !im.complete) im.addEventListener('load', measure, { once: true }); });
    measure();
  }
  // phones: a different playground collage on each visit (cycles through six)
  (function () {
    var k; try { k = (parseInt(localStorage.getItem('pgLay') || '-1', 10) + 1) % 6; localStorage.setItem('pgLay', String(k)); } catch (e) { k = Math.floor(Math.random() * 6); }
    document.querySelectorAll('[data-playground]').forEach(function (pg) { pg.setAttribute('data-lay', String(k)); });
  })();
  if (!reduce) document.querySelectorAll('[data-playground]').forEach(initPlayground);

  /* Footer clouds: fade in once loaded */
  document.querySelectorAll('img.footer_bg').forEach(function (im) {
    var done = function () { im.classList.add('is-loaded'); };
    if (im.complete && im.naturalWidth) done(); else { im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true }); }
  });

  /* ---------- 5b. Warm up the Contact cams from other pages: once the page is idle, open the YouTube connections and fetch its player script and the contact page ---------- */
  if (!document.querySelector('[data-livecam]')) {
    var warm = function () {
      ['https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://i.ytimg.com', 'https://www.google.com'].forEach(function (h) { var l = document.createElement('link'); l.rel = 'preconnect'; l.href = h; l.crossOrigin = ''; document.head.appendChild(l); });
      [['https://www.youtube.com/iframe_api', 'script'], [new URL('contact.html', siteRoot).href, 'document']].forEach(function (u) { var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u[0]; l.as = u[1]; document.head.appendChild(l); });
    };
    var idle = window.requestIdleCallback || function (f) { setTimeout(f, 1500); };
    if (document.readyState === 'complete') idle(warm); else window.addEventListener('load', function () { idle(warm); });
  }

  /* ---------- 6. Contact: live LA cams over the mirror photo ----------
     Only cams that are actually streaming are shown: a cam that errors, ends, or hasn't started playing within 8s is skipped.
     The arrows step through the live cams; the photo shows only until the first cam is up (or if none are). */
  var cam = document.querySelector('[data-livecam]');
  if (cam) {
    var list; try { list = JSON.parse(cam.getAttribute('data-livecam')); } catch (err) { list = []; }
    // a different order every visit, so it isn't always the same beach first
    for (var q = list.length - 1; q > 0; q--) { var w = Math.floor(Math.random() * (q + 1)), t = list[q]; list[q] = list[w]; list[w] = t; }
    // the label carries the current time in LA
    var timeEl = cam.querySelector('.livecam_time');
    function tick() { if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }); }
    tick(); setInterval(tick, 15000);
    var screen = cam.querySelector('.livecam_screen'), placeEl = cam.querySelector('.livecam_place'), src = cam.querySelector('.livecam_src');
    var idx = -1, player = null, dead = {}, apiReady = false, dir = 1, wait = 0, reveal = 0, started = false;
    function label(s) { placeEl.textContent = s ? 'Live · ' + s.place : 'Los Angeles'; if (s && src) src.href = 'https://www.youtube.com/watch?v=' + s.id; }
    function alive() { return list.filter(function (s) { return !dead[s.id]; }); }
    function offline() { cam.classList.remove('is-live'); cam.classList.add('is-offline'); label(null); if (player && player.stopVideo) player.stopVideo(); }
    // remember which cams worked and which were offline (for a day), so the next visit starts on a working one straight away
    var memo = {}; try { memo = JSON.parse(localStorage.getItem('camMemo') || '{}'); } catch (e) {}
    function save() { try { localStorage.setItem('camMemo', JSON.stringify(memo)); } catch (e) {} }
    function good(id) { memo[id] = { ok: 1, t: Date.now() }; save(); }
    list.forEach(function (s) { var m = memo[s.id]; if (m && !m.ok && Date.now() - m.t < 864e5) dead[s.id] = true; });
    list.sort(function (a, b) { return ((memo[b.id] && memo[b.id].ok) ? 1 : 0) - ((memo[a.id] && memo[a.id].ok) ? 1 : 0); });
    if (!alive().length) { dead = {}; } // everything was marked offline: give them all another chance
    function skip() { memo[list[idx].id] = { ok: 0, t: Date.now() }; save(); dead[list[idx].id] = true; if (alive().length) show(idx + dir); else offline(); }
    function show(i) {
      if (!alive().length) { offline(); return; }
      var n = list.length; idx = ((i % n) + n) % n;
      while (dead[list[idx].id]) idx = ((idx + dir) % n + n) % n;
      var s = list[idx]; cam.classList.remove('is-live'); clearTimeout(wait); clearTimeout(reveal);
      wait = setTimeout(function () { if (!cam.classList.contains('is-live')) skip(); }, 4000); // never started: treat as offline
      if (!player) {
        var host = document.createElement('div'); screen.appendChild(host);
        player = new YT.Player(host, { host: 'https://www.youtube-nocookie.com', videoId: s.id,
          playerVars: { autoplay: 1, mute: 1, controls: 0, playsinline: 1, modestbranding: 1, rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0 },
          events: {
            onReady: function (e) { e.target.mute(); e.target.playVideo(); },
            onStateChange: function (e) {
              // reveal only after it has been playing for a moment, so YouTube's play/pause flash never shows
              if (e.data === 1) { clearTimeout(wait); clearTimeout(reveal); reveal = setTimeout(function () { cam.classList.add('is-live'); label(list[idx]); good(list[idx].id); }, 700); }
              else if (e.data === 0) skip(); // the stream ended
            },
            onError: function () { clearTimeout(wait); skip(); }
          } });
      } else { player.loadVideoById(s.id); }
    }
    cam.querySelectorAll('.livecam_btn').forEach(function (b) { b.addEventListener('click', function () { if (!apiReady || !alive().length) return; dir = +b.getAttribute('data-dir'); show(idx + dir); }); });
    // Load YouTube's player API. If it never arrives (blocked network), the photo stays and the arrows stay hidden.
    var prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (prevReady) prevReady(); apiReady = true; cam.classList.add('is-ready'); label(null);
      var go = function () { if (started) return; started = true; dir = 1; show(0); };
      go(); // start right away (muted, hidden behind the skeleton), so the feed is already playing by the time you scroll to it
    };
    var tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; tag.async = true; document.head.appendChild(tag);
  }

  /* ---------- 7. Project thumbnails: a single glitched frame on hover ----------
     Effect is set on <body data-thumb-hover="mosh|pixelate|dither"> (default: mosh). Hover shows one fixed glitched frame; leaving restores the photo. */
  (function () {
    if (reduce) return;
    var touch = !window.matchMedia('(hover: hover)').matches, shows = []; // touch screens: cards glitch one at a time as they scroll into view
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
      function glitchOn() {
        if (!img.complete || !prep()) return false;
        var real = Math.random; Math.random = seeded(seed * 7919); // the same glitch every time for this card
        try { fx(MAX, cv.width, cv.height); } finally { Math.random = real; }
        cv.classList.add('is-on'); return true;
      }
      if (!touch) {
        card.addEventListener('mouseenter', glitchOn);
        card.addEventListener('mouseleave', function () { cv.classList.remove('is-on'); });
      } else if (!card.closest('.swiper')) shows.push({ card: card, img: img, tries: 0, on: glitchOn, off: function () { cv.classList.remove('is-on'); } });
    });
    // touch: a queue so only one card glitches at a time; each card plays once, as it comes into view
    if (touch && shows.length && 'IntersectionObserver' in window) {
      var queue = [], busy = false;
      function next() {
        if (busy || !queue.length) return; var s = queue.shift(); busy = true;
        if (!s.on()) { // photo not ready yet: retry once it has loaded (and the page has settled)
          busy = false; if (s.tries++ < 4) { var again = function () { setTimeout(function () { queue.push(s); next(); }, 300); }; if (s.img.complete) setTimeout(again, 400); else s.img.addEventListener('load', again, { once: true }); }
          next(); return; }
        setTimeout(function () { s.off(); setTimeout(function () { busy = false; next(); }, 260); }, 340);
      }
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (!e.isIntersecting) return; var s = shows.filter(function (x) { return x.card === e.target; })[0]; io.unobserve(e.target); if (s) { queue.push(s); next(); } });
      }, { threshold: .6 });
      var start = function () { shows.forEach(function (s) { io.observe(s.card); }); };
      // nothing glitches until the visitor starts scrolling (a real move, not the page settling)
      var y0 = window.scrollY, begun = false;
      var onScroll = function () { if (begun || Math.abs(window.scrollY - y0) < 24) return; begun = true; window.removeEventListener('scroll', onScroll); start(); };
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  })();

  /* ---------- 8. Home carousels (projects, courses): native scroll, mouse drag, arrow pills ---------- */
  var PAG_HTML = "<div class=\"testimonial_pagination\"><div class=\"testimonial_controls cc-prev\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" viewBox=\"0 0 23 18\" fill=\"none\" class=\"u-icon cc-24 u-z-index-1\"><path d=\"M8.38769 17.28L9.79569 16L3.8117 9.6H22.4997V7.712H3.8117L9.79569 1.312L8.38769 0L0.387695 8.64L8.38769 17.28Z\" fill=\"currentColor\"></path></svg></div><div class=\"testimonial_controls cc-next\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100%\" viewBox=\"0 0 25 25\" fill=\"none\" class=\"u-icon cc-24 u-z-index-1\"><path d=\"M15.612 21.28L14.204 20L20.188 13.6L1.5 13.6V11.712H20.188L14.204 5.312L15.612 4L23.612 12.64L15.612 21.28Z\" fill=\"currentColor\"></path></svg></div></div>";
  document.querySelectorAll('.swiper-wrapper.cc-project').forEach(function (wrap) {
    var sc = wrap.parentElement; if (!sc) return;
    // bleed off the right edge of the screen; the last card still lines up with the page column at the end
    function bleed() {
      sc.style.marginRight = '0px'; sc.style.paddingRight = '0px'; sc.style.marginLeft = '0px'; sc.style.paddingLeft = '0px';
      // flex wrappers between the carousel and its section must not grow to fit the row
      for (var el = sc; el && el.tagName !== 'SECTION'; el = el.parentElement) el.style.minWidth = '0';
      var row = sc.closest('.row'); if (row) row.style.alignSelf = 'stretch'; // in a left-aligned column the row would size to its content
      // size the cards from the column width (3 across, or 80% on phones) and let the row contain them, so the end padding applies
      wrap.style.width = '';
      // exactly three cards on screen at every size: from the column's left edge to a gap's width inside the window's
      // right edge, so the 4th card starts right at the edge and never peeks in
      var g = parseFloat(getComputedStyle(wrap).columnGap) || 0, left = sc.getBoundingClientRect().left;
      var vw = document.documentElement.clientWidth;
      var w = vw < 768 ? (vw - left - 2 * g) / 2.25 // phones: two full cards and a quarter of the third
                       : Math.max(80, (vw - left - g - 2 * g) / 3);
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
    // one bar above the cards: 'View all' on the left, the arrows on the right
    // carousel head: title with the arrows on the same line (right), 'View all' under the title
    var head = document.createElement('div'); head.className = 'carousel-head';
    var title = sc.parentElement.querySelector(':scope > .carousel-title'), seeAll = sc.parentElement.querySelector(':scope > .see-all');
    sc.parentElement.insertBefore(head, title || sc);
    if (title) head.appendChild(title);
    head.appendChild(pag); pag.classList.add('cc-top');
    // one black "ink" circle that flows between the arrows on hover: the leading edge moves first, the trailing edge catches up
    (function () {
      var ink = document.createElement('span'); ink.className = 'arrow-ink'; ink.setAttribute('aria-hidden', 'true'); pag.insertBefore(ink, pag.firstChild);
      var side = null, hovering = false, over = null, ctls = [].slice.call(pag.querySelectorAll('.testimonial_controls'));
      function to(ctl) {
        var l = ctl.offsetLeft, r = pag.clientWidth - l - ctl.offsetWidth, s = ctl.classList.contains('cc-next') ? 'next' : 'prev';
        if (side && side !== s) pag.classList.toggle('ink-right', s === 'next'); else if (!side) { pag.classList.add('ink-jump'); void ink.offsetWidth; }
        ink.style.left = l + 'px'; ink.style.right = r + 'px'; side = s;
        ctls.forEach(function (c) { c.classList.toggle('is-inked', c === ctl); });
        pag.classList.add('ink-on'); requestAnimationFrame(function () { pag.classList.remove('ink-jump'); });
      }
      // at rest there is no ink: it only appears under the arrow being hovered
      function refit() { if (hovering && over && !over.classList.contains('is-disabled')) { pag.classList.add('ink-jump'); to(over); } else { hovering = hovering && !!over && !over.classList.contains('is-disabled'); rest(); } }
      function rest() {
        if (hovering) return;
        pag.classList.remove('ink-on'); side = null; ctls.forEach(function (x) { x.classList.remove('is-inked'); });
      }
      ctls.forEach(function (c) {
        c.addEventListener('pointerenter', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; hovering = true; over = c; if (!c.classList.contains('is-disabled')) to(c); }); // touch taps don't summon the ink
        c.addEventListener('transitionend', function (e) { if (e.propertyName === 'width') refit(); }); // an arrow folded in or out: the ink follows the arrow under the pointer
      });
      pag.addEventListener('pointerleave', function () { hovering = false; over = null; rest(); });
      var rq = 0; sc.addEventListener('scroll', function () { if (!rq) rq = requestAnimationFrame(function () { rq = 0; refit(); }); }, { passive: true });
      window.addEventListener('resize', rest);
      requestAnimationFrame(function () { requestAnimationFrame(rest); }); window.addEventListener('load', rest);
    })();
    if (seeAll) head.appendChild(seeAll);
    // cards fade in from the right the first time the carousel scrolls into view
    if (!reduce && 'IntersectionObserver' in window) {
      sc.classList.add('is-waiting');
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { sc.classList.remove('is-waiting'); sc.classList.add('is-in'); io.disconnect(); } }); }, { threshold: .2 });
      io.observe(sc);
      Array.prototype.forEach.call(wrap.children, function (s, i) { s.style.setProperty('--d', (i * .12).toFixed(2) + 's'); });
    }
    var prev = pag.querySelector('.cc-prev'), next = pag.querySelector('.cc-next');
    function step() { var s = wrap.children[0]; return s ? s.getBoundingClientRect().width + (parseFloat(getComputedStyle(wrap).columnGap) || 0) : sc.clientWidth; }
    function ends() {
      // card snapping (and Safari's padding) can leave the strip a few px in from either end: treat that as the end
      var SLACK = 24, max = sc.scrollWidth - sc.clientWidth - SLACK, atStart = sc.scrollLeft <= SLACK, atEnd = sc.scrollLeft >= max;
      if (prev) prev.classList.toggle('is-disabled', atStart);
      if (next) next.classList.toggle('is-disabled', atEnd);
      pag.classList.toggle('is-empty', atStart && atEnd); // nothing to scroll: hide the control entirely
    }
    [prev, next].forEach(function (b, i) { if (!b) return; b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0'); b.setAttribute('aria-label', i ? 'Next' : 'Previous');
      var go = function () { sc.scrollBy({ left: (i ? 1 : -1) * step(), behavior: 'smooth' }); };
      b.addEventListener('click', go); b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
    sc.addEventListener('scroll', ends, { passive: true }); window.addEventListener('resize', ends); setTimeout(ends, 50);
    // clearly sideways trackpad swipes scroll the carousel natively (kept away from the smooth-scroll library);
    // everything else is left alone, so vertical page scrolling over a carousel behaves exactly as elsewhere
    sc.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) e.stopPropagation();
    }, { passive: true });
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
    // resting the mouse within 48px of the carousel's left or right edge scrolls it that way, faster nearer the edge
    var auto = 0, autoV = 0, EDGE = 48;
    function autoLoop() {
      if (!autoV) { auto = 0; sc.classList.remove('is-autoscroll'); return; }
      var before = sc.scrollLeft; sc.scrollLeft += autoV;
      if (sc.scrollLeft === before) { autoV = 0; } // reached the end
      auto = requestAnimationFrame(autoLoop);
    }
    sc.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || down || reduce) return;
      var r = sc.getBoundingClientRect(), x = e.clientX, v = 0;
      if (x - r.left < EDGE) v = -(1 - (x - r.left) / EDGE) * 14 - 2;
      else if (r.right - x < EDGE) v = (1 - (r.right - x) / EDGE) * 14 + 2;
      autoV = v;
      if (v && !auto) { sc.classList.add('is-autoscroll'); auto = requestAnimationFrame(autoLoop); }
    });
    sc.addEventListener('pointerleave', function () { autoV = 0; });
    // a drag should not count as a click on the card underneath
    sc.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  /* ---------- 9. Forms: submit is disabled while every field is empty ---------- */
  document.querySelectorAll('form.form').forEach(function (form) {
    if (form.closest('.gate-modal') || form.hasAttribute('data-contact')) return; // the password modal and contact form have their own handling
    var fields = Array.prototype.slice.call(form.querySelectorAll('input:not([type=submit]):not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select'));
    var submit = form.querySelector('[type=submit]'); if (!submit || !fields.length) return;
    function update() { var empty = fields.every(function (f) { return !String(f.value || '').trim(); }); submit.disabled = empty; submit.setAttribute('aria-disabled', empty ? 'true' : 'false'); }
    form.addEventListener('input', update); form.addEventListener('change', update); update();
    window.addEventListener('load', function () { update(); setTimeout(update, 300); }); // Webflow's form script re-enables the button when it starts up
  });

  /* ---------- 10. Hero loop: still photo for reduced motion ---------- */
  document.querySelectorAll('video.hero_photo, video.about_video, video.about_sky').forEach(function (v) {
    if (reduce) { v.removeAttribute('autoplay'); v.pause(); return; }
    var p = v.play(); if (p && p.catch) p.catch(function () {}); // some browsers block autoplay; the poster still shows
  });

  // Sample at load, after fonts/images, and on resize.
  sampleBackdrop();
  window.addEventListener('load', function () { sampleBackdrop(); setTimeout(sampleBackdrop, 300); });
  window.addEventListener('resize', function () { lastKey = null; sampleBackdrop(); });
  document.querySelectorAll('img').forEach(function (im) { if (!im.complete) im.addEventListener('load', function () { lastKey = null; sampleBackdrop(); }, { once: true }); });
})();
