// Animations, based on the UI/UX Pro Max GSAP presets:
//  • Scroll reveal (Standard): y 24px, 0.5s, power2.out, stagger 0.08, max ~8 children
//  • Stagger list (Subtle):   y 8px, 0.3s, stagger 0.03
//  • Headline split (Complex): chars, y 20, rotateX -40, 0.6s, stagger 0.015, expo.out; revert afterwards
//  • Rules: ease-out on entry, animate 1–2 key things per view, transform/opacity only,
//    and respect prefers-reduced-motion (show the final state straight away).
//
// GSAP © GreenSock, Standard "no charge" licence — https://gsap.com/standard-license

const SCRIPTS = ['gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js', 'DrawSVGPlugin.min.js'];
const base = new URL('../vendor/gsap/', import.meta.url);
let gsapPromise = null;

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

/** Resolves to gsap, or null if motion is off or GSAP could not load. */
export function ready() {
  if (!gsapPromise) {
    gsapPromise = (async () => {
      if (reducedMotion()) return null;
      try {
        for (const f of SCRIPTS) if (!window[f.replace('.min.js', '')]) await loadScript(new URL(f, base).href);
        const { gsap, ScrollTrigger, SplitText, DrawSVGPlugin } = window;
        gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
        gsap.defaults({ ease: 'power2.out', duration: 0.5 });
        return gsap;
      } catch (e) {
        console.warn('Animations unavailable', e);
        return null;
      }
    })();
  }
  return gsapPromise;
}

const unhide = () => document.documentElement.classList.remove('js-motion');

/** Page entrance + scroll reveals. Called on every page by initPage(). */
export async function autoAnimate() {
  const gsap = await ready();
  if (!gsap) { unhide(); return; }
  const { ScrollTrigger } = window;

  // Intro: eyebrow, title and lead text (Stagger list, Standard)
  const intro = [...document.querySelectorAll('.intro')];
  const headline = document.querySelector('[data-split]');
  gsap.set(intro, { opacity: 0, y: 24 });

  // Scroll reveal for card groups (Standard preset)
  const groups = [...document.querySelectorAll('main :is(.grid, .pipeline, .exercise-pick, .split)')];
  for (const g of groups) gsap.set([...g.children].slice(0, 8), { opacity: 0, y: 24 });

  // Page illustrations: lines draw themselves, shapes pop in, bars grow (DrawSVG plugin)
  const arts = [...document.querySelectorAll('.page-art')];
  const artTl = gsap.timeline({ delay: 0.15 });
  for (const art of arts) {
    artTl.fromTo(art, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.5, clearProps: 'transform' }, 0)
      .fromTo(art.querySelectorAll('.draw'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, stagger: 0.06, ease: 'power2.out' }, 0.15)
      .fromTo(art.querySelectorAll('.grow'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 0.3)
      .fromTo(art.querySelectorAll('.pop'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(2.5)' }, 0.35);
  }

  unhide(); // everything above is now hidden by GSAP itself, so the CSS pre-hide can go

  // Illustrations drift up more slowly than the page as you scroll (parallax, scrubbed)
  for (const art of arts) {
    gsap.to(art.querySelector('svg'), {
      yPercent: 18, ease: 'none',
      scrollTrigger: { trigger: art, start: 'top 80px', end: 'bottom top', scrub: true },
    });
  }

  const tl = gsap.timeline();
  tl.to(intro, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, clearProps: 'transform' });

  if (headline) {
    const split = new window.SplitText(headline, { type: 'chars,words', aria: 'auto' });
    tl.from(split.chars, {
      opacity: 0, y: 20, rotateX: -40, duration: 0.6, stagger: 0.015, ease: 'expo.out',
      onComplete: () => split.revert(), // give screen readers the plain text back
    }, 0.05);
  }

  for (const g of groups) {
    const kids = [...g.children].slice(0, 8);
    gsap.to(kids, {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.08, clearProps: 'transform',
      scrollTrigger: { trigger: g, start: 'top 88%', once: true },
    });
    [...g.children].slice(8).forEach((k) => gsap.set(k, { opacity: 1 }));
  }
  ScrollTrigger.refresh();
}

/** Count a number up to its new value (e.g. heat index, stat tiles). */
export async function countUp(el, to, { decimals = 0, suffix = '', from = null, duration = 0.8 } = {}) {
  if (!el) return;
  const text = (v) => v.toFixed(decimals) + suffix;
  const gsap = await ready();
  if (!gsap || !Number.isFinite(to)) { el.textContent = Number.isFinite(to) ? text(to) : el.textContent; return; }
  const start = from ?? (parseFloat(el.textContent) || 0);
  const o = { v: start };
  gsap.killTweensOf(el.__countObj || {});
  el.__countObj = o;
  gsap.to(o, { v: to, duration, ease: 'power2.out', onUpdate: () => { el.textContent = text(o.v); } });
}

/** Quick "pop" for feedback such as a counted rep (Hover micro-interaction, Standard). */
export async function pop(el, scale = 1.25) {
  const gsap = await ready();
  if (!gsap || !el) return;
  gsap.fromTo(el, { scale }, { scale: 1, duration: 0.35, ease: 'back.out(3)', overwrite: true });
}

/** Small fade-up when a message changes (Subtle: y 8, 0.3s). */
export async function nudge(el) {
  const gsap = await ready();
  if (!gsap || !el) return;
  gsap.fromTo(el, { opacity: 0.4, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power1.out', overwrite: true });
}

/** Grow chart bars from their baseline using transform only (no width/height animation). */
export async function growBars(els, axis = 'y') {
  const gsap = await ready();
  if (!gsap || !els?.length) return;
  const prop = axis === 'y' ? 'scaleY' : 'scaleX';
  gsap.fromTo(els, { [prop]: 0 }, {
    [prop]: 1, duration: 0.6, ease: 'power2.out', stagger: Math.min(0.03, 0.6 / els.length),
    transformOrigin: axis === 'y' ? '50% 100%' : '0% 50%', clearProps: 'transform',
  });
}
