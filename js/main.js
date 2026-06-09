/* ============================================================
   부천 라이프 — 인터랙션 (Vanilla JS)
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || window.location.hash === "#static";

  /* verification helper: ?vy=NNN shifts the page up so a lower section
     renders at the top for a native-resolution screenshot. No-op in normal use. */
  var _vy = new URLSearchParams(window.location.search).get("vy");
  if (_vy) {
    document.documentElement.style.marginTop = "-" + parseInt(_vy, 10) + "px";
  }

  /* ---------- helpers ---------- */
  function $all(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function isMobile() { return window.innerWidth <= 768; }

  /* ============================================================
     0) Fit-to-width scaling
        PC : 1920 캔버스를 뷰포트에 맞춰 축소(우측 잘림/치우침 방지, 중앙 유지)
        Mobile : 375 캔버스를 뷰포트 폭에 정확히 맞춤
     ============================================================ */
  var root = document.documentElement;
  function applyFit() {
    var w = window.innerWidth, z;
    if (w <= 768) {
      z = w / 375;
    } else {
      z = Math.min(1, w / 1920);
    }
    root.style.zoom = z;
    // 모바일로 전환되면 PC 패럴랙스가 남긴 인라인 transform 제거(스케일 목업 복구)
    if (isMobile()) {
      parallaxEls.forEach(function (p) {
        p.el.style.transform = "";
        p.el.style.transition = "";
      });
    }
  }

  /* ============================================================
     1) Reveal on scroll  (stagger per section)
     ============================================================ */
  function startFloat(el) {
    if (reduced || !el.hasAttribute("data-float")) return;
    var dur = parseFloat(el.getAttribute("data-float")) || 6;
    el.style.setProperty("--float-dur", dur + "s");
    el.style.animationDelay = (Math.random() * 0.8).toFixed(2) + "s";
    el.classList.add("is-floating");
  }

  function revealGroup(items) {
    items.forEach(function (el, i) {
      var delay = Math.min(i * 90, 540);
      el.style.transitionDelay = delay + "ms";
      el.classList.add("is-in");
      if (el.hasAttribute("data-float")) {
        window.setTimeout(function () { startFloat(el); }, 800 + delay);
      }
    });
  }

  if (reduced) {
    $all("[data-reveal]").forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var section = entry.target;
        revealGroup($all("[data-reveal]", section));
        io.unobserve(section);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

    $all(".section").forEach(function (s) { io.observe(s); });
  }

  /* hero entrance on load */
  window.addEventListener("load", function () {
    if (reduced) return;
    var hero = document.querySelector(".section--hero");
    if (hero) revealGroup($all("[data-reveal]", hero));
  });

  /* ============================================================
     2) Sticky header  (SAIRO 벤치마크)
        - 살짝만 스크롤해도 흰 헤더로 고정 + 브랜드 노출
        - 아래로 빠르게 스크롤하면 숨김, 위로 올리면 노출
     ============================================================ */
  var header = document.querySelector("[data-header]");
  if (header) {
    var lastY = window.pageYOffset, hTick = false;
    function onHeaderScroll() {
      var y = window.pageYOffset;
      header.classList.toggle("is-stuck", y > 24);
      if (!reduced) {
        if (y > 320 && y > lastY + 6) header.classList.add("is-hidden");
        else if (y < lastY - 6 || y < 320) header.classList.remove("is-hidden");
      }
      lastY = y; hTick = false;
    }
    window.addEventListener("scroll", function () {
      if (hTick) return; hTick = true;
      window.requestAnimationFrame(onHeaderScroll);
    }, { passive: true });
    onHeaderScroll();
  }

  /* ============================================================
     3) Mobile drawer nav
     ============================================================ */
  var burger = document.querySelector("[data-burger]");
  var mobnav = document.querySelector("[data-mobnav]");
  function closeNav() {
    if (!mobnav) return;
    mobnav.classList.remove("is-open");
    if (burger) { burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "메뉴 열기"); }
  }
  if (burger && mobnav) {
    burger.addEventListener("click", function () {
      var open = mobnav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    });
  }

  /* ============================================================
     4) Smooth-scroll anchors (header / nav / logo) — header offset
     ============================================================ */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function smoothTo(targetY, duration) {
    var startY = window.pageYOffset, diff = targetY - startY, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      window.scrollTo(0, startY + diff * easeInOutCubic(t));
      if (t < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  function anchorTarget(hash) {
    if (hash === "#top" || hash === "#") return 0;
    var el = document.querySelector(hash);
    if (!el) return null;
    var z = parseFloat(root.style.zoom) || 1;
    var rectTop = el.getBoundingClientRect().top * z;   // zoom 보정
    var headerH = header ? header.getBoundingClientRect().height * z : 0;
    return window.pageYOffset + rectTop - headerH - 8;
  }
  $all('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var hash = a.getAttribute("href");
      var y = anchorTarget(hash);
      if (y === null) return;
      e.preventDefault();
      closeNav();
      if (reduced) { window.scrollTo(0, y); return; }
      smoothTo(Math.max(0, y), 720);
    });
  });

  /* ============================================================
     5) Hero mouse parallax / tilt
     ============================================================ */
  var heroSection = document.querySelector(".section--hero");
  var tiltEls = $all(".section--hero [data-tilt]");
  if (heroSection && tiltEls.length && !reduced) {
    var tnx = 0, tny = 0, tTick = false;
    function applyTilt() {
      tiltEls.forEach(function (el) {
        if (isMobile()) { el.style.transform = ""; return; }
        var f = parseFloat(el.getAttribute("data-tilt-f")) || 16;
        el.style.transform = "translate3d(" + (tnx * f).toFixed(1) + "px," + (tny * f).toFixed(1) + "px,0)";
      });
      tTick = false;
    }
    heroSection.addEventListener("mousemove", function (e) {
      if (isMobile()) return;
      var r = heroSection.getBoundingClientRect();
      tnx = (e.clientX - r.left) / r.width - 0.5;
      tny = (e.clientY - r.top) / r.height - 0.5;
      if (!tTick) { tTick = true; window.requestAnimationFrame(applyTilt); }
    });
    heroSection.addEventListener("mouseleave", function () {
      tnx = 0; tny = 0;
      if (!tTick) { tTick = true; window.requestAnimationFrame(applyTilt); }
    });
  }

  /* ============================================================
     6) Scroll parallax (phones / cards / mascot) — PC 전용
     ============================================================ */
  var parallaxEls = $all("[data-parallax]").map(function (el) {
    return { el: el, factor: parseFloat(el.getAttribute("data-parallax")) || 0 };
  });
  var pTick = false;
  function applyParallax() {
    if (isMobile()) { pTick = false; return; }
    var vh = window.innerHeight;
    parallaxEls.forEach(function (p) {
      var r = p.el.getBoundingClientRect();
      var center = r.top + r.height / 2;
      var dist = center - vh / 2;
      var shift = (dist * p.factor).toFixed(2);
      p.el.style.transform = "translate3d(0," + shift + "px,0)";
    });
    pTick = false;
  }
  function onParallaxScroll() {
    if (pTick || reduced || isMobile()) return;
    pTick = true;
    window.requestAnimationFrame(applyParallax);
  }
  if (!reduced && parallaxEls.length) {
    parallaxEls.forEach(function (p) {
      p.el.addEventListener("transitionend", function once(e) {
        if (e.propertyName === "transform") {
          p.el.style.transition = "none";
          p.el.removeEventListener("transitionend", once);
        }
      });
    });
    window.addEventListener("scroll", onParallaxScroll, { passive: true });
  }

  /* ============================================================
     7) "걸을수록 받아가는 부천" — 진행바 연동 신발 스케일
        진행값 p(0~1)을 스크롤 진행도로 산출 → 진행바 채움 + 진행바 선단에
        가장 가까운 신발이 가장 크게(거리 기반 가우시안 falloff).
     ============================================================ */
  (function shoeProgress() {
    var section = document.querySelector(".section--challenge");
    if (!section) return;
    var shoes = $all("[data-shoe]", section);
    var fill = section.querySelector(".track__fill");
    if (!shoes.length) return;

    var PEAK = 1.22, BASE = 0.84;
    var fillTarget = 0, centers = [], spacing = 200, fillLeft = 0;

    function readTarget() {
      if (!fill) return 0;
      var mo = fill.getAttribute("data-progress-mo");
      return (isMobile() && mo) ? parseFloat(mo)
        : parseFloat(fill.getAttribute("data-progress")) || 0;
    }
    function measure() {
      fillTarget = readTarget();
      fillLeft = fill ? fill.offsetLeft : 0;
      centers = shoes.map(function (s) { return s.offsetLeft + s.offsetWidth / 2; });
      if (centers.length > 1) {
        var gaps = 0;
        for (var i = 1; i < centers.length; i++) gaps += Math.abs(centers[i] - centers[i - 1]);
        spacing = gaps / (centers.length - 1);
      }
    }

    function progress() {
      // 섹션이 뷰포트 중앙을 지나는 정도를 0~1 로
      var r = section.getBoundingClientRect();
      var vh = window.innerHeight;
      return clamp((vh * 0.62 - r.top) / (r.height * 0.9), 0, 1);
    }

    var sTick = false;
    function render() {
      sTick = false;
      var p = reduced ? 1 : progress();
      if (fill) fill.style.width = (p * fillTarget) + "px";
      var leadX = fillLeft + p * fillTarget;          // 진행바 선단 (offset 좌표계)
      var sigma = spacing * 0.62;
      var nearest = -1, nearestD = Infinity;
      var scales = shoes.map(function (s, i) {
        var d = Math.abs(centers[i] - leadX);
        if (d < nearestD) { nearestD = d; nearest = i; }
        var g = Math.exp(-(d * d) / (2 * sigma * sigma));
        return BASE + (PEAK - BASE) * g;
      });
      shoes.forEach(function (s, i) {
        if (reduced) { s.style.transform = ""; s.style.filter = ""; s.style.zIndex = ""; return; }
        s.style.transform = "scale(" + scales[i].toFixed(3) + ")";
        if (i === nearest) {
          s.style.zIndex = "5";
          s.style.filter = "drop-shadow(0 18px 26px rgba(0,0,0,0.26)) brightness(1.04)";
        } else {
          s.style.zIndex = "1";
          s.style.filter = "drop-shadow(0 10px 16px rgba(0,0,0,0.12))";
        }
      });
    }
    function onScroll() {
      if (sTick) return; sTick = true;
      window.requestAnimationFrame(render);
    }

    // 신발은 transform 을 JS 가 소유 → 부드러운 보간용 transition 짧게
    shoes.forEach(function (s) {
      s.style.willChange = "transform";
      s.style.transition = "transform 0.25s var(--ease-out), filter 0.25s var(--ease-out)";
      s.style.transformOrigin = "center bottom";
    });
    if (fill) fill.style.transition = "none";

    measure();
    if (reduced) { render(); return; }
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { measure(); render(); });
  })();

  /* ============================================================
     8) Boot + resize
     ============================================================ */
  applyFit();
  if (!reduced && parallaxEls.length) applyParallax();
  var rTick = false;
  window.addEventListener("resize", function () {
    if (rTick) return; rTick = true;
    window.requestAnimationFrame(function () {
      applyFit();
      if (!reduced) applyParallax();
      rTick = false;
    });
  });
})();
