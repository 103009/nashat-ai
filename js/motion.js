// Nashat motion system
// ─────────────────────────────────────────────────────────────
// • GSAP + ScrollTrigger + SplitText + DrawSVG (official GSAP skill guidance)
// • Lenis smooth scrolling driven by GSAP's ticker (Lenis skill guidance)
// • Page-to-page wipe transitions, scroll progress bar, auto-hiding header
// • Motion is always on (the team's design choice), on every device.
//
// GSAP © GreenSock (standard no-charge licence) · Lenis © darkroom.engineering (MIT)

const BASE = new URL('../vendor/', import.meta.url);
const SCRIPTS = [
  ['gsap', 'gsap/gsap.min.js'],
  ['ScrollTrigger', 'gsap/ScrollTrigger.min.js'],
  ['SplitText', 'gsap/SplitText.min.js'],
  ['DrawSVGPlugin', 'gsap/DrawSVGPlugin.min.js'],
  ['Lenis', 'lenis/lenis.min.js'],
];
/** Motion is always on. */
export const motionOn = () => true;

let gsapPromise = null;
let lenis = null;
export const getLenis = () => lenis;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load ' + src));
    document.head.append(s);
  });
}

/** Resolves to gsap (with plugins + Lenis running), or null when motion is off / failed. */
export function ready() {
  if (!gsapPromise) {
    gsapPromise = (async () => {
      try {
        for (const [name, file] of SCRIPTS) if (!window[name]) await loadScript(new URL(file, BASE).href);
        const { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, Lenis } = window;
        gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
        gsap.defaults({ ease: 'power2.out', duration: 0.6 });

        // Lenis + ScrollTrigger, exactly as the Lenis docs recommend
        lenis = new Lenis({
          lerp: 0.09,
          wheelMultiplier: 1,
          anchors: { offset: -80 },
          allowNestedScroll: true,
          stopInertiaOnNavigate: true,
          respectReducedMotion: false, // motion is always on for this site
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        return gsap;
      } catch (e) {
        console.warn('Animations unavailable', e);
        return null;
      }
    })();
  }
  return gsapPromise;
}

/** Smooth-scroll to an element (Lenis if running, native otherwise). */
export function scrollToEl(el, offset = -80) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.1 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'auto' });
}

const unhide = () => document.documentElement.classList.remove('js-motion');

// ── page transitions (CSS wipe, so it still works if a script fails) ──
const WIPE_KEY = 'nashat.wipe';
export function setupPageTransitions() {
  const html = document.documentElement;
  // coming back with the browser's Back button can restore a covered page
  window.addEventListener('pageshow', (e) => { if (e.persisted) html.classList.remove('wipe-leave'); });
  try { sessionStorage.removeItem(WIPE_KEY); } catch { /* ignore */ }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return; // same-page anchor: Lenis handles it
    if (url.href === location.href) { e.preventDefault(); return; }
    e.preventDefault();
    try { sessionStorage.setItem(WIPE_KEY, '1'); } catch { /* ignore */ }
    html.classList.add('wipe-leave');
    setTimeout(() => { location.href = url.href; }, 480);
  });
}

// ── header: hide when scrolling down, show when scrolling up ──
function autoHideHeader(gsap) {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const show = gsap.quickTo(header, 'yPercent', { duration: 0.35, ease: 'power3.out' });
  let last = 0;
  lenis?.on('scroll', ({ scroll, direction }) => {
    if (scroll < 120) { show(0); return; }
    if (Math.abs(scroll - last) < 6) return;
    last = scroll;
    show(direction === 1 ? -110 : 0);
  });
}

// ── hover: magnetic primary buttons + soft 3D tilt on cards (mouse only) ──
function hoverEffects(gsap) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  for (const btn of document.querySelectorAll('.btn-primary, .btn-accent')) {
    const x = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
    const y = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.25);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    btn.addEventListener('mouseleave', () => { x(0); y(0); });
  }
  for (const card of document.querySelectorAll('[data-tilt]')) {
    gsap.set(card, { transformPerspective: 900 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 10);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
    });
    card.addEventListener('mouseleave', () => { rx(0); ry(0); });
  }
}

/** Re-measure every ScrollTrigger in page order (pins change the layout below them). */
export function settle() {
  const ST = window.ScrollTrigger;
  if (!ST) return;
  ST.sort();
  ST.refresh();
}

/**
 * Photos: a curtain-style clip reveal with the image zooming out, then a gentle
 * parallax while the photo is on screen. Pages with pinned sections call this
 * after creating their pins (so triggers stay in page order).
 */
export function photoReveals(gsap, root = document) {
  for (const frame of root.querySelectorAll('[data-photo-reveal]')) {
    if (frame.__revealed) continue;
    frame.__revealed = true;
    const img = frame.querySelector('.photo-inner') || frame.querySelector('img'); // photo (+ overlay) moves as one
    gsap.set(frame, { autoAlpha: 1, clipPath: 'inset(100% 0% 0% 0% round 22px)' });
    gsap.set(img, { scale: 1.35, transformOrigin: '50% 50%' });
    gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 90%', once: true } })
      .to(frame, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.3, ease: 'expo.inOut' })
      .to(img, { scale: 1.12, duration: 1.8, ease: 'expo.out' }, 0);
    gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }
}

// Things that slide in as you scroll (each page can add data-reveal to more)
const REVEAL = 'main :is(.card, .pipe, .exercise-pick > button, .stage, .notice, .table-wrap, .member, [data-reveal])';

/** Page entrance + scroll animations. Called on every page by initPage(). */
export async function autoAnimate() {
  const gsap = await ready();
  if (!gsap) { unhide(); return; }
  const { ScrollTrigger, SplitText } = window;
  document.documentElement.classList.add('motion-on');

  // progress bar along the top
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);

  // ── set starting states BEFORE removing the CSS pre-hide (no flash) ──
  const intro = [...document.querySelectorAll('.intro:not(h1)')];
  gsap.set(intro, { autoAlpha: 0, y: 28 });
  const arts = [...document.querySelectorAll('.page-art')];
  const reveal = [...document.querySelectorAll(REVEAL)]
    .filter((el) => el.offsetParent !== null && !el.closest('.no-reveal') && !el.parentElement.closest(REVEAL));
  gsap.set(reveal, { autoAlpha: 0, y: 48, rotationX: -8, transformPerspective: 900, transformOrigin: '50% 0%' });

  const artTl = gsap.timeline({ delay: 0.2 });
  for (const art of arts) {
    artTl.fromTo(art, { autoAlpha: 0, scale: 0.92, rotation: -2 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.8, ease: 'expo.out' }, 0)
      .fromTo(art.querySelectorAll('.draw'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1, stagger: 0.06 }, 0.2)
      .fromTo(art.querySelectorAll('.grow'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, 0.35)
      .fromTo(art.querySelectorAll('.pop'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(2.5)' }, 0.4);
  }

  unhide();

  // ── intro: headline letters + page header ──
  const delay = document.documentElement.classList.contains('wipe-enter') ? 0.35 : 0.05;
  gsap.to(intro, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.09, ease: 'power3.out', delay, clearProps: 'transform' });
  for (const h of document.querySelectorAll('main h1')) {
    SplitText.create(h, {
      type: 'words,chars', aria: 'auto', autoSplit: true,
      onSplit: (self) => gsap.from(self.chars, {
        autoAlpha: 0, yPercent: 60, rotationX: -70, transformOrigin: '50% 100%', duration: 0.8,
        stagger: 0.022, ease: 'expo.out', delay: delay + 0.05,
      }),
    });
  }

  // ── section headings: lines rise out of a mask as they scroll in ──
  for (const h of document.querySelectorAll('main h2:not([data-no-split])')) {
    SplitText.create(h, {
      type: 'lines', mask: 'lines', aria: 'auto', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 110, duration: 0.9, stagger: 0.1, ease: 'expo.out',
        scrollTrigger: { trigger: h, start: 'top 88%', once: true },
      }),
    });
  }

  // ── glowing background drifts as you scroll (scroll-linked, not looping) ──
  const blobs = document.querySelectorAll('.bg-aurora i');
  const drift = [[12, 30], [-18, 22], [10, -26], [-14, -18]];
  blobs.forEach((b, i) => gsap.to(b, {
    xPercent: drift[i][0], yPercent: drift[i][1], scale: 1.15, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 1.5 },
  }));

  // ── page banner photo: slow zoom in on arrival, parallax on scroll ──
  const banner = document.querySelector('.page-banner img');
  if (banner) {
    gsap.fromTo(banner, { scale: 1.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 0.55, duration: 2.2, ease: 'power2.out' });
    gsap.to(banner, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.page-banner', start: 'top top', end: 'bottom top', scrub: true } });
  }
  if (!document.body.classList.contains('home')) photoReveals(gsap);

  // ── illustrations drift with scroll ──
  for (const art of arts) {
    gsap.to(art.querySelector('svg'), { yPercent: 16, ease: 'none', scrollTrigger: { trigger: art, start: 'top 80px', end: 'bottom top', scrub: true } });
  }

  // ── cards and panels: batched reveal as they enter ──
  ScrollTrigger.batch(reveal, {
    start: 'top 96%',
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      autoAlpha: 1, y: 0, rotationX: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out', overwrite: true,
      clearProps: 'transform,transformPerspective,transformOrigin',
    }),
  });

  // ── scroll progress ──
  gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  autoHideHeader(gsap);
  hoverEffects(gsap);

  requestAnimationFrame(settle);
  window.addEventListener('load', settle);
  document.fonts?.ready.then(settle);
  setTimeout(settle, 1200);
}

/** Count a number up to its new value (e.g. heat index, stat tiles). */
export async function countUp(el, to, { decimals = 0, suffix = '', from = null, duration = 0.8 } = {}) {
  if (!el) return;
  const text = (v) => v.toFixed(decimals) + suffix;
  const gsap = await ready();
  if (!gsap || !Number.isFinite(to)) { el.textContent = Number.isFinite(to) ? text(to) : el.textContent; return; }
  const start = from ?? (parseFloat(el.textContent) || 0);
  const o = { v: start };
  if (el.__countTween) el.__countTween.kill();
  el.__countTween = gsap.to(o, { v: to, duration, ease: 'power2.out', onUpdate: () => { el.textContent = text(o.v); } });
}

/** Quick "pop" for feedback such as a counted rep. */
export async function pop(el, scale = 1.25) {
  const gsap = await ready();
  if (!gsap || !el) return;
  gsap.fromTo(el, { scale }, { scale: 1, duration: 0.4, ease: 'back.out(3)', overwrite: true });
}

/** Small fade-up when a message changes. */
export async function nudge(el) {
  const gsap = await ready();
  if (!gsap || !el) return;
  gsap.fromTo(el, { autoAlpha: 0.4, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out', overwrite: true });
}

/** Grow chart bars from their baseline using transform only. */
export async function growBars(els, axis = 'y') {
  const gsap = await ready();
  if (!gsap || !els?.length) return;
  const prop = axis === 'y' ? 'scaleY' : 'scaleX';
  gsap.fromTo(els, { [prop]: 0 }, {
    [prop]: 1, duration: 0.8, ease: 'power3.out', stagger: Math.min(0.03, 0.6 / els.length),
    transformOrigin: axis === 'y' ? '50% 100%' : '0% 50%', clearProps: 'transform',
  });
}
