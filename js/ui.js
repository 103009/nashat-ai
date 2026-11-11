// Shared page chrome: navigation, footer, voice, small helpers.
import { CONFIG } from './config.js';
import { getSettings } from './store.js';
import { autoAnimate, setupPageTransitions, motionOn, motionPref, setMotionPref, deviceReducesMotion } from './motion.js';

// Simple line icons (Lucide style, MIT licence).
export const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  brain: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M12 5v13"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 19A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  droplet: '<path d="M12 2.7s6 6.3 6 11.3a6 6 0 0 1-12 0c0-5 6-11.3 6-11.3z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12A9 9 0 0 1 18.5 5.8L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  play: '<path d="m6 3 14 9-14 9z"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  switch: '<path d="M17 3l4 4-4 4"/><path d="M3 11V9a2 2 0 0 1 2-2h16"/><path d="M7 21l-4-4 4-4"/><path d="M21 13v2a2 2 0 0 1-2 2H3"/>',
  arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
  crown: '<path d="M2 7l5 4 5-7 5 7 5-4-2 12H4z"/><path d="M4 21h16"/>',
};

export const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

const NAV = [
  { href: 'index.html', label: 'Home', icon: 'home' },
  { href: 'heat.html', label: 'Heat check', icon: 'sun' },
  { href: 'coach.html', label: 'AI coach', icon: 'camera' },
  { href: 'how.html', label: 'How it works', icon: 'brain' },
  { href: 'lab.html', label: 'Test lab', icon: 'flask' },
  { href: 'team.html', label: 'Team', icon: 'users' },
];

export function initPage() {
  const here = location.pathname.split('/').pop() || 'index.html';
  const links = NAV.map((n) => {
    const cur = n.href === here ? ' aria-current="page"' : '';
    return `<a href="${n.href}"${cur}>${icon(n.icon)}<span>${n.label}</span></a>`;
  }).join('');

  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <a class="skip" href="#main">Skip to content</a>
    <div class="wrap header-inner">
      <a class="brand" href="index.html" aria-label="${CONFIG.appName} home">
        <span class="brand-mark" aria-hidden="true">N</span>
        <span class="brand-text">${CONFIG.appName}<small lang="ar">${CONFIG.appNameArabic}</small></span>
      </a>
      <nav class="top-nav" aria-label="Main">${links}</nav>
      <button class="motion-toggle" type="button" aria-pressed="${motionOn()}" title="Turn animations and smooth scrolling on or off">
        ${icon('sparkles')}<span>Motion: ${motionOn() ? 'on' : 'off'}</span>
      </button>
    </div>`;
  document.body.prepend(header);
  header.querySelector('.motion-toggle').addEventListener('click', () => {
    setMotionPref(motionOn() ? 'off' : 'on');
    location.reload();
  });

  // The device asks for less motion and the visitor hasn't chosen yet: offer to turn it on.
  if (motionPref() === 'auto' && deviceReducesMotion()) {
    const note = document.createElement('div');
    note.className = 'motion-note';
    note.setAttribute('role', 'region');
    note.setAttribute('aria-label', 'Animations');
    note.innerHTML = `<div class="wrap motion-note-inner">
        <p>${icon('sparkles')} <span>Animations are paused because your computer's <strong>reduce motion</strong> setting is on.</span></p>
        <div class="btn-row"><button class="btn btn-sm btn-primary" type="button" data-motion="on">Turn on animations</button>
        <button class="btn btn-sm btn-ghost" type="button" data-motion="off">Keep them off</button></div>
      </div>`;
    header.after(note);
    note.addEventListener('click', (e) => {
      const b = e.target.closest('[data-motion]');
      if (!b) return;
      setMotionPref(b.dataset.motion);
      if (b.dataset.motion === 'on') location.reload(); else note.remove();
    });
  }

  const tab = document.createElement('nav');
  tab.className = 'tab-bar';
  tab.setAttribute('aria-label', 'Main');
  tab.innerHTML = links;
  document.body.append(tab);

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="wrap">
      <p><strong>${CONFIG.appName}</strong> · ${CONFIG.field} · ${CONFIG.event} · ${CONFIG.school}${CONFIG.teamNumber ? ' · Team ' + CONFIG.teamNumber : ''}</p>
      <p class="muted">Nashat gives general fitness guidance, not medical advice. Camera video is processed on your device and never uploaded. · v${CONFIG.appVersion}</p>
    </div>`;
  document.body.append(footer);

  setupPageTransitions();
  autoAnimate().catch((e) => { console.warn(e); document.documentElement.classList.remove('js-motion'); });
}

// ── voice coaching ──
let lastSpoken = { text: '', at: 0 };
export function speak(text, { force = false, gap = 2500 } = {}) {
  if (!getSettings().voice || !('speechSynthesis' in window)) return;
  const now = performance.now();
  if (!force && text === lastSpoken.text && now - lastSpoken.at < gap * 2) return;
  if (!force && now - lastSpoken.at < 900) return;
  lastSpoken = { text, at: now };
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  u.rate = 1.05;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ── tiny helpers ──
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(msg, kind = 'info') {
  let box = $('.toast-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toast-box';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.append(box);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.textContent = msg;
  box.append(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3600);
}

export const fmt1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '–');
export const fmtTime = (sec) => {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
