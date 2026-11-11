// Home page scroll story (GSAP + ScrollTrigger + DrawSVG).
// Follows the official GSAP skill guidance: ScrollTriggers created top-to-bottom,
// scroll-linked tweens use scrub (never with toggleActions), the horizontal tween
// uses ease "none" with containerAnimation for nested triggers, gsap.matchMedia()
// for desktop/mobile + reduced motion, and ScrollTrigger.refresh() after images/fonts.

import { initPage } from './ui.js';
import { ready, photoReveals, settle } from './motion.js';
import { heatIndexC, levelFor } from './heat.js';
import { PHOTO_POSES } from './photo-poses.js';
import { angleAt } from './exercises.js';

initPage();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ── Heat story values come from the real heat-index formula ──
const story = $$('.hi-out').map((el) => {
  const hi = heatIndexC(Number(el.dataset.t), Number(el.dataset.rh));
  el.textContent = `${Math.round(hi)} °C`;
  return hi;
});
const fillFor = (hi) => Math.min(1, Math.max(0.1, (hi - 20) / 42));
function setGauge(hi) {
  const lvl = levelFor(hi);
  $('#gauge-num').textContent = Math.round(hi);
  const badge = $('#gauge-level');
  if (badge.textContent !== lvl.name) badge.textContent = lvl.name;
  badge.style.background = lvl.color;
  return lvl;
}
// static state (no animation / reduced motion): show the final, most important value
// The fill grows from the bulb (y=406) up the tube (top y=20); the gradient stays fixed,
// so the colour you see always matches the real risk level.
function setFill(hi) {
  const h = fillFor(hi) * 386;
  const r = $('#gauge-fill');
  r.setAttribute('y', (406 - h).toFixed(1));
  r.setAttribute('height', h.toFixed(1));
}
setGauge(story[story.length - 1]);
setFill(story[story.length - 1]);

// ── Hero squat figure ──
const ANKLE = { x: 175, y: 360 };
const rad = (d) => (d * Math.PI) / 180;
const at = (p, len, deg, down = false) => ({ x: p.x + len * Math.sin(rad(deg)), y: p.y + (down ? 1 : -1) * len * Math.cos(rad(deg)) });
const GREEN = '#22C55E', ORANGE = '#F97316', BLUE = '#38BDF8';
const byId = (id) => document.getElementById(id);

function pose(knee) {
  const bend = 170 - knee;
  const shin = 4 + bend * 0.4;
  const thigh = 180 - knee - shin;
  const k = at(ANKLE, 80, shin);
  const h = at(k, 80, -thigh);
  const lean = 10 + bend * 0.45;
  const sh = at(h, 75, lean);
  const head = at(sh, 30, lean - 8);
  const arm = 15 + (bend / 80) * 75;
  const el = at(sh, 45, arm, true);
  const wr = at(el, 45, arm - 6, true);
  const P = (p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  byId('fig-body').setAttribute('d', `M${P(sh)} L${P(h)}`);
  byId('fig-arm').setAttribute('d', `M${P(sh)} L${P(el)} L${P(wr)}`);
  byId('fig-leg').setAttribute('d', `M${P(h)} L${P(k)} L${P(ANKLE)} L${ANKLE.x + 30} ${ANKLE.y + 2}`);
  const dot = (id, p) => { byId(id).setAttribute('cx', p.x.toFixed(1)); byId(id).setAttribute('cy', p.y.toFixed(1)); };
  dot('d-head', head); dot('d-sh', sh); dot('d-el', el); dot('d-wr', wr); dot('d-hip', h); dot('d-an', ANKLE); dot('d-knee', k);
  const deep = knee <= 100;
  byId('d-knee').setAttribute('fill', deep ? GREEN : ORANGE);
  byId('knee-box').setAttribute('x', (k.x + 18).toFixed(1));
  byId('knee-box').setAttribute('y', (k.y - 18).toFixed(1));
  byId('knee-box').setAttribute('stroke', deep ? GREEN : ORANGE);
  byId('knee-text').setAttribute('x', (k.x + 64).toFixed(1));
  byId('knee-text').setAttribute('y', (k.y + 7).toFixed(1));
  byId('knee-text').setAttribute('fill', deep ? '#86EFAC' : '#FDBA74');
  byId('knee-text').textContent = `KNEE ${Math.round(knee)}°`;
}
function cue(text, color) {
  byId('cue-text').textContent = text;
  byId('cue-box').setAttribute('stroke', color);
  byId('cue-text').setAttribute('fill', color === GREEN ? '#86EFAC' : color === BLUE ? '#BAE6FD' : '#FDBA74');
}
pose(92);

// ── "What the AI sees": draw the model's real skeleton over the photos ──
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32]];
const KEY = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
function buildPose(fig) {
  const pose = PHOTO_POSES[fig.dataset.pose];
  const svg = fig.querySelector('.pose-svg');
  if (!pose || !svg) return null;
  const { w, h, pts } = pose;
  const P = (i) => ({ x: pts[i][0] * w, y: pts[i][1] * h, v: pts[i][2] });
  const ok = (i) => pts[i][2] > 0.5;
  const sw = w / 110, r = w / 95;
  // the body side the camera sees best
  const side = (l, rr) => (l.reduce((a, i) => a + pts[i][2], 0) >= rr.reduce((a, i) => a + pts[i][2], 0) ? l : rr);
  let angle, label, arcPts;
  if (fig.dataset.pose === 'squat') {
    const [hip, knee, ankle] = side([23, 25, 27], [24, 26, 28]);
    angle = angleAt(P(hip), P(knee), P(ankle));
    label = (a) => `Knee ${Math.round(a)}° · ${a <= 100 ? 'full depth ✓' : 'go lower'}`;
    arcPts = [hip, knee, ankle];
  } else {
    const [sh, hip, ank] = side([11, 23, 27], [12, 24, 28]);
    angle = angleAt(P(sh), P(hip), P(ank));
    label = (a) => `Body line ${Math.round(a)}° · ${a >= 155 ? 'straight ✓' : 'hips out of line'}`;
    arcPts = [sh, hip, ank];
  }
  // arc at the measured joint
  const [a, b, c] = arcPts.map(P);
  const rad = w / 16;
  const u = (p) => { const d = Math.hypot(p.x - b.x, p.y - b.y) || 1; return { x: b.x + ((p.x - b.x) / d) * rad, y: b.y + ((p.y - b.y) / d) * rad }; };
  const p1 = u(a), p2 = u(c);
  const sweep = ((a.x - b.x) * (c.y - b.y) - (a.y - b.y) * (c.x - b.x)) > 0 ? 1 : 0;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.innerHTML =
    BONES.filter(([i, j]) => ok(i) && ok(j)).map(([i, j]) => `<line class="bone" x1="${P(i).x.toFixed(1)}" y1="${P(i).y.toFixed(1)}" x2="${P(j).x.toFixed(1)}" y2="${P(j).y.toFixed(1)}" style="stroke-width:${sw}"/>`).join('') +
    `<path class="arc" d="M${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A${rad} ${rad} 0 0 ${sweep} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" style="stroke-width:${sw * 0.8}"/>` +
    KEY.filter(ok).map((i) => `<circle class="joint${i === arcPts[1] ? ' key' : ''}" cx="${P(i).x.toFixed(1)}" cy="${P(i).y.toFixed(1)}" r="${i === arcPts[1] ? r * 1.5 : r}" style="stroke-width:${sw * 0.45}"/>`).join('');
  const read = fig.querySelector('.pose-read');
  const found = pts.filter((q) => q[2] > 0.5).length;
  read.textContent = `${label(angle)} · ${found}/33 points`;
  return { svg, angle, label, read, found };
}
const poses = $$('.pose-photo').map((fig) => ({ fig, data: buildPose(fig) })).filter((x) => x.data);

// ── Animations ──
ready().then((gsap) => {
  if (!gsap) return; // reduced motion or GSAP unavailable: the static page is complete
  const { ScrollTrigger } = window;

  // Hero demo: 3 squats, then stop (time-based, not scroll-based)
  const s = { knee: 170 };
  let reps = 0;
  pose(170); cue('READY', BLUE);
  const demo = gsap.timeline({ delay: 0.9, onUpdate: () => pose(s.knee) });
  for (let i = 0; i < 3; i++) {
    demo.call(() => cue('GOING DOWN…', ORANGE))
      .to(s, { knee: 88, duration: 1.0, ease: 'power1.inOut' })
      .call(() => cue('GOOD DEPTH · DRIVE UP!', GREEN))
      .to(s, { knee: 88, duration: 0.2 })
      .to(s, { knee: 170, duration: 0.85, ease: 'power2.out' })
      .call(() => { reps++; cue(`REP ${reps} · GOOD FORM`, GREEN); })
      .to(s, { knee: 170, duration: 0.5 });
  }
  demo.call(() => cue('3 REPS · ALL GOOD FORM', GREEN));

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 861px)', mobile: '(max-width: 860px)' }, (ctx) => {
    const { desktop } = ctx.conditions;

    // 1 · HERO: the photo slowly zooms in on arrival, then drifts with scroll; chips float at different speeds
    const heroST = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.fromTo('.hero-photo img', { scale: 1.18 }, { scale: 1, duration: 2.6, ease: 'power2.out' });
    gsap.to('.hero-photo img', { yPercent: 14, ease: 'none', scrollTrigger: heroST });
    gsap.to('.hero-stage', { yPercent: -8, ease: 'none', scrollTrigger: heroST });
    $$('.chip').forEach((c) => gsap.to(c, { y: Number(c.dataset.speed), ease: 'none', scrollTrigger: heroST }));
    gsap.to('#hero-sun', { y: 70, ease: 'none', scrollTrigger: heroST });
    gsap.fromTo('.chip', { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.15, delay: 0.6, ease: 'back.out(2)' });

    // 2 · MARQUEE: rows slide in opposite directions as you scroll
    $$('.marquee-row').forEach((row) => {
      const dir = Number(row.dataset.dir);
      gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -25 }, {
        xPercent: dir < 0 ? -25 : 0, ease: 'none',
        scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: 0.5 },
      });
    });

    // 3 · HEAT STORY: pinned; scroll fills the thermometer and swaps the three steps
    const section = $('#heat-story');
    section.classList.add('is-pinned');
    const steps = $$('.story-step');
    gsap.set(steps, { autoAlpha: 0, y: 30 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });
    const g = { hi: 24 };
    const draw = () => { setGauge(g.hi); setFill(g.hi); };
    draw();
    const story3 = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: draw,
      scrollTrigger: {
        trigger: section, start: 'top top', end: '+=1800', pin: true, scrub: 1,
      },
    });
    story3.addLabel('s0').to(g, { hi: story[0], duration: 1 });
    for (let i = 1; i < steps.length; i++) {
      story3.to(steps[i - 1], { autoAlpha: 0, y: -30, duration: 0.4 })
        .to(steps[i], { autoAlpha: 1, y: 0, duration: 0.4 }, '<0.2')
        .to(g, { hi: story[i], duration: 1 }, '<')
        .addLabel('s' + i);
    }
    story3.to({}, { duration: 0.4 });

    // 3b · WHAT THE AI SEES: photo reveals, then the skeleton draws itself and the angle counts
    photoReveals(gsap, $('#ai-sees'));
    for (const { fig, data } of poses) {
      const bones = data.svg.querySelectorAll('.bone');
      const joints = data.svg.querySelectorAll('.joint');
      const arc = data.svg.querySelector('.arc');
      const n = { v: 180 };
      gsap.set(bones, { drawSVG: '0%' });
      gsap.set(joints, { scale: 0, transformOrigin: '50% 50%' });
      gsap.set(arc, { drawSVG: '0%' });
      gsap.timeline({ delay: 0.5, scrollTrigger: { trigger: fig, start: 'top 75%', toggleActions: 'play none none reverse' } })
        .to(bones, { drawSVG: '100%', duration: 0.5, stagger: 0.05, ease: 'power2.out' })
        .to(joints, { scale: 1, duration: 0.35, stagger: 0.03, ease: 'back.out(3)' }, '-=0.3')
        .to(arc, { drawSVG: '100%', duration: 0.6 }, '-=0.1')
        .fromTo(n, { v: fig.dataset.pose === 'squat' ? 175 : 120 }, {
          v: data.angle, duration: 1, ease: 'power2.out',
          onUpdate: () => { data.read.textContent = `${data.label(n.v)} · ${data.found}/33 points`; },
        }, '<');
    }

    // 4 · HOW IT WORKS: horizontal scroll on desktop, normal stacked scroll on mobile
    const how = $('#how-h');
    const track = $('.h-track');
    let containerAnimation = null;
    {
      how.classList.add('is-horizontal');
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      containerAnimation = gsap.to(track, {
        x: () => -distance(),
        ease: 'none', // required for containerAnimation
        scrollTrigger: { trigger: how, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 1, invalidateOnRefresh: true },
      });
    }
    const panelST = (panel) => (containerAnimation
      ? { trigger: panel, containerAnimation, start: 'left 70%', toggleActions: 'play none none reverse' }
      : { trigger: panel, start: 'top 75%', toggleActions: 'play none none reverse' });

    const cam = $('#p-camera');
    gsap.timeline({ scrollTrigger: panelST(cam) })
      .fromTo($('.scan', cam), { y: 0 }, { y: 190, duration: 1.1, ease: 'power1.inOut', repeat: 1, yoyo: true })
      .fromTo($('.cam-beam', cam), { opacity: 0.04 }, { opacity: 0.22, duration: 0.6, repeat: 1, yoyo: true }, 0);

    const pts = $('#p-points');
    gsap.timeline({ scrollTrigger: panelST(pts) })
      .fromTo($$('.bones path', pts), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, stagger: 0.08, ease: 'power2.out' })
      .fromTo($$('.pts circle', pts), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, stagger: 0.04, ease: 'back.out(3)' }, 0.2);

    const ang = $('#p-angle');
    const angNum = $('.angle-num', ang);
    const a = { v: 170 };
    gsap.timeline({ scrollTrigger: panelST(ang) })
      .fromTo($('.arc', ang), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, ease: 'power2.out' })
      .fromTo(a, { v: 170 }, { v: 92, duration: 1, ease: 'power2.out', onUpdate: () => { angNum.textContent = Math.round(a.v); } }, 0);

    const voice = $('#p-voice');
    const repNum = $('.rep-num', voice);
    const r = { v: 1 };
    gsap.timeline({ scrollTrigger: panelST(voice) })
      .fromTo(r, { v: 1 }, { v: 8, duration: 1.2, ease: 'none', onUpdate: () => { repNum.textContent = Math.round(r.v); } })
      .fromTo($('.bubble', voice), { scale: 0.5, autoAlpha: 0, transformOrigin: '20% 100%' }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(2.5)' }, 0.5)
      .fromTo($$('.waves path', voice), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, stagger: 0.12 }, 0.7);

    // 4b · SPORTS GALLERY: curtain reveals + parallax photos, captions slide up
    photoReveals(gsap, $('#sports'));
    gsap.from('.sport-card .glass-cap', {
      autoAlpha: 0, y: 30, duration: 0.8, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: '.bento', start: 'top 75%', once: true },
    });

    // 5 · PHONES: pop in, then float at different speeds (parallax) on desktop
    ScrollTrigger.batch('.phone', {
      start: 'top 85%', once: true,
      onEnter: (batch) => gsap.fromTo(batch, { autoAlpha: 0, y: 80, rotate: -3 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out', overwrite: true }),
    });
    gsap.set('.phone', { autoAlpha: 0 });
    if (desktop) {
      $$('.phone-card').forEach((card) => gsap.fromTo(card, { y: Number(card.dataset.speed) }, {
        y: -Number(card.dataset.speed), ease: 'none',
        scrollTrigger: { trigger: '#screens', start: 'top bottom', end: 'bottom top', scrub: true },
      }));
    }

    // 6 · NUMBERS count up once
    const bigs = $$('.num-tile .big');
    bigs.forEach((el) => { el.textContent = '0' + (el.dataset.suffix || ''); });
    ScrollTrigger.create({
      trigger: '.numbers', start: 'top 85%', once: true,
      onEnter: () => bigs.forEach((el, i) => {
        const o = { v: 0 };
        gsap.to(o, { v: Number(el.dataset.count), duration: 1.2, delay: i * 0.1, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v) + (el.dataset.suffix || ''); } });
      }),
    });
    gsap.from('.num-tile', { autoAlpha: 0, y: 30, duration: 0.5, stagger: 0.1, scrollTrigger: { trigger: '.numbers', start: 'top 85%', once: true } });

    // 7 · CTA: the sun sets behind the skyline as you reach the end of the page
    gsap.fromTo('.cta-sun', { y: -140 }, { y: 140, ease: 'none', scrollTrigger: { trigger: '#cta', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.from('.cta-inner > *', { autoAlpha: 0, y: 30, duration: 0.6, stagger: 0.12, scrollTrigger: { trigger: '#cta', start: 'top 70%', once: true } });

    return () => {
      setGauge(story[story.length - 1]); setFill(story[story.length - 1]);
      section.classList.remove('is-pinned');
      how.classList.remove('is-horizontal');
      bigs.forEach((el) => { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
    };
  });

  // Images and fonts change the layout, so recalculate trigger positions afterwards
  // pins change the layout below them: re-measure everything in page order
  settle();
  window.addEventListener('load', settle);
  document.fonts?.ready.then(settle);
});
