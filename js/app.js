/* 14th Street Pizza Co. — site logic. Data lives in data/menu.js and data/branches.js. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var MENU = window.MENU || [];
  var BRANCHES = window.BRANCHES || [];
  var ZONES = window.ZONES || [];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var root = document.documentElement;
  if (!hasGsap || reduce) root.classList.add('no-anim');
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function num(n) { return Math.floor(n).toLocaleString('en-US'); }
  function money(n) {
    if (n == null) return '';
    var whole = Math.floor(n + 1e-9), cents = Math.round((n - whole) * 100);
    return 'Rs.&nbsp;' + num(whole) + (cents ? '<small>.' + String(cents).padStart(2, '0') + '</small>' : '');
  }
  function plain(n) { var w = Math.floor(n + 1e-9), c = Math.round((n - w) * 100); return 'Rs. ' + num(w) + (c ? '.' + String(c).padStart(2, '0') : ''); }
  function section(name) { for (var i = 0; i < MENU.length; i++) if (MENU[i].name === name) return MENU[i]; return { items: [] }; }
  function group(item, re) { for (var i = 0; i < item.o.length; i++) if (re.test(item.o[i].g)) return item.o[i]; return null; }
  function sizeLabel(name) {
    var m = /(\d+)\s*Inch\s*\(([^)]+)\)/i.exec(name);
    if (!m) return name;
    return m[1] + '″ ' + m[2].toLowerCase();
  }
  function sectionSlug(s) { return s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + s.id; }
  function pkNow() {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    var h = parseInt(o.hour, 10) % 24, m = parseInt(o.minute, 10);
    return { day: o.weekday, h: h, m: m, mins: h * 60 + m };
  }
  var lenis = null;
  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function swipe(el, onNext, onPrev) {
    if (!el) return;
    var x0 = 0, y0 = 0, on = false;
    el.addEventListener('pointerdown', function (e) { if (e.button) return; on = true; x0 = e.clientX; y0 = e.clientY; });
    el.addEventListener('pointerup', function (e) {
      if (!on) return; on = false;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.3) { if (dx < 0) onNext(); else onPrev(); }
    });
    el.addEventListener('pointercancel', function () { on = false; });
  }
  function allItems() {
    var out = [];
    MENU.forEach(function (s) { s.items.forEach(function (it) { out.push({ it: it, sec: s }); }); });
    return out;
  }
  function priceBlock(it) {
    return '<span class="price">' + (it.f ? '<small>from </small>' : '') + money(it.p) + '</span>' + (it.w ? '<span class="was">' + money(it.w) + '</span>' : '');
  }

  /* ---------- preloader: the box opens ---------- */
  function intro() {
    var el = $('[data-loader]');
    if (!el) return Promise.resolve();
    if (!hasGsap || reduce) { el.classList.add('is-done'); return Promise.resolve(); }
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    var pctEl = $('[data-pct]', el), bar = $('[data-bar]', el), msg = $('[data-loader-msg]', el);
    var lid = $('[data-lid]', el), box = $('[data-box]', el), pizza = $('.box__pizza', el);
    var prog = { v: 0 }, loaded = document.readyState === 'complete';
    window.addEventListener('load', function () { loaded = true; });
    function paint() {
      var v = Math.round(prog.v);
      pctEl.textContent = v; bar.style.width = v + '%';
      msg.textContent = v < 45 ? 'Firing up the oven' : v < 90 ? 'Slicing it up' : 'Hot & ready';
    }
    return new Promise(function (res) {
      var done = false;
      function finish() {
        if (done) return; done = true;
        gsap.timeline({ onComplete: function () {
          el.classList.add('is-done'); document.body.style.overflow = ''; if (lenis) lenis.start(); res();
        } })
          .to(prog, { v: 100, duration: .35, ease: 'power1.out', onUpdate: paint })
          .to(pizza, { scale: 1.12, duration: .3, ease: 'power2.out' }, '<')
          .to('.loader__stage', { scale: 1.25, opacity: 0, duration: .55, ease: 'power3.in' }, '+=.12')
          .to('.loader__half--top', { yPercent: -101, duration: .8, ease: 'expo.inOut' }, '-=.22')
          .to('.loader__half--bottom', { yPercent: 101, duration: .8, ease: 'expo.inOut' }, '<');
      }
      gsap.set(lid, { z: 30, transformOrigin: '50% 0%' });
      var tl = gsap.timeline();
      tl.from(box, { y: -120, opacity: 0, rotationZ: -40, duration: .75, ease: 'back.out(1.6)' })
        .from('.loader__line, .loader__bar', { y: 16, opacity: 0, duration: .5, ease: 'expo.out', stagger: .06 }, '-=.4')
        .to(lid, { rotationX: -122, duration: .95, ease: 'power3.inOut' }, '+=.05')
        .fromTo(pizza, { rotation: -60, scale: .9 }, { rotation: 40, scale: 1, duration: 1.4, ease: 'power2.out' }, '<')
        .fromTo('.steam', { opacity: 0, y: 0 }, { opacity: .8, y: -40, duration: .9, ease: 'sine.out', stagger: .18 }, '-=.9')
        .to('.steam', { opacity: 0, duration: .5 }, '-=.2');
      gsap.to(prog, { v: 82, duration: 1.7, ease: 'power1.out', onUpdate: paint });
      var minT = setTimeout(function check() {
        if (loaded) finish(); else setTimeout(check, 120);
      }, 1900);
      setTimeout(finish, 4500); // never hold the page hostage
      el.addEventListener('click', function () { clearTimeout(minT); finish(); });
    });
  }

  /* ---------- nav ---------- */
  function nav() {
    var n = $('[data-nav]'), last = 0, burger = $('.nav__burger');
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      n.classList.toggle('is-scrolled', y > 10);
      var drawerOpen = !$('#drawer').hidden;
      if (drawerOpen && Math.abs(y - last) > 30) burger.click();
      n.classList.toggle('is-hidden', !drawerOpen && y > 500 && y > last + 4);
      if (y < last - 4) n.classList.remove('is-hidden');
      root.classList.toggle('nav-hidden', n.classList.contains('is-hidden'));
      last = y;
    }, { passive: true });

    var drawer = $('#drawer'), scrim = $('[data-drawer-scrim]');
    function place() { drawer.style.top = Math.round(n.getBoundingClientRect().bottom + 10) + 'px'; }
    function setDrawer(open) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) {
        place(); drawer.hidden = false; scrim.hidden = false;
        if (hasGsap && !reduce) {
          gsap.fromTo(drawer, { opacity: 0, scale: .9, y: -8 }, { opacity: 1, scale: 1, y: 0, duration: .38, ease: 'back.out(1.7)' });
          gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: .25 });
          gsap.fromTo('#drawer nav a', { x: 14, opacity: 0 }, { x: 0, opacity: 1, duration: .35, ease: 'expo.out', stagger: .03, delay: .05 });
        }
        var first = $('#drawer nav a'); if (first) first.focus({ preventScroll: true });
      } else if (!drawer.hidden) {
        if (hasGsap && !reduce) {
          gsap.to(drawer, { opacity: 0, scale: .94, y: -6, duration: .2, ease: 'power2.in', onComplete: function () { drawer.hidden = true; } });
          gsap.to(scrim, { opacity: 0, duration: .2, onComplete: function () { scrim.hidden = true; } });
        } else { drawer.hidden = true; scrim.hidden = true; }
      }
    }
    burger.addEventListener('click', function () { setDrawer(drawer.hidden); });
    scrim.addEventListener('click', function () { setDrawer(false); });
    window.addEventListener('resize', function () { if (!drawer.hidden) place(); });
    $$('#drawer a').forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
    // in-page links: smooth, offset for the header
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]'); if (!a) return;
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var t = document.querySelector(id); if (!t) return;
      e.preventDefault();
      scrollToY(t.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 200 : 64));
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); burger.focus(); } });

    // active link
    var links = $$('.nav__links a');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['xtreme', 'flavours', 'deals', 'menu', 'branches'].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- ticker: duplicate list for a seamless loop ---------- */
  function ticker() {
    var track = $('.ticker__track'), list = $('.ticker__list');
    if (!track || !list) return;
    var copy = list.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); track.appendChild(copy);
  }

  /* ---------- hero ---------- */
  function hero() {
    if (!hasGsap || reduce) return;
    var stage = $('.hero__stage');
    var floats = $$('.float');
    var mx = 0, my = 0;
    if (finePointer) stage.parentElement.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      mx = (e.clientX - (r.left + r.width / 2)) / r.width;
      my = (e.clientY - (r.top + r.height / 2)) / r.height;
      floats.forEach(function (f) {
        var d = parseFloat(f.dataset.depth || 1);
        gsap.to(f, { x: mx * 34 * d, y: my * 34 * d, duration: 1, ease: 'power3.out', overwrite: 'auto' });
      });
      gsap.to('[data-tilt]', { rotationY: mx * 10, rotationX: -my * 10, duration: 1, ease: 'power3.out', transformPerspective: 900 });
    });
    floats.forEach(function (f, i) {
      gsap.to(f, { rotation: i % 2 ? 8 : -8, yPercent: i % 2 ? 6 : -6, duration: 3 + i * .6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
    gsap.to('.hero__plate', { scale: .86, yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__cloth', { rotationX: 38, rotation: 30, transformPerspective: 1000, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__stage', { rotationX: 18, transformPerspective: 1200, transformOrigin: '50% 100%', ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.float--1, .float--3', { yPercent: -60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.float--2, .float--4', { yPercent: -120, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  function heroIn() {
    if (!hasGsap || reduce) return;
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__sign', { y: -40, rotation: -14, opacity: 0, duration: .8, ease: 'back.out(2)' })
      .from('.hero__line > span', { yPercent: 110, duration: 1, stagger: .1 }, '-=.6')
      .from('.hero__lede, .hero__cta, .hero__facts', { y: 26, opacity: 0, duration: .8, stagger: .08 }, '-=.7')
      .from('.hero__cloth', { scale: .4, rotation: -80, opacity: 0, duration: 1.2 }, 0)
      .from('.hero__plate', { scale: .3, rotation: -140, opacity: 0, duration: 1.3 }, .1)
      .from('.float', { scale: 0, opacity: 0, duration: .8, stagger: .07, ease: 'back.out(2)' }, .5)
      .from('.hero__note', { scale: .6, opacity: 0, rotation: -20, duration: .7, ease: 'back.out(2.4)' }, .9);
  }

  /* ---------- best sellers ---------- */
  function best() {
    var list = $('[data-best]');
    var items = allItems().filter(function (x) { return x.it.c; }).sort(function (a, b) { return b.it.c - a.it.c; }).slice(0, 7);
    var max = items[0] ? items[0].it.c : 1;
    list.innerHTML = items.map(function (x, i) {
      return '<li class="best__item"><button class="best__row" type="button" data-open="' + esc(x.sec.name) + '|' + esc(x.it.s) + '">' +
        '<span class="best__rank">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<img class="best__img" src="' + esc(x.it.img.replace('assets/img/', 'assets/thumb/')) + '" alt="" loading="lazy" decoding="async" width="92" height="92">' +
        '<span class="best__name">' + esc(x.it.n) + '<span class="best__sec">' + esc(x.sec.name) + '<span class="best__p"> · ' + priceBlock(x.it) + '</span></span></span>' +
        '<span class="best__count"><span class="best__num" data-count="' + x.it.c + '">' + num(x.it.c) + '</span><span class="best__unit">orders</span></span>' +
        '<span class="best__bar" style="width:' + (x.it.c / max * 100).toFixed(1) + '%" aria-hidden="true"></span>' +
        '</button></li>';
    }).join('');
    if (!hasGsap || reduce) return;
    gsap.from('.best__bar', { scaleX: 0, duration: 1.4, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: list, start: 'top 75%' } });
    gsap.from('.best__item', { y: 30, opacity: 0, duration: .8, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: list, start: 'top 80%' } });
    $$('[data-count]', list).forEach(function (el) {
      var to = +el.dataset.count, o = { v: 0 };
      gsap.to(o, { v: to, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: function () { el.textContent = num(o.v); } });
    });
  }

  /* ---------- xtreme ---------- */
  function xtreme() {
    var sec = section('Xtreme Pizza');
    var tabs = $('[data-xtreme-tabs]'), detail = $('[data-xtreme-detail]'), top = $('[data-deck-top]');
    var startIdx = 0;
    sec.items.forEach(function (it, i) { if (it.c > sec.items[startIdx].c) startIdx = i; });
    tabs.innerHTML = sec.items.map(function (it, i) {
      return '<button class="xtab" role="tab" type="button" id="xt-' + i + '" aria-selected="' + (i === startIdx) + '" aria-controls="xtreme-panel" tabindex="' + (i === startIdx ? 0 : -1) + '">' + esc(it.n.replace(/^Xtreme\s*/, '')) + '</button>';
    }).join('');
    detail.id = 'xtreme-panel'; detail.setAttribute('role', 'tabpanel');

    function render(i, animate) {
      var it = sec.items[i];
      detail.setAttribute('aria-labelledby', 'xt-' + i);
      var g = group(it, /size/i);
      var sizes = g ? g.ch : [];
      detail.innerHTML =
        '<p class="xd__desc">' + esc(it.d) + '</p>' +
        '<ul class="xd__sizes">' + sizes.map(function (c) {
          var m = /(\d+)\s*Inch\s*\(([^)]+)\)/.exec(c[0]);
          return '<li class="xd__size glass glass--dark"><b>' + (m ? m[1] + '″' : esc(c[0])) + '</b><span>' + (m ? esc(m[2]) : '') + '</span><span class="price">' + money(c[1]) + '</span></li>';
        }).join('') + '</ul>' +
        '<div class="xd__foot"><a class="btn btn--yellow" href="' + esc(it.u) + '" target="_blank" rel="noopener">Order ' + esc(it.n) + '</a>' +
        '<span class="xd__count">ordered ' + num(it.c) + ' times</span></div>';
      if (animate && hasGsap && !reduce) {
        gsap.from(detail.children, { y: 16, opacity: 0, duration: .5, ease: 'expo.out', stagger: .05 });
        gsap.timeline()
          .to(top, { rotation: '+=160', scale: .7, opacity: 0, duration: .32, ease: 'power2.in', onComplete: function () { top.src = it.img; } })
          .to(top, { rotation: '+=200', scale: 1, opacity: 1, duration: .7, ease: 'expo.out' });
      } else { top.src = it.img; }
    }
    var select = function (i, focus) {
      $$('.xtab', tabs).forEach(function (b, j) { b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; if (j === i && focus) b.focus(); });
      render(i, true);
    };
    tabs.addEventListener('click', function (e) { var b = e.target.closest('.xtab'); if (b) select($$('.xtab', tabs).indexOf(b)); });
    tabs.addEventListener('keydown', function (e) {
      var bs = $$('.xtab', tabs), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select((i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length, true); }
    });
    render(startIdx, false);
    var xcur = startIdx;
    var _sel = select;
    select = function (i, focus) { xcur = i; _sel(i, focus); };
    swipe($('.xtreme__stage'), function () { select((xcur + 1) % sec.items.length); }, function () { select((xcur - 1 + sec.items.length) % sec.items.length); });

    if (!hasGsap || reduce) { $$('.stack__label').forEach(function (l) { l.style.opacity = 1; }); return; }
    var mm = gsap.matchMedia();
    mm.add('(min-width: 961px)', function () {
      var tl = gsap.timeline({ scrollTrigger: { trigger: '[data-xtreme-pin]', start: 'top top', end: '+=110%', scrub: .8, pin: true, anticipatePin: 1 } });
      tl.fromTo('[data-deck="top"]', { yPercent: -3 }, { yPercent: -30, ease: 'none' }, 0)
        .fromTo('[data-deck="bottom"]', { yPercent: 4 }, { yPercent: 16, ease: 'none' }, 0)
        .fromTo('.deck img', { rotation: 0 }, { rotation: 120, ease: 'none' }, 0)
        .fromTo('.stack__label', { opacity: 0, x: 20 }, { opacity: 1, x: 0, stagger: .15, ease: 'none', duration: .4 }, .3);
    });
    mm.add('(max-width: 960px)', function () {
      var tl = gsap.timeline({ scrollTrigger: { trigger: '.xtreme__stage', start: 'top 85%', end: 'bottom 30%', scrub: .8 } });
      tl.fromTo('[data-deck="top"]', { yPercent: -3 }, { yPercent: -24, ease: 'none' }, 0)
        .fromTo('[data-deck="bottom"]', { yPercent: 4 }, { yPercent: 14, ease: 'none' }, 0)
        .fromTo('.deck img', { rotation: 0 }, { rotation: 90, ease: 'none' }, 0)
        .fromTo('.stack__label', { opacity: 0 }, { opacity: 1, stagger: .1, ease: 'none', duration: .3 }, .35);
    });
  }

  /* ---------- signature flavours ---------- */
  function flavours() {
    var sec = section('Pizza Flavors');
    var list = $('[data-flav-list]'), info = $('[data-flav-info]'), img = $('[data-flav-img]'), count = $('[data-flav-count]');
    var cur = 0, busy = false;
    list.innerHTML = sec.items.map(function (it, i) {
      return '<li><button class="flav" type="button" role="option" aria-selected="' + (i === 0) + '" data-i="' + i + '">' +
        '<span class="flav__n">' + String(i + 1).padStart(2, '0') + '</span><span class="flav__name">' + esc(it.n) + '</span>' +
        '<span class="flav__price">from ' + money(it.p) + '</span></button></li>';
    }).join('');
    function preload(i) { [i - 1, i + 1].forEach(function (k) { var it = sec.items[(k + sec.items.length) % sec.items.length]; var im = new Image(); im.decoding = 'async'; im.src = it.img; }); }
    preload(0);

    function sizes(it) {
      var out = [];
      it.o.forEach(function (g) {
        if (!/size/i.test(g.g)) return;
        g.ch.forEach(function (c) {
          if (/stuffed/i.test(c[0])) return;
          if (/hand-tossed/i.test(c[0]) || /6 Inch.*Pan/i.test(c[0])) out.push({ l: sizeLabel(c[0]).replace(/ hand-tossed| pan/g, '') + (/Pan/.test(c[0]) ? ' pan' : ''), p: c[1] });
        });
      });
      return out;
    }
    function renderInfo(i) {
      var it = sec.items[i];
      info.innerHTML = '<p class="fi__name">' + esc(it.n) + '</p><p class="fi__desc">' + esc(it.d) + '</p>' +
        '<ul class="fi__sizes" aria-label="Hand-tossed sizes">' + sizes(it).map(function (s) { return '<li>' + esc(s.l) + ' · <b>' + money(s.p) + '</b></li>'; }).join('') + '</ul>' +
        '<div class="fi__foot"><div><span class="big-price">' + money(it.p) + '</span>' + (it.w ? '<span class="was">' + money(it.w) + '</span><span class="off">15% off</span>' : '') + '</div>' +
        '<div class="fi__btns"><button class="btn btn--ghost" type="button" data-open="Pizza Flavors|' + esc(it.s) + '">All sizes</button> <a class="btn btn--red" href="' + esc(it.u) + '" target="_blank" rel="noopener">Order</a></div></div>';
      count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(sec.items.length).padStart(2, '0');
    }
    function select(i) {
      if (i === cur || busy) return;
      var dir = i > cur ? 1 : -1;
      cur = i;
      $$('.flav', list).forEach(function (b, j) { b.setAttribute('aria-selected', j === i); });
      var btn = $$('.flav', list)[i];
      if (window.matchMedia('(max-width: 960px)').matches) btn.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      renderInfo(i);
      preload(i);
      if (!hasGsap || reduce) { img.src = sec.items[i].img; return; }
      busy = true;
      gsap.from(info.children, { y: 14, opacity: 0, duration: .45, ease: 'expo.out', stagger: .04 });
      gsap.timeline({ onComplete: function () { busy = false; } })
        .to(img, { xPercent: -70 * dir, rotation: -100 * dir, opacity: 0, duration: .32, ease: 'power2.in', onComplete: function () { img.src = sec.items[i].img; } })
        .fromTo(img, { xPercent: 70 * dir, rotation: 100 * dir, opacity: 0 }, { xPercent: 0, rotation: 0, opacity: 1, duration: .75, ease: 'expo.out' });
    }
    list.addEventListener('click', function (e) { var b = e.target.closest('.flav'); if (b) select(+b.dataset.i); });
    var nflav = sec.items.length;
    function step(d) { select((cur + d + nflav) % nflav); }
    $$('[data-flav-step]').forEach(function (b) { b.addEventListener('click', function () { step(+b.dataset.flavStep); }); });
    swipe($('.flavours__board'), function () { step(1); }, function () { step(-1); });
    list.addEventListener('keydown', function (e) {
      var k = e.key, n = sec.items.length;
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].indexOf(k) < 0) return;
      e.preventDefault();
      var ni = (cur + (k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1) + n) % n;
      select(ni); $$('.flav', list)[ni].focus();
    });
    renderInfo(0);
    if (hasGsap && !reduce) gsap.to('.flavours__board', { rotation: 18, ease: 'none', scrollTrigger: { trigger: '.flavours', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------- build your own ---------- */
  function build() {
    var sec = section('Create Your Own Pizza');
    var crustImg = {
      'Hand-tossed': 'assets/img/options/pizza-crust-hand-tossed.webp',
      'Pan Crust': 'assets/img/options/pizza-crust-pan.webp',
      'Thinza': 'assets/img/options/pizza-crust-thinza.webp',
      'Footlong': 'assets/img/options/crust-footlong.webp'
    };
    var crustNote = { 'Hand-tossed': 'New York style', 'Pan Crust': 'Chicago style', 'Thinza': 'Crispy thin', 'Footlong': 'Cheesy edges' };
    var vegImg = function (v) { return 'assets/img/options/select-your-veggies-' + v.toLowerCase().replace(/s$/, 's').replace(/\s+/g, '-') + '.webp'; };
    var st = { crust: 0, size: 0, stuffed: false, flavour: 0, sauce: 0, veg: [] };
    var elC = $('[data-crusts]'), elS = $('[data-sizes]'), elStuff = $('[data-stuffed]'), elStuffWrap = $('[data-stuffed-wrap]');
    var elF = $('[data-flavour]'), elSa = $('[data-sauces]'), elV = $('[data-veg]');
    var rings = $('[data-rings]'), lp = $('[data-ladder-pizza]'), rec = $('[data-receipt]'), tot = $('[data-total]'), go = $('[data-build-order]');

    elC.innerHTML = sec.items.map(function (it, i) {
      return '<button class="opt" type="button" aria-pressed="' + (i === 0) + '" data-i="' + i + '"><img src="' + crustImg[it.n] + '" alt="" loading="lazy"><b>' + esc(it.n.replace(' Crust', '')) + '</b><small>' + (crustNote[it.n] || '') + '</small></button>';
    }).join('');
    // ring guides: 6 9 12 15 20
    var inches = [20, 15, 12, 9, 6];
    rings.innerHTML = inches.map(function (d) {
      var r = d * 5, a = -Math.PI / 4, x = (r * Math.cos(a)).toFixed(1), y = (r * Math.sin(a)).toFixed(1);
      return '<circle class="ring" data-d="' + d + '" r="' + r + '"></circle>';
    }).join('') + inches.map(function (d) {
      var r = d * 5, a = -Math.PI / 4 + (d === 6 ? -0.3 : 0), x = (r * Math.cos(a)).toFixed(1), y = (r * Math.sin(a)).toFixed(1);
      return '<g class="ring-tag" transform="translate(' + x + ' ' + y + ')"><rect class="ring-pill" x="-9" y="-6" width="18" height="11" rx="2"></rect><text class="ring-label" data-d="' + d + '" x="0" y="3" text-anchor="middle">' + d + '″</text></g>';
    }).join('');

    function sizesOf(it) {
      var g = group(it, /size/i); if (!g) return [];
      var base = [], stuffed = {};
      g.ch.forEach(function (c) {
        var name = c[0], price = c[1] || it.p;
        if (/^stuffed/i.test(name)) stuffed[name.replace(/^Stuffed Crust\s*/i, '')] = price;
        else base.push({ n: name, p: price });
      });
      base.forEach(function (b) { b.sp = stuffed[b.n] || null; });
      return base;
    }
    function chips(el, g, cur, many) {
      el.innerHTML = g ? g.ch.map(function (c, i) {
        var on = many ? cur.indexOf(i) > -1 : cur === i;
        return '<button class="chip" type="button" role="' + (many ? 'checkbox' : 'radio') + '" aria-checked="' + on + '" data-i="' + i + '">' + esc(c[0]) + '</button>';
      }).join('') : '';
    }
    function renderAll() {
      var it = sec.items[st.crust];
      $$('.opt', elC).forEach(function (b, i) { b.setAttribute('aria-pressed', i === st.crust); });
      var sz = sizesOf(it);
      if (st.size >= sz.length) st.size = 0;
      elS.innerHTML = sz.map(function (s, i) {
        var m = /(\d+)\s*Inch\s*\(([^)]+)\)/.exec(s.n);
        return '<button class="size" type="button" role="radio" aria-checked="' + (i === st.size) + '" data-i="' + i + '"><b>' + (m ? m[1] + '″' : esc(s.n)) + '</b><span>' + (m ? esc(m[2]) : '') + ' · ' + plain(s.p) + '</span></button>';
      }).join('');
      elS.setAttribute('role', 'radiogroup'); elS.setAttribute('aria-label', 'Size');
      var cur = sz[st.size];
      var canStuff = !!(cur && cur.sp);
      elStuff.disabled = !canStuff;
      if (!canStuff) st.stuffed = false;
      elStuff.checked = st.stuffed;
      elStuffWrap.title = canStuff ? '' : 'Stuffed crust is available on hand-tossed only';
      chips(elF, group(it, /flavour/i), st.flavour, false);
      chips(elSa, group(it, /sauce/i), st.sauce, false);
      var vg = group(it, /veggies/i);
      elV.innerHTML = vg ? vg.ch.map(function (c, i) {
        return '<button class="opt" type="button" aria-pressed="' + (st.veg.indexOf(i) > -1) + '" data-i="' + i + '"><img src="' + vegImg(c[0]) + '" alt="" loading="lazy"><b>' + esc(c[0]) + '</b></button>';
      }).join('') : '';
      renderVisual(it, cur);
    }
    function renderVisual(it, cur) {
      var m = cur ? /(\d+)\s*Inch\s*\(([^)]+)\)/.exec(cur.n) : null;
      var d = m ? +m[1] : 12, isSlice = m && /slice/i.test(m[2]);
      $$('.ring, .ring-label', rings).forEach(function (r) { r.classList.toggle('is-on', +r.dataset.d === d); });
      var src = it.img, foot = it.n === 'Footlong';
      if (lp.getAttribute('src') !== src) lp.src = src;
      lp.style.setProperty('--s', (d * 10 / 220 * (foot ? 1.25 : 1.03)).toFixed(3));
      lp.style.clipPath = foot ? 'none' : '';
      lp.classList.toggle('is-slice', !!isSlice);
      var fl = group(it, /flavour/i), sa = group(it, /sauce/i), vg = group(it, /veggies/i);
      var price = cur ? (st.stuffed && cur.sp ? cur.sp : cur.p) : it.p;
      var lines = [
        ['Crust', it.n.replace(' Crust', '')],
        ['Size', cur ? sizeLabel(cur.n).replace(/ (pan|thinza|footlong)$/, '') + (st.stuffed ? ', stuffed crust' : '') : '—'],
        ['Flavour', fl ? fl.ch[st.flavour][0] : '—'],
        ['Sauce', sa ? sa.ch[st.sauce][0] : '—'],
        ['Veggies', vg && st.veg.length ? st.veg.map(function (i) { return vg.ch[i][0]; }).join(', ') : 'None']
      ];
      rec.innerHTML = lines.map(function (l) { return '<li><span>' + l[0] + '</span><span>' + esc(l[1]) + '</span></li>'; }).join('');
      tot.innerHTML = money(price);
      go.href = it.u;
      go.textContent = 'Order this build';
    }
    elC.addEventListener('click', function (e) {
      var b = e.target.closest('.opt'); if (!b) return;
      st.crust = +b.dataset.i; st.size = 0; st.stuffed = false; st.veg = []; st.flavour = 0; st.sauce = 0;
      renderAll();
      if (hasGsap && !reduce) gsap.fromTo(lp, { rotation: -90, opacity: 0 }, { rotation: 0, opacity: 1, duration: .8, ease: 'expo.out' });
    });
    elS.addEventListener('click', function (e) { var b = e.target.closest('.size'); if (!b) return; st.size = +b.dataset.i; renderAll(); });
    elStuff.addEventListener('change', function () { st.stuffed = elStuff.checked; renderAll(); });
    elF.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; st.flavour = +b.dataset.i; renderAll(); });
    elSa.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; st.sauce = +b.dataset.i; renderAll(); });
    elV.addEventListener('click', function (e) {
      var b = e.target.closest('.opt'); if (!b) return;
      var i = +b.dataset.i, k = st.veg.indexOf(i);
      if (k > -1) st.veg.splice(k, 1); else st.veg.push(i);
      st.veg.sort(function (a, c) { return a - c; });
      renderAll();
      if (k < 0 && hasGsap && !reduce) gsap.fromTo($$('.opt', elV)[i], { scale: .9 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
    });
    renderAll();
  }

  /* ---------- deals ---------- */
  function deals() {
    var groups = [
      { id: 'everyday', label: 'Every day', secs: ['Pizza To Go', 'Value Deals'], note: 'Every day' },
      { id: 'tuesday', label: 'Tuesday Twist', secs: ['Tuesday Twist'], note: 'Tuesdays only', day: 'Tue' },
      { id: 'sunday', label: 'Super Sunday', secs: ['Super Sunday'], note: 'Sundays only', day: 'Sun' },
      { id: 'midnight', label: 'Early Midnight', secs: ['EARLY MIDNIGHT Deals'], note: '11 PM – 6 AM', night: true }
    ];
    var now = pkNow();
    var nightOn = now.h >= 23 || now.h < 6;
    function isOn(g) { return g.night ? nightOn : g.day ? g.day === now.day : true; }
    var tabs = $('[data-deal-tabs]'), board = $('[data-deals-board]'), status = $('[data-deals-status]');
    var list = [{ id: 'now', label: 'On now', live: true }].concat(groups);
    tabs.innerHTML = list.map(function (g, i) {
      return '<button class="dtab" type="button" role="tab" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-id="' + g.id + '">' + (g.live || (g.id !== 'everyday' && isOn(g)) ? '<span class="live" aria-hidden="true"></span>' : '') + esc(g.label) + '</button>';
    }).join('');
    board.setAttribute('role', 'tabpanel');

    // status line
    var dayName = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[now.day];
    var hh = now.h % 12 || 12, ap = now.h < 12 ? 'AM' : 'PM';
    var msg;
    if (nightOn) {
      var left = (now.h < 6 ? 360 - now.mins : 360 + 1440 - now.mins);
      msg = 'Early Midnight deals are live for another ' + Math.floor(left / 60) + ' h ' + (left % 60) + ' min.';
    } else {
      var until = 23 * 60 - now.mins;
      msg = 'Early Midnight deals start in ' + Math.floor(until / 60) + ' h ' + (until % 60) + ' min.';
    }
    status.innerHTML = '<span class="live" aria-hidden="true"></span><span>' + dayName + ', ' + hh + ':' + String(now.m).padStart(2, '0') + ' ' + ap + ' in Pakistan. ' + msg + '</span>';

    function ticket(it, sec, g) {
      return '<button class="ticket" type="button" data-open="' + esc(sec.name) + '|' + esc(it.s) + '">' +
        '<span class="ticket__img"><img src="' + esc(it.img) + '" alt="" loading="lazy"></span>' +
        '<span class="ticket__body"><span class="ticket__tag">' + esc(g.note) + '</span><span class="ticket__name">' + esc(it.n.replace(/\s*–\s*/, ' · ')) + '</span><span class="ticket__desc">' + esc(it.d) + '</span></span>' +
        '<span class="ticket__foot"><span class="big-price">' + money(it.p) + '</span><span class="ticket__go">Details</span></span></button>';
    }
    function show(id, animate) {
      var gs = id === 'now' ? groups.filter(isOn) : groups.filter(function (g) { return g.id === id; });
      var html = '';
      gs.forEach(function (g) { g.secs.forEach(function (sn) { var s = section(sn); s.items.forEach(function (it) { html += ticket(it, s, g); }); }); });
      board.innerHTML = html;
      board.scrollLeft = 0;
      if (animate && hasGsap && !reduce) gsap.from(board.children, { x: 40, opacity: 0, duration: .55, ease: 'expo.out', stagger: .05, clearProps: 'transform' });
    }
    function select(btn, focus) {
      $$('.dtab', tabs).forEach(function (b) { var on = b === btn; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      if (focus) btn.focus();
      show(btn.dataset.id, true);
    }
    tabs.addEventListener('click', function (e) { var b = e.target.closest('.dtab'); if (b) select(b); });
    tabs.addEventListener('keydown', function (e) {
      var bs = $$('.dtab', tabs), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length], true); }
    });
    show('now', false);
    if (hasGsap && !reduce) gsap.from('.ticket', { x: 60, opacity: 0, duration: .8, ease: 'expo.out', stagger: .06, clearProps: 'transform', scrollTrigger: { trigger: board, start: 'top 85%' } });
  }

  /* ---------- full menu ---------- */
  function menu() {
    var cats = $('[data-menu-cats]'), body = $('[data-menu-body]'), search = $('[data-menu-search]');
    var LIMIT = 6;
    function nice(n) { return n.replace('EARLY MIDNIGHT', 'Early Midnight'); }
    function when(s) {
      if (s.hours && !/12:00 AM\s*–\s*11:59 PM/.test(s.hours)) return s.hours.replace(/:00/g, '').replace('–', 'to');
      if (s.days && s.days.length === 1) return { Tue: 'Tuesdays only', Sun: 'Sundays only' }[s.days[0]] || s.days[0];
      return '';
    }
    var start = 0;
    MENU.forEach(function (s, i) { if (s.name === 'Pizza Flavors') start = i; });
    cats.setAttribute('role', 'tablist');
    cats.innerHTML = MENU.map(function (s, i) {
      return '<button class="mcat" type="button" role="tab" id="mc-' + s.id + '" aria-controls="m-' + s.id + '" aria-selected="' + (i === start) + '" tabindex="' + (i === start ? 0 : -1) + '" data-i="' + i + '">' + esc(nice(s.name)) + '<small>' + s.items.length + '</small></button>';
    }).join('');
    body.innerHTML = MENU.map(function (s, i) {
      var long = s.items.length > LIMIT;
      var next = MENU[(i + 1) % MENU.length];
      return '<section class="msec' + (long ? ' is-long' : '') + '" id="m-' + s.id + '" role="tabpanel" aria-labelledby="mc-' + s.id + '" data-i="' + i + '"' + (i === start ? '' : ' hidden') + '>' +
        '<div class="msec__head"><h3 class="msec__title">' + esc(nice(s.name)) + '</h3><span class="msec__when">' + esc(when(s) || s.items.length + (s.items.length > 1 ? ' items' : ' item')) + '</span></div>' +
        '<div class="msec__list">' + s.items.map(function (it, k) {
          return '<button class="mitem' + (k >= LIMIT ? ' is-extra' : '') + '" type="button" data-open="' + esc(s.name) + '|' + esc(it.s) + '" data-q="' + esc((it.n + ' ' + it.d + ' ' + s.name).toLowerCase()) + '">' +
            '<span class="mitem__pic"><img class="mitem__img" src="' + esc(it.img.replace('assets/img/', 'assets/thumb/')) + '" alt="" loading="lazy" decoding="async" width="76" height="76"></span>' +
            '<span class="mitem__txt"><span class="mitem__top"><span class="mitem__name">' + esc(it.n) + '</span><span class="mitem__dots" aria-hidden="true"></span><span class="mitem__price">' + (it.f ? '<small>from </small>' : '') + money(it.p) + '</span></span>' +
            (it.d ? '<span class="mitem__desc">' + esc(it.d) + '</span>' : '') +
            (it.w ? '<span class="mitem__meta">was <s>' + money(it.w) + '</s></span>' : '') + '</span></button>';
        }).join('') + '</div>' +
        '<div class="msec__foot">' + (long ? '<button class="msec__more" type="button" data-more aria-expanded="false">Show all ' + s.items.length + '</button>' : '<span></span>') +
        '<button class="msec__next" type="button" data-next="' + ((i + 1) % MENU.length) + '">Next: ' + esc(nice(next.name)) + ' <span aria-hidden="true">→</span></button></div>' +
        '</section>';
    }).join('') + '<p class="menu__empty" data-menu-empty hidden></p>';

    var cur = start, searching = false;
    function select(i, opts) {
      opts = opts || {};
      cur = i;
      $$('.mcat', cats).forEach(function (b, j) { var on = j === i; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      var btn = $$('.mcat', cats)[i];
      if (btn) {
        if (cats.scrollWidth > cats.clientWidth) cats.scrollTo({ left: btn.offsetLeft - cats.clientWidth / 2 + btn.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
        else if (cats.scrollHeight > cats.clientHeight) cats.scrollTo({ top: btn.offsetTop - cats.clientHeight / 2, behavior: reduce ? 'auto' : 'smooth' });
        if (opts.focus) btn.focus({ preventScroll: true });
      }
      if (searching) return;
      $$('.msec', body).forEach(function (sec, j) { sec.hidden = j !== i; });
      var sec = $$('.msec', body)[i];
      if (opts.scroll) {
        var top = $('.menu__layout').getBoundingClientRect().top;
        if (top < 0) scrollToY(window.scrollY + top - 70);
      }
      if (hasGsap && !reduce && sec) gsap.fromTo($$('.msec__head, .mitem:not([hidden])', sec).slice(0, 10), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'expo.out', stagger: .03, clearProps: 'transform,opacity' });
    }
    cats.addEventListener('click', function (e) { var b = e.target.closest('.mcat'); if (b) { if (search.value) { search.value = ''; runSearch(); } select(+b.dataset.i, { scroll: true }); } });
    cats.addEventListener('keydown', function (e) {
      var n = MENU.length, k = e.key;
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(k) < 0) return;
      e.preventDefault();
      select((cur + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + n) % n, { focus: true });
    });
    body.addEventListener('click', function (e) {
      var more = e.target.closest('[data-more]');
      if (more) {
        var sec = more.closest('.msec'), open = !sec.classList.contains('is-open');
        sec.classList.toggle('is-open', open);
        more.setAttribute('aria-expanded', open);
        more.textContent = open ? 'Show fewer' : 'Show all ' + $$('.mitem', sec).length;
        if (open && hasGsap && !reduce) gsap.from($$('.is-extra', sec), { y: 14, opacity: 0, duration: .45, ease: 'expo.out', stagger: .025, clearProps: 'transform,opacity' });
        if (!open) { var t = sec.getBoundingClientRect().top; if (t < 0) scrollToY(window.scrollY + t - 80); }
        return;
      }
      var nx = e.target.closest('[data-next]');
      if (nx) select(+nx.dataset.next, { scroll: true });
    });

    var t;
    function runSearch() {
      var q = search.value.trim().toLowerCase(), any = false;
      searching = !!q;
      body.classList.toggle('is-searching', searching);
      cats.classList.toggle('is-dim', searching);
      $$('.msec', body).forEach(function (sec, j) {
        var n = 0;
        $$('.mitem', sec).forEach(function (m) { var hit = !q || m.dataset.q.indexOf(q) > -1; m.hidden = !hit; if (hit) n++; });
        sec.hidden = searching ? n === 0 : j !== cur;
        if (searching && n) any = true;
      });
      var empty = $('[data-menu-empty]');
      empty.hidden = !searching || any;
      if (searching && !any) empty.textContent = 'Nothing on the menu matches “' + search.value.trim() + '”. Try “wings”, “fries” or “Nutella”.';
    }
    search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(runSearch, 90); });
  }

  /* ---------- product sheet ---------- */
  function sheet() {
    var dlg = $('[data-sheet]'), body = $('[data-sheet-body]'), img = $('[data-sheet-img]');
    var lastFocus = null;
    function find(secName, slug) {
      var s = section(secName); for (var i = 0; i < s.items.length; i++) if (s.items[i].s === slug) return { it: s.items[i], sec: s };
      return null;
    }
    function groupHtml(g, it) {
      if (/topping/i.test(g.g)) {
        var ps = g.ch.map(function (c) { return c[1]; }).filter(Boolean);
        if (!ps.length) return '';
        var lo = Math.min.apply(null, ps), hi = Math.max.apply(null, ps);
        return '<div class="sh__group"><h4>Extra toppings <small>optional</small></h4><p>Meat or cheese, ' + (lo === hi ? money(lo) : money(lo) + ' – ' + money(hi)) + ' depending on size.</p></div>';
      }
      var priced = g.ch.some(function (c) { return c[1]; });
      var absolute = it.f && /size/i.test(g.g);
      var head = '<h4>' + esc(g.g.replace(/^Select Your /i, '')) + ' <small>' + (g.req ? 'required' : 'optional') + (g.many ? ' · pick any' : '') + '</small></h4>';
      if (!priced) {
        var names = []; g.ch.forEach(function (c) { if (names.indexOf(c[0]) < 0) names.push(c[0]); });
        if (names.length === 1 && /^yes|12incher/i.test(names[0])) return '<div class="sh__group">' + head.replace(/Make It Half N Half/, 'Half &amp; half') + '<p>Available on larger sizes.</p></div>';
        return '<div class="sh__group">' + head + '<ul class="sh__chips">' + names.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
      }
      var byOnly = {}, order = [];
      g.ch.forEach(function (c) { var k = c[2] || ''; if (!byOnly[k]) { byOnly[k] = []; order.push(k); } byOnly[k].push(c); });
      return '<div class="sh__group">' + head + order.map(function (k) {
        return (k && order.length > 1 ? '<p class="sh__sub">' + esc(k) + '</p>' : '') + '<ul class="sh__rows">' + byOnly[k].map(function (c) {
          var label = absolute ? sizeLabel(c[0]).replace(/ (hand-tossed|pan|thinza|footlong)$/i, '') + (/^stuffed/i.test(c[0]) ? ' stuffed' : '') : c[0];
          if (absolute) label = label.replace(/^Stuffed Crust\s*/i, '');
          return '<li><span>' + esc(label) + '</span><span class="price">' + (c[1] ? (absolute ? '' : '+ ') + money(c[1] || it.p) : 'included') + '</span></li>';
        }).join('') + '</ul>';
      }).join('') + '</div>';
    }
    function open(key) {
      var p = key.split('|'), f = find(p[0], p[1]); if (!f) return;
      var it = f.it;
      lastFocus = document.activeElement;
      img.src = it.img; img.alt = it.n; img.decoding = 'async';
      body.innerHTML = '<p class="sh__sec">' + esc(f.sec.name.replace('EARLY MIDNIGHT', 'Early Midnight')) + '</p><h3 class="sh__name" id="sheet-title">' + esc(it.n) + '</h3>' +
        (it.d ? '<p class="sh__desc">' + esc(it.d) + '</p>' : '') +
        '<p class="sh__price"><span class="big-price">' + (it.f ? '<small>from </small>' : '') + money(it.p) + '</span>' + (it.w ? '<span class="was">' + money(it.w) + '</span><span class="off">15% off</span>' : '') + '</p>' +
        it.o.map(function (g) { return groupHtml(g, it); }).join('') +
        '<div class="sh__cta"><a class="btn btn--red btn--block btn--lg" href="' + esc(it.u) + '" target="_blank" rel="noopener">Order on 14thstreetpizza.com</a><p>Opens the official ordering page for this item' + (it.c ? ' · ordered ' + num(it.c) + ' times' : '') + '.</p></div>';
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      if (lenis) lenis.stop();
      document.body.style.overflow = 'hidden';
      body.scrollTop = 0; $('.sheet__inner').scrollTop = 0;
    }
    function close() {
      if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
    }
    dlg.addEventListener('close', function () { if (lenis) lenis.start(); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    $('[data-sheet-close]').addEventListener('click', close);
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-open]');
      if (t) { e.preventDefault(); open(t.dataset.open); }
    });
  }

  /* ---------- branches + delivery checker ---------- */
  function branches() {
    var cityPhone = { Karachi: '021 111 363 636', Multan: '061 111 363 636', Bahawalpur: '062 111 363 636' };
    var cityOrder = ['Karachi', 'Islamabad', 'Multan', 'Faisalabad', 'Bahawalpur', 'Khanewal', 'Sahiwal'];
    var stats = {};
    ZONES.forEach(function (z) {
      var s = stats[z[2]] || (stats[z[2]] = { fee: [], min: [], eta: [] });
      s.fee.push(z[3]); s.min.push(z[4]); if (z[5]) s.eta.push(z[5]);
    });
    function range(a, fmt) {
      if (!a || !a.length) return '—';
      var lo = Math.min.apply(null, a), hi = Math.max.apply(null, a);
      return lo === hi ? fmt(lo) : fmt(lo) + ' – ' + fmt(hi);
    }
    function clean(n) { return n.replace(/\s*[-–]\s*(Karachi|Islamabad|Multan|Faisalabad)\s*$/i, '').replace(/^[-–\s]+/, '').trim(); }
    var byCity = {};
    BRANCHES.forEach(function (b) { (byCity[b.city] = byCity[b.city] || []).push(b); });
    var cities = cityOrder.filter(function (c) { return byCity[c]; });
    var elCities = $('[data-cities]'), elList = $('[data-branch-list]'), map = $('[data-map]');
    elCities.innerHTML = cities.map(function (c, i) {
      return '<button class="city" type="button" role="tab" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-city="' + c + '">' + c + '<small>' + byCity[c].length + '</small></button>';
    }).join('');
    function feeFmt(v) { return v ? 'Rs. ' + num(v) : 'Free'; }
    function minFmt(v) { return v ? 'Rs. ' + num(v) : 'none'; }
    function hoursOf(b) {
      if (!b.timings || !b.timings.length) return '';
      var t = b.timings[0];
      return t.open + ' – ' + (t.dinner_close || t.close);
    }
    var showCity = function (c, flashId) {
      $$('.city', elCities).forEach(function (b) { var on = b.dataset.city === c; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      $$('.map__city', map).forEach(function (g) { g.classList.toggle('is-on', g.dataset.city === c); });
      $$('.map__br', map).forEach(function (g) { g.classList.toggle('is-flash', +g.dataset.bid === flashId); });
      elList.innerHTML = byCity[c].map(function (b) {
        var s = stats[b.name] || {};
        var phone = b.phone || cityPhone[c];
        var hrs = hoursOf(b);
        return '<li class="branch glass glass--dark' + (flashId === b.id ? ' is-flash' : '') + '" data-bid="' + b.id + '">' +
          '<div class="branch__top"><div><p class="branch__name">' + esc(clean(b.name)) + '</p><p class="branch__addr">' + esc(b.street || b.address || '') + ', ' + esc(c) + '</p></div></div>' +
          '<ul class="branch__facts"><li>Delivery <b>' + range(s.fee, feeFmt) + '</b></li><li>Min. order <b>' + range(s.min, minFmt) + '</b></li><li>Up to <b>' + range(s.eta, function (v) { return v; }) + ' min</b></li><li><b>' + (b.zones || (s.fee || []).length) + '</b> areas</li>' + (hrs ? '<li>Open <b>' + esc(hrs) + '</b></li>' : '') + '</ul>' +
          '<div class="branch__links"><a href="' + esc(b.map) + '" target="_blank" rel="noopener">Directions</a>' + (phone ? '<a href="tel:' + phone.replace(/\s/g, '') + '">' + (b.phone ? 'Call ' : 'Call centre ') + esc(phone) + '</a>' : '') + '<a href="https://www.14thstreetpizza.com/" target="_blank" rel="noopener">Order online</a></div></li>';
      }).join('');
      elList.scrollLeft = 0;
      if (hasGsap && !reduce) gsap.from(elList.children, { x: 24, opacity: 0, duration: .5, ease: 'expo.out', stagger: .05 });
      if (flashId) { var el = $('[data-bid="' + flashId + '"]', elList); if (el) { var railed = elList.scrollWidth > elList.clientWidth + 4; if (railed) elList.scrollTo({ left: el.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' }); else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); } }
    };
    elCities.addEventListener('click', function (e) { var b = e.target.closest('.city'); if (b) showCity(b.dataset.city); });
    elCities.addEventListener('keydown', function (e) {
      var bs = $$('.city', elCities), i = bs.indexOf(document.activeElement);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var n = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length]; n.focus(); showCity(n.dataset.city); }
    });

    // map: real lat/lng; zooms from the whole country into a city's delivery-area constellation
    var W = 400, H = 460, minLng = 66.4, maxLng = 74.2, minLat = 24.2, maxLat = 34.4;
    function px(lng) { return 30 + (lng - minLng) / (maxLng - minLng) * (W - 60); }
    function py(lat) { return 20 + (maxLat - lat) / (maxLat - minLat) * (H - 40); }
    var pts = cities.map(function (c) {
      var bs = byCity[c], lat = 0, lng = 0; bs.forEach(function (b) { lat += b.lat; lng += b.lng; });
      return { c: c, x: px(lng / bs.length), y: py(lat / bs.length), n: bs.length };
    });
    var route = ['Karachi', 'Bahawalpur', 'Multan', 'Khanewal', 'Sahiwal', 'Faisalabad', 'Islamabad'].map(function (c) { return pts.filter(function (p) { return p.c === c; })[0]; }).filter(Boolean);
    var grid = '';
    for (var g = -10; g <= 18; g++) { grid += '<line x1="' + (g * 50) + '" y1="-500" x2="' + (g * 50) + '" y2="' + (H + 500) + '"></line>'; }
    for (g = -10; g <= 19; g++) { grid += '<line x1="-500" y1="' + (g * 50 + 5) + '" x2="' + (W + 500) + '" y2="' + (g * 50 + 5) + '"></line>'; }
    var lab = { Karachi: [14, 5, 'start'], Bahawalpur: [-14, 5, 'end'], Multan: [-14, 5, 'end'], Khanewal: [6, 24, 'start'], Sahiwal: [14, -2, 'start'], Faisalabad: [-14, 5, 'end'], Islamabad: [14, 5, 'start'] };
    var zoneCity = {}; BRANCHES.forEach(function (b) { zoneCity[b.name] = b.city; });
    var zlist = ZONES.filter(function (z) { return z[6] && z[7]; });
    var zd = zlist.map(function (z) { return '<path class="map__zone" data-city="' + esc(z[0]) + '" vector-effect="non-scaling-stroke" d="M' + px(z[7]).toFixed(3) + ' ' + py(z[6]).toFixed(3) + 'h0"></path>'; }).join('');
    var cen = {}; cities.forEach(function (c) { var x = 0; byCity[c].forEach(function (b) { x += b.lng; }); cen[c] = x / byCity[c].length; });
    var brs = BRANCHES.map(function (b) {
      var left = b.lng < cen[b.city] - 1e-6;
      return '<g class="map__br" data-city="' + esc(b.city) + '" data-bid="' + b.id + '" data-x="' + px(b.lng).toFixed(3) + '" data-y="' + py(b.lat).toFixed(3) + '">' +
        '<circle r="6"></circle><circle class="pin" r="2.4"></circle><text x="' + (left ? -10 : 10) + '" y="4" text-anchor="' + (left ? 'end' : 'start') + '">' + esc(clean(b.name).replace(/ Branch$/, '').replace(/\s*\(.*?\)\s*/g, '')) + '</text></g>';
    }).join('');
    map.innerHTML = '<g class="map__grid">' + grid + '</g><g class="map__zones">' + zd + '</g>' +
      '<path class="map__route" vector-effect="non-scaling-stroke" d="M' + route.map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' L') + '"></path>' +
      pts.map(function (p) {
        var L = lab[p.c] || [14, 5, 'start'];
        return '<g class="map__city" data-city="' + p.c + '" data-x="' + p.x.toFixed(2) + '" data-y="' + p.y.toFixed(2) + '" tabindex="-1">' +
          '<circle class="halo" r="' + (14 + p.n * 3) + '"></circle><circle class="core" r="' + (4 + p.n * 1.2) + '"></circle>' +
          '<text x="' + L[0] + '" y="' + L[1] + '" text-anchor="' + L[2] + '">' + p.c + ' <tspan class="cnt">' + p.n + '</tspan></text></g>';
      }).join('') + '<g class="map__brs">' + brs + '</g>';
    var zoneEls = $$('.map__zone', map), cityEls = $$('.map__city', map), brEls = $$('.map__br', map);
    var cap = $('[data-map-cap]'), back = $('[data-map-back]');
    var vb = { x: 0, y: 0, w: W, h: H }, zoomed = null, zoomTween = null;
    function apply() {
      map.setAttribute('viewBox', vb.x.toFixed(3) + ' ' + vb.y.toFixed(3) + ' ' + vb.w.toFixed(3) + ' ' + vb.h.toFixed(3));
      var k = vb.w / W;
      map.style.setProperty('--zone', (2.6 + 3.6 * (1 - k)).toFixed(2) + 'px');
      cityEls.forEach(function (c) { c.setAttribute('transform', 'translate(' + c.dataset.x + ' ' + c.dataset.y + ') scale(' + k.toFixed(4) + ')'); });
      brEls.forEach(function (b) { b.setAttribute('transform', 'translate(' + b.dataset.x + ' ' + b.dataset.y + ') scale(' + k.toFixed(4) + ')'); });
    }
    function target(c) {
      if (!c) return { x: 0, y: 0, w: W, h: H };
      var xs = [], ys = [];
      zlist.forEach(function (z) { if (z[0] === c) { xs.push(px(z[7])); ys.push(py(z[6])); } });
      byCity[c].forEach(function (b) { xs.push(px(b.lng)); ys.push(py(b.lat)); });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var w = Math.max(x1 - x0, 4) * 2.1, h = Math.max(y1 - y0, 4) * 1.4;
      if (w / h > W / H) h = w * H / W; else w = h * W / H;
      return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w: w, h: h };
    }
    function zoomTo(c, animate) {
      zoomed = c;
      map.classList.toggle('is-zoomed', !!c);
      zoneEls.forEach(function (z) { z.classList.toggle('is-on', !!c && z.dataset.city === c); });
      brEls.forEach(function (b) { b.classList.toggle('is-on', !!c && b.dataset.city === c); });
      if (cap) cap.innerHTML = c ? '<b>' + esc(c) + '</b> · ' + byCity[c].length + (byCity[c].length > 1 ? ' branches' : ' branch') + ' · ' + zlist.filter(function (z) { return z[0] === c; }).length + ' delivery areas' : '<b>Pakistan</b> · 16 branches · 1,099 delivery areas';
      if (back) back.hidden = !c;
      var t = target(c);
      if (zoomTween) zoomTween.kill();
      if (animate && hasGsap && !reduce) zoomTween = gsap.to(vb, { x: t.x, y: t.y, w: t.w, h: t.h, duration: 1.4, ease: 'expo.inOut', onUpdate: apply });
      else { vb.x = t.x; vb.y = t.y; vb.w = t.w; vb.h = t.h; apply(); }
    }
    apply();
    map.addEventListener('click', function (e) {
      var g = e.target.closest('.map__city'); if (g) { showCity(g.dataset.city); return; }
      var b = e.target.closest('.map__br'); if (b) { var bid = +b.dataset.bid; var br = BRANCHES.filter(function (x) { return x.id === bid; })[0]; if (br) showCity(br.city, bid); }
    });
    if (back) back.addEventListener('click', function () { zoomTo(null, true); });
    var mapReady = false;
    var _show = showCity;
    showCity = function (c, flashId) { _show(c, flashId); if (mapReady) zoomTo(c, true); };
    _show(cities[0]);
    zoomTo(null, false);
    if (hasGsap && !reduce) {
      var path = $('.map__route', map), len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set(cityEls, { opacity: 0 });
      ScrollTrigger.create({ trigger: map, start: 'top 70%', once: true, onEnter: function () {
        gsap.to(path, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', onComplete: function () { path.style.strokeDasharray = '3 5'; } });
        gsap.to(cityEls, { opacity: 1, duration: .5, stagger: .1 });
        gsap.delayedCall(1.9, function () { mapReady = true; var sel = $('.city[aria-selected="true"]', elCities); zoomTo(sel ? sel.dataset.city : cities[0], true); });
      } });
    } else { mapReady = true; zoomTo(cities[0], false); }

    // delivery checker
    var input = $('[data-area-input]'), lst = $('[data-area-list]'), out = $('[data-area-result]');
    var idx = ZONES.map(function (z, i) { return { i: i, k: (z[1] + ' ' + z[0]).toLowerCase().replace(/\s+/g, ' ') }; });
    var results = [], active = -1;
    function close() { lst.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
    function draw() {
      lst.innerHTML = results.map(function (r, j) {
        var z = ZONES[r];
        return '<li role="option" id="ar-' + j + '" aria-selected="' + (j === active) + '" data-z="' + r + '"><span>' + esc(z[1]) + '</span><small>' + esc(z[0]) + '</small></li>';
      }).join('');
      if (active > -1) input.setAttribute('aria-activedescendant', 'ar-' + active);
    }
    function choose(zi) {
      var z = ZONES[zi], b = BRANCHES.filter(function (x) { return x.name === z[2]; })[0];
      input.value = z[1] + ', ' + z[0];
      close();
      out.innerHTML = '<div class="verdict glass glass--dark"><p class="verdict__yes">Yes, we deliver here.</p>' +
        '<dl><div><dt>Fee</dt><dd>' + feeFmt(z[3]) + '</dd></div><div><dt>Min. order</dt><dd>' + (z[4] ? 'Rs. ' + num(z[4]) : 'None') + '</dd></div><div><dt>Delivery</dt><dd>up to ' + z[5] + ' min</dd></div></dl>' +
        '<p>From <strong>' + esc(clean(z[2])) + '</strong>. <a href="https://www.14thstreetpizza.com/" target="_blank" rel="noopener" style="color:var(--c-yellow);font-weight:700">Order now</a></p></div>';
      if (b) showCity(b.city, b.id);
      if (hasGsap && !reduce) gsap.from(out.firstChild, { y: 14, opacity: 0, duration: .5, ease: 'expo.out' });
    }
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
      out.innerHTML = '';
      if (q.length < 2) { close(); return; }
      var starts = [], has = [];
      idx.forEach(function (x) { var p = x.k.indexOf(q); if (p === 0) starts.push(x.i); else if (p > 0) has.push(x.i); });
      results = starts.concat(has).slice(0, 8);
      active = -1;
      if (!results.length) {
        close();
        out.innerHTML = '<div class="verdict verdict--no"><p class="verdict__yes" style="color:var(--c-on-dark)">No match for “' + esc(input.value.trim()) + '”.</p><p>Try a nearby block or society name, or call the Karachi call centre on 021 111 363 636.</p></div>';
        return;
      }
      draw(); lst.hidden = false; input.setAttribute('aria-expanded', 'true');
    });
    input.addEventListener('keydown', function (e) {
      if (lst.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(results.length - 1, active + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(results[Math.max(0, active)]); }
      else if (e.key === 'Escape') { close(); }
    });
    lst.addEventListener('mousedown', function (e) { var li = e.target.closest('li'); if (li) { e.preventDefault(); choose(+li.dataset.z); } });
    input.addEventListener('blur', function () { setTimeout(close, 120); });
    input.addEventListener('focus', function () {
      if (window.matchMedia('(max-width: 960px)').matches) setTimeout(function () { scrollToY(input.getBoundingClientRect().top + window.scrollY - 90); }, 250);
    });
  }

  /* ---------- generic reveals ---------- */
  function reveals() {
    if (!hasGsap || reduce) return;
    $$('[data-split]').forEach(function (h) {
      var parts = h.innerHTML.split(/<br\s*\/?>/i);
      h.innerHTML = parts.map(function (p) { return '<span class="line"><span>' + p.trim() + '</span></span>'; }).join('');
      gsap.from($$('.line > span', h), { yPercent: 110, duration: 1, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: h, start: 'top 85%' } });
    });
    $$('[data-reveal]').forEach(function (el) {
      gsap.to(el, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    gsap.from('.checker-strip', { backgroundPositionX: -200, ease: 'none', scrollTrigger: { trigger: '.checker-strip', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.app__box', { rotation: -30, y: 80, scale: .8, ease: 'none', scrollTrigger: { trigger: '.app', start: 'top bottom', end: 'center center', scrub: true } });
    gsap.from('.app__chip', { y: 30, opacity: 0, duration: .8, ease: 'back.out(1.8)', stagger: .12, scrollTrigger: { trigger: '.app__art', start: 'top 65%' } });
    gsap.to('.app__chip--price', { y: -14, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.from('.app__tag', { scale: 0, rotation: -30, duration: .8, ease: 'back.out(2.5)', scrollTrigger: { trigger: '.app__art', start: 'top 60%' } });
    gsap.from('.foot__word', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.foot__word', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  /* ---------- boot ---------- */
  /* ---------- 3D tilt with glare (mouse only) ---------- */
  function tilt() {
    if (!finePointer || reduce || !hasGsap) return;
    var sel = '.ticket, .crusts .opt, .branch, .xd__size, .store, .flavours__info';
    var cur = null;
    function reset(el) { gsap.to(el, { rotationX: 0, rotationY: 0, z: 0, duration: .6, ease: 'power3.out' }); }
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest ? e.target.closest(sel) : null;
      if (cur && cur !== el) { reset(cur); cur = null; }
      if (!el) return;
      if (!el.classList.contains('tilt')) {
        el.classList.add('tilt');
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        var g = document.createElement('span'); g.className = 'tilt__glare'; g.setAttribute('aria-hidden', 'true'); el.appendChild(g);
      }
      cur = el;
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      var amt = el.classList.contains('flavours__info') ? 4 : 9;
      gsap.to(el, { rotationY: (x - .5) * amt, rotationX: (.5 - y) * amt, z: 10, transformPerspective: 900, duration: .45, ease: 'power2.out', overwrite: 'auto' });
      el.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { if (cur) { reset(cur); cur = null; } });
  }

  /* ---------- chat: answers only from the real menu, deals, branches and delivery areas ---------- */
  function chat() {
    var fab = $('[data-chat-open]'), box = $('#chat'), log = $('[data-chat-log]'), form = $('[data-chat-form]'), input = $('[data-chat-input]'), chipsEl = $('[data-chat-chips]');
    if (!fab || !box) return;
    var items = allItems();
    var STOP = { the: 1, a: 1, an: 1, of: 1, and: 1, or: 1, to: 1, in: 1, on: 1, for: 1, is: 1, me: 1, my: 1, you: 1, do: 1, does: 1, what: 1, whats: 1, how: 1, much: 1, price: 1, prices: 1, cost: 1, rs: 1, pizza: 1, pizzas: 1, please: 1, plz: 1, can: 1, i: 1, get: 1, want: 1, have: 1, any: 1, there: 1, your: 1, with: 1, at: 1, near: 1, deliver: 1, delivery: 1, area: 1, e: 1, block: 1, sector: 1, phase: 1, no: 1, ka: 1, ki: 1, ke: 1, hai: 1, kya: 1, bhai: 1, bro: 1 };
    function norm(t) { return String(t).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
    function toks(t) { return norm(t).split(' ').filter(Boolean); }
    function has(q, words) { return words.some(function (w) { return new RegExp('\\b' + w).test(q); }); }
    var CITIES = ['karachi', 'islamabad', 'multan', 'faisalabad', 'bahawalpur', 'khanewal', 'sahiwal'];
    var cityPhone = { Karachi: '021 111 363 636', Multan: '061 111 363 636', Bahawalpur: '062 111 363 636' };
    function cap(c) { return c.charAt(0).toUpperCase() + c.slice(1); }
    function cleanB(n) { return n.replace(/\s*[-–]\s*(Karachi|Islamabad|Multan|Faisalabad)\s*$/i, '').replace(/^[-–\s]+/, '').trim(); }
    var zoneIdx = ZONES.map(function (z, i) {
      var t = toks(z[1]); return { i: i, all: t, key: t.filter(function (w) { return !STOP[w]; }), nums: t.filter(function (w) { return /\d/.test(w); }) };
    });
    function findZones(q) {
      var Q = {}; toks(q).forEach(function (w) { Q[w] = 1; });
      var best = [], bestScore = 0;
      zoneIdx.forEach(function (z) {
        if (!z.key.length) return;
        if (!z.nums.every(function (n) { return Q[n]; })) return;
        var hit = z.key.filter(function (w) { return Q[w]; }).length;
        if (!hit || !z.key.some(function (w) { return Q[w] && !/^\d+$/.test(w); })) return;
        var sc = hit / z.key.length + (z.nums.length ? .2 : 0);
        if (sc > bestScore + 1e-9) { bestScore = sc; best = [z.i]; } else if (Math.abs(sc - bestScore) < 1e-9) best.push(z.i);
      });
      return bestScore >= .6 ? best : [];
    }
    var itemIdx = items.map(function (x) { return { x: x, key: toks(x.it.n).filter(function (w) { return !STOP[w] && w.length > 1; }) }; });
    function findItems(q) {
      var Q = toks(q).filter(function (w) { return !STOP[w] && w.length > 2; });
      if (!Q.length) return [];
      var scored = itemIdx.map(function (o) {
        var hit = o.key.filter(function (w) { return Q.some(function (qw) { return w === qw || (qw.length > 3 && w.indexOf(qw) === 0) || (w.length > 3 && qw.indexOf(w) === 0); }); }).length;
        return { o: o, sc: o.key.length ? hit / o.key.length : 0, hit: hit };
      }).filter(function (r) { return r.hit; });
      if (!scored.length) return [];
      var top = Math.max.apply(null, scored.map(function (r) { return r.sc; }));
      return scored.filter(function (r) { return r.sc >= Math.max(.5, top - 1e-9) || r.hit >= 1 && top < .5 && r.sc === top; }).map(function (r) { return r.o.x; });
    }
    function itemCard(x) {
      var it = x.it, sizes = '';
      var g = group(it, /size/i);
      if (g) {
        var rows = g.ch.filter(function (c) { return !/stuffed/i.test(c[0]) && (/hand-tossed|xtreme|^\d+ inch \((slice|medium|large|x-large|full|small)\)$/i.test(c[0]) || !c[2]); }).slice(0, 6);
        if (rows.length > 1) sizes = '<ul>' + rows.map(function (c) { return '<li><span>' + esc(sizeLabel(c[0]).replace(/ (hand-tossed|xtreme|pan|thinza)$/i, '')) + '</span><span>' + money(c[1] || it.p) + '</span></li>'; }).join('') + '</ul>';
      }
      return '<b>' + esc(it.n) + '</b> · ' + (it.f ? 'from ' : '') + money(it.p) + (it.w ? ' <s>' + money(it.w) + '</s>' : '') +
        (it.d ? '<br>' + esc(it.d.length > 140 ? it.d.slice(0, 137) + '…' : it.d) : '') + sizes +
        '<br><button class="msg__btn" type="button" data-open="' + esc(x.sec.name) + '|' + esc(it.s) + '">See all options</button> <a class="msg__btn" href="' + esc(it.u) + '" target="_blank" rel="noopener">Order</a>';
    }
    function list(xs) { return '<ul>' + xs.map(function (x) { return '<li><span>' + esc(x.it.n) + '</span><span>' + (x.it.f ? 'from ' : '') + money(x.it.p) + '</span></li>'; }).join('') + '</ul>'; }
    function secItems(name) { return items.filter(function (x) { return x.sec.name === name; }); }
    function dealsNow() {
      var now = pkNow(), night = now.h >= 23 || now.h < 6, out = secItems('Pizza To Go').concat(secItems('Value Deals'));
      var extra = [];
      if (now.day === 'Tue') extra = extra.concat(secItems('Tuesday Twist'));
      if (now.day === 'Sun') extra = extra.concat(secItems('Super Sunday'));
      if (night) extra = extra.concat(secItems('EARLY MIDNIGHT Deals'));
      var head = night ? 'Early Midnight deals are live right now (11 PM – 6 AM).' : 'Early Midnight deals start at 11 PM.';
      return '<b>On right now</b> (Pakistan time):' + list(extra.concat(out)) + '<br>' + head + ' Tuesday Twist runs on Tuesdays, Super Sunday on Sundays.<br><a class="msg__btn" href="#deals">See the deals board</a>';
    }
    function zoneAnswer(zs) {
      var z = ZONES[zs[0]];
      if (zs.length > 1) {
        var uniq = []; zs.forEach(function (k) { var a = ZONES[k][1] + ', ' + ZONES[k][0]; if (uniq.indexOf(a) < 0) uniq.push(a); });
        if (uniq.length > 1) return 'I found a few matches. Which one is yours?<ul>' + uniq.slice(0, 5).map(function (a) { return '<li><span>' + esc(a) + '</span><span></span></li>'; }).join('') + '</ul>Type the full name and I’ll check it.';
      }
      return '<b>Yes, we deliver to ' + esc(z[1]) + ', ' + esc(z[0]) + '.</b><ul><li><span>From</span><span>' + esc(cleanB(z[2])) + '</span></li><li><span>Delivery fee</span><span>' + (z[3] ? 'Rs. ' + num(z[3]) : 'Free') + '</span></li><li><span>Minimum order</span><span>' + (z[4] ? 'Rs. ' + num(z[4]) : 'None') + '</span></li><li><span>Delivery time</span><span>up to ' + z[5] + ' min</span></li></ul><a class="msg__btn" href="https://www.14thstreetpizza.com/" target="_blank" rel="noopener">Order now</a>';
    }
    function cityAnswer(c) {
      var C = cap(c), bs = BRANCHES.filter(function (b) { return b.city === C; });
      return '<b>' + bs.length + (bs.length > 1 ? ' branches' : ' branch') + ' in ' + C + ':</b><ul>' + bs.map(function (b) { return '<li><span>' + esc(cleanB(b.name)) + '<br><small>' + esc(b.street || '') + '</small></span><span><a href="' + esc(b.map) + '" target="_blank" rel="noopener">Map</a></span></li>'; }).join('') + '</ul>' + (cityPhone[C] ? 'Call ' + cityPhone[C] + '.' : 'Order online for delivery.');
    }
    function answer(raw) {
      var q = norm(raw);
      var city = CITIES.filter(function (c) { return q.indexOf(c) > -1; })[0];
      if (!q) return '';
      if (/^(hi|hello|hey|salam|assalam|aoa|asalam|slm)\b/.test(q)) return 'Hi! Ask me about the menu, prices, deals, or whether we deliver to your area.';
      if (has(q, ['thank', 'shukriya', 'thx'])) return 'Anytime. Enjoy your pizza!';
      if (has(q, ['franchis'])) return 'You can apply for a 14th Street franchise through the official form.<br><a class="msg__btn" href="https://www.14thstreetpizza.com/franchise" target="_blank" rel="noopener">Franchise form</a>';
      if (has(q, ['pay', 'card', 'cash', 'cod', 'meezan', 'online payment'])) return 'You can pay <b>cash on delivery</b>, or <b>by card online</b> through Meezan Bank.';
      if (has(q, ['app', 'android', 'iphone', 'ios', 'play store', 'playstore', 'apple'])) return 'The 14th Street app is on both stores.<br><a class="msg__btn" href="https://play.google.com/store/apps/details?id=com.fourteenstreetpizzaco.fourteenstreetpizzaco" target="_blank" rel="noopener">Google Play</a> <a class="msg__btn" href="https://apps.apple.com/us/app/14th-street-pizza-co/id1319278882" target="_blank" rel="noopener">App Store</a>';
      if (has(q, ['phone', 'call', 'number', 'contact', 'email', 'whatsapp', 'helpline', 'complain', 'feedback'])) return '<ul><li><span>Karachi</span><span>021 111 363 636</span></li><li><span>Multan</span><span>061 111 363 636</span></li><li><span>Bahawalpur</span><span>062 111 363 636</span></li></ul>Email callcentre@14thstreetpizza.com or info@14thstreetpizza.com. A WhatsApp number isn’t listed on the official site.<br><a class="msg__btn" href="https://www.14thstreetpizza.com/feedback" target="_blank" rel="noopener">Feedback form</a>';
      if (has(q, ['hour', 'open', 'timing', 'close', 'closing', 'kab tak'])) return 'Hours differ by branch. Karachi (North Nazimabad) is open <b>12 PM – 3 AM</b> daily, Multan Cantt <b>12 PM – 1:45 AM</b>. Early Midnight deals run <b>11 PM – 6 AM</b>.';
      var zs = findZones(raw);
      if (has(q, ['deliver', 'delivery', 'area', 'reach']) || (zs.length && !findItems(raw).length)) {
        if (zs.length) return zoneAnswer(zs);
        if (city) return 'Tell me your area in ' + cap(city) + ' (for example a block or society name) and I’ll check the fee, minimum order and time.';
        return 'Type your area name, for example “DHA Phase 6”, “F-10” or “Gulgasht Colony”, and I’ll check if we deliver there.';
      }
      if (has(q, ['midnight', 'late night', 'night'])) return '<b>Early Midnight deals</b>, 11 PM – 6 AM:' + list(secItems('EARLY MIDNIGHT Deals'));
      if (has(q, ['tuesday'])) return '<b>Tuesday Twist</b> (Tuesdays only):' + list(secItems('Tuesday Twist'));
      if (has(q, ['sunday'])) return '<b>Super Sunday</b> (Sundays only):' + list(secItems('Super Sunday'));
      if (has(q, ['deal', 'offer', 'discount', 'sale', 'promo', 'combo', 'sasta', 'cheap'])) return dealsNow();
      var other = ['lahore', 'rawalpindi', 'pindi', 'peshawar', 'quetta', 'hyderabad', 'sialkot', 'gujranwala', 'sukkur', 'abbottabad'].filter(function (c) { return q.indexOf(c) > -1; })[0];
      if (other && !city) return 'There’s no 14th Street branch listed in ' + cap(other) + ' yet. Branches are in Karachi, Islamabad, Multan, Faisalabad, Bahawalpur, Khanewal and Sahiwal. To bring one there, see the <a href="https://www.14thstreetpizza.com/franchise" target="_blank" rel="noopener">franchise form</a>.';
      if (city || has(q, ['branch', 'location', 'address', 'outlet', 'where', 'near'])) {
        if (city) return cityAnswer(city);
        return 'We have <b>16 branches in 7 cities</b>: Karachi (5), Islamabad (3), Multan (3), Faisalabad (2), Bahawalpur, Khanewal and Sahiwal. Which city are you in?';
      }
      if (has(q, ['veg', 'vegetarian'])) { var vg = items.filter(function (x) { return x.it.n === 'Vegetarian'; })[0]; return (vg ? itemCard(vg) + '<br><br>' : '') + 'You can also build your own on any crust and pick <b>Vegetarian</b> as the flavour.'; }
      if (has(q, ['spicy', 'hot', 'fiery', 'teekha', 'tikha'])) return 'For heat, try these:' + list(items.filter(function (x) { return /spicy|fiery|peri|hot|flaming|jalapeno|buffalo/i.test(x.it.n + ' ' + x.it.d) && x.sec.name !== 'Dips'; }).slice(0, 8));
      if (has(q, ['size', 'inch', 'biggest', 'largest', 'small', 'large'])) return 'Hand-tossed comes as a 20″ slice, 9″, 12″, 15″ and a full 20″. Pan comes in 6″, 9″ and 12″, Thinza in 9″ and 12″, and Xtreme in 6″, 9″ and 12″.<br><a class="msg__btn" href="#build">See them to scale</a>';
      if (has(q, ['xtreme', 'extreme', 'double decker', 'doubledecker'])) {
        var xi = findItems(raw).filter(function (x) { return x.sec.name === 'Xtreme Pizza'; });
        if (xi.length === 1) return itemCard(xi[0]);
        return '<b>Xtreme</b> is the double-decker pizza:' + list(secItems('Xtreme Pizza')) + 'Each comes in 6″, 9″ and 12″.';
      }
      var sec = MENU.filter(function (m) { return q.indexOf(norm(m.name).replace(/ deals?$/, '')) > -1 && norm(m.name).length > 3; })[0];
      var found = findItems(raw);
      if (found.length === 1) return itemCard(found[0]);
      if (found.length > 1 && found.length <= 9) return 'Here’s what matches:' + list(found) + '<br>Ask about one of them for sizes and the order link.';
      if (sec) return '<b>' + esc(sec.name.replace('EARLY MIDNIGHT', 'Early Midnight')) + '</b>:' + list(secItems(sec.name).slice(0, 12));
      if (has(q, ['menu', 'food', 'eat', 'khana'])) return 'The menu has deals, 11 signature flavours, Xtreme, build-your-own, wraps, pasta, a snack box, sides, salad, desserts, dips and drinks.<br><a class="msg__btn" href="#menu">Open the full menu</a>';
      return 'I can answer questions about prices, deals, delivery areas, branches, hours and payment. Try one of the buttons below, or call the Karachi call centre on 021 111 363 636.';
    }
    var CHIPS = ['Deals on now', 'Xtreme prices', 'Do you deliver to me?', 'Midnight deals', 'Branches in Karachi', 'Payment options'];
    chipsEl.innerHTML = CHIPS.map(function (c) { return '<button type="button">' + c + '</button>'; }).join('');
    function add(html, who) {
      var m = document.createElement('div'); m.className = 'msg msg--' + who; m.innerHTML = html; log.appendChild(m);
      if (hasGsap && !reduce) gsap.from(m, { y: 12, opacity: 0, duration: .35, ease: 'expo.out' });
      log.scrollTop = log.scrollHeight; return m;
    }
    function ask(text) {
      text = String(text).trim(); if (!text) return;
      add(esc(text), 'me');
      var t = add('<i></i><i></i><i></i>', 'bot'); t.classList.add('msg--typing');
      setTimeout(function () { t.remove(); add(answer(text), 'bot'); }, 420 + Math.min(500, text.length * 8));
    }
    var greeted = false;
    function open(v) {
      box.hidden = !v; fab.setAttribute('aria-expanded', v);
      if (v) {
        if (!greeted) { greeted = true; add('Hi! I’m the 14th Street helper. Ask me about prices, today’s deals, or whether we deliver to your area.', 'bot'); }
        if (hasGsap && !reduce) gsap.fromTo(box, { opacity: 0, y: 24, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .4, ease: 'back.out(1.5)' });
        if (finePointer) input.focus({ preventScroll: true });
      } else fab.focus({ preventScroll: true });
    }
    fab.addEventListener('click', function () { open(true); });
    $('[data-chat-close]').addEventListener('click', function () { open(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden && !document.querySelector('dialog[open]')) open(false); });
    chipsEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) ask(b.textContent); });
    form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); input.value = ''; });
    log.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]'); if (a && window.matchMedia('(max-width: 640px)').matches) open(false);
    });
    // the button appears once the hero is behind you
    function topCheck() { fab.classList.toggle('is-top', window.scrollY < window.innerHeight * .6); }
    window.addEventListener('scroll', topCheck, { passive: true }); topCheck();
    // keep the button out of the way of the sticky build receipt on phones
    var build = $('#build');
    if (build && 'IntersectionObserver' in window) new IntersectionObserver(function (es) {
      fab.classList.toggle('is-away', es[0].isIntersecting && window.matchMedia('(max-width: 960px)').matches);
    }, { rootMargin: '-20% 0px -20% 0px' }).observe(build);
  }

  function smooth() {
    if (!hasGsap) return;
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (reduce || !finePointer || !window.Lenis) return;
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function boot() {
    smooth();
    ticker(); nav(); best(); xtreme(); flavours(); build(); deals(); menu(); sheet(); branches(); hero(); reveals(); tilt(); chat();
    intro().then(heroIn);
    if (hasGsap) window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
