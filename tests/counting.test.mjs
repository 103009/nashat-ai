// Simulated rep-counting tests: run with  node tests/counting.test.mjs  (Node 18+).
// Each test feeds made-up body landmarks into the real analyser and checks the count.
import { createAnalyzer, L } from '../js/exercises.js';
import { DEFAULT_SETTINGS } from '../js/store.js';

const rad = (d) => (d * Math.PI) / 180;
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const blank = () => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.98 }));
const set = (lm, i, p) => { lm[i] = { ...lm[i], ...p }; };
const jitterAll = (lm, j) => lm.map((p) => ({ ...p, x: p.x + (rnd() - 0.5) * 2 * j, y: p.y + (rnd() - 0.5) * 2 * j }));

// ── squat, side view: knee angle drives everything ──
function squatSide(knee, { lean = 15, ankleVis = 0.98 } = {}) {
  const lm = blank(); const a = rad((180 - knee) / 2);
  const ankle = { x: 0.5, y: 0.9 };
  const kn = { x: ankle.x + 0.2 * Math.sin(a), y: ankle.y - 0.2 * Math.cos(a) };
  const hip = { x: kn.x - 0.2 * Math.sin(a), y: kn.y - 0.2 * Math.cos(a) };
  const sh = { x: hip.x + 0.24 * Math.sin(rad(lean)), y: hip.y - 0.24 * Math.cos(rad(lean)) };
  for (const s of ['l', 'r']) { set(lm, L[s + 'Ankle'], { ...ankle, visibility: ankleVis }); set(lm, L[s + 'Knee'], kn); set(lm, L[s + 'Hip'], hip); set(lm, L[s + 'Shoulder'], { ...sh, x: sh.x + (s === 'l' ? 0.01 : -0.01) }); }
  return lm;
}
// ── squat, facing the camera: 2D knee angle barely changes, the hips drop ──
function squatFront(depth, { ankleVis = 0.98 } = {}) { // depth 0 standing … 1 parallel
  const lm = blank();
  const hipY = 0.52 + 0.15 * depth, kneeY = 0.70, ankleY = 0.9;
  const shY = hipY - 0.24 + 0.03 * depth;
  set(lm, 11, { x: 0.58, y: shY }); set(lm, 12, { x: 0.42, y: shY });
  set(lm, 23, { x: 0.555, y: hipY }); set(lm, 24, { x: 0.445, y: hipY });
  set(lm, 25, { x: 0.57 + 0.02 * depth, y: kneeY }); set(lm, 26, { x: 0.43 - 0.02 * depth, y: kneeY });
  set(lm, 27, { x: 0.56, y: ankleY, visibility: ankleVis }); set(lm, 28, { x: 0.44, y: ankleY, visibility: ankleVis });
  set(lm, 0, { x: 0.5, y: shY - 0.1 });
  return lm;
}
// ── push-up, side view ──
function pushSide(elbow, sag = 0) {
  const lm = blank();
  const wr = { x: 0.3, y: 0.85 }, upper = 0.13, fore = 0.13;
  // shoulder height above the hand follows the elbow angle
  const h = Math.sqrt(upper ** 2 + fore ** 2 - 2 * upper * fore * Math.cos(rad(elbow)));
  const sh = { x: 0.3, y: wr.y - h };
  const el = { x: 0.3 - Math.sqrt(Math.max(0, upper ** 2 - (h / 2) ** 2)), y: (sh.y + wr.y) / 2 }; // exact elbow angle
  const ank = { x: 0.85, y: 0.82 };
  const hip = { x: (sh.x + ank.x) / 2, y: (sh.y + ank.y) / 2 + sag };
  for (const s of ['l', 'r']) { set(lm, L[s + 'Shoulder'], sh); set(lm, L[s + 'Elbow'], el); set(lm, L[s + 'Wrist'], wr); set(lm, L[s + 'Hip'], hip); set(lm, L[s + 'Ankle'], ank); }
  return lm;
}
// ── push-up, camera in front of the head (laptop on the floor) ──
function pushFront(depth) { // 0 top … 1 bottom
  const lm = blank();
  const shY = 0.45 + 0.2 * depth;
  set(lm, 11, { x: 0.6, y: shY }); set(lm, 12, { x: 0.4, y: shY });
  set(lm, 13, { x: 0.66 + 0.06 * depth, y: (shY + 0.85) / 2 }); set(lm, 14, { x: 0.34 - 0.06 * depth, y: (shY + 0.85) / 2 });
  set(lm, 15, { x: 0.62, y: 0.85 }); set(lm, 16, { x: 0.38, y: 0.85 });
  set(lm, 23, { x: 0.56, y: shY - 0.05 }); set(lm, 24, { x: 0.44, y: shY - 0.05 }); // hips appear above/behind the shoulders
  set(lm, 27, { x: 0.55, y: 0.3, visibility: 0.2 }); set(lm, 28, { x: 0.45, y: 0.3, visibility: 0.2 });
  return lm;
}
// ── jumping jacks, facing the camera ──
function jack(open, { feetVis = 0.98 } = {}) {
  const lm = blank();
  set(lm, 0, { x: 0.5, y: 0.2 });
  set(lm, 11, { x: 0.58, y: 0.3 }); set(lm, 12, { x: 0.42, y: 0.3 });
  const wy = 0.58 - open * 0.5;
  set(lm, 15, { x: 0.63 + open * 0.06, y: wy }); set(lm, 16, { x: 0.37 - open * 0.06, y: wy });
  const fw = 0.1 + open * 0.2;
  set(lm, 27, { x: 0.5 + fw / 2, y: 0.9, visibility: feetVis }); set(lm, 28, { x: 0.5 - fw / 2, y: 0.9, visibility: feetVis });
  set(lm, 23, { x: 0.55, y: 0.55 }); set(lm, 24, { x: 0.45, y: 0.55 });
  return lm;
}

const settings = { ...DEFAULT_SETTINGS };
/** Simulate n reps: frame(v) builds landmarks for movement value v (from→to→from), at fps, repSeconds per rep. */
function run(type, frame, { n = 40, from, to, fps = 30, repSec = 1.6, pauseSec = 0.25, jitter = 0.003, lead = 1 } = {}) {
  const an = createAnalyzer(type, settings); const dt = 1000 / fps; let t = 0; let last;
  const step = (v) => { t += dt; last = an.update(jitterAll(frame(v), jitter), 16 / 9 * 9 / 16 * 1, t); };
  for (let i = 0; i < lead * fps; i++) step(from);
  for (let r = 0; r < n; r++) {
    const frames = Math.max(2, Math.round(repSec * fps));
    for (let k = 0; k <= frames; k++) { const ph = k / frames; const v = from + (to - from) * Math.sin(Math.PI * ph); step(v); }
    for (let k = 0; k < pauseSec * fps; k++) step(from);
  }
  for (let i = 0; i < fps; i++) step(from);
  return { ...an.summary(), last };
}
const results = [];
function check(name, got, want, extra = '') {
  const ok = typeof want === 'function' ? want(got) : got === want;
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: counted ${got}${typeof want === 'number' ? ` (expected ${want})` : ''} ${extra}`);
}

let r;
r = run('squat', (v) => squatSide(v), { from: 175, to: 85 }); check('40 squats, side view, 30 fps', r.reps, 40, `good ${r.goodReps}`);
r = run('squat', (v) => squatSide(v), { from: 175, to: 85, fps: 8, repSec: 1.0, pauseSec: 0 }); check('40 FAST squats on a slow PC (8 fps)', r.reps, 40);
r = run('squat', (v) => squatSide(v), { from: 150, to: 88 }); check('40 squats, knees never fully straight (150°)', r.reps, 40);
r = run('squat', (v) => squatFront(v), { from: 0, to: 1 }); check('40 squats FACING the camera', r.reps, 40, `good ${r.goodReps}`);
r = run('squat', (v) => squatFront(v, { ankleVis: 0.1 }), { from: 0, to: 1 }); check('40 squats facing camera, feet out of frame', r.reps, 40);
r = run('squat', (v) => squatSide(v, { ankleVis: 0.1 }), { from: 175, to: 85 }); check('40 squats side view, feet out of frame', r.reps, 40);
r = run('squat', (v) => squatSide(v), { from: 175, to: 125 }); check('40 shallow squats (to 125°) still counted', r.reps, 40, `marked not-deep: ${r.partials}`);
check('…and marked "not deep enough"', r.partials, (x) => x >= 35);
r = run('squat', (v) => squatSide(v), { from: 175, to: 160, n: 20 }); check('tiny knee bends (to 160°) are NOT reps', r.reps, 0);
r = run('squat', (v) => squatSide(v), { from: 175, to: 175, n: 20, jitter: 0.01 }); check('standing still with shaky detection', r.reps, 0);
r = run('squat', (v) => squatSide(v), { from: 175, to: 85, jitter: 0.012 }); check('40 squats with shaky detection', r.reps, 40);

r = run('pushup', (v) => pushSide(v), { from: 170, to: 80 }); check('40 push-ups, side view', r.reps, 40, `good ${r.goodReps}`);
check('…full-depth push-ups marked good form', r.goodReps, (x) => x >= 38);
r = run('pushup', (v) => pushSide(v, 0.07), { from: 170, to: 80, n: 10 }); check('10 push-ups with sagging hips: counted', r.reps, 10, `faults ${JSON.stringify(r.faults)}`);
r = run('pushup', (v) => pushSide(v), { from: 170, to: 80, fps: 8, repSec: 1.0, pauseSec: 0 }); check('40 FAST push-ups on a slow PC (8 fps)', r.reps, 40);
r = run('pushup', (v) => pushSide(v), { from: 150, to: 85 }); check('40 push-ups, arms never fully straight', r.reps, 40);
r = run('pushup', (v) => pushFront(v), { from: 0, to: 1 }); check('40 push-ups, camera in front of the head', r.reps, 40);
r = run('pushup', (v) => squatSide(v), { from: 175, to: 85, n: 10 }); check('standing squats are NOT push-ups', r.reps, 0);

r = run('jacks', (v) => jack(v), { from: 0, to: 1, repSec: 1.0, pauseSec: 0.1 }); check('40 jumping jacks', r.reps, 40, `good ${r.goodReps}`);
r = run('jacks', (v) => jack(v), { from: 0, to: 1, fps: 8, repSec: 0.8, pauseSec: 0 }); check('40 FAST jumping jacks on a slow PC (8 fps)', r.reps, 40);
r = run('jacks', (v) => jack(v, { feetVis: 0.1 }), { from: 0, to: 1, repSec: 1.0 }); check('40 jumping jacks, feet out of frame', r.reps, 40);
r = run('jacks', (v) => jack(v), { from: 0, to: 0.3, n: 20 }); check('small arm waves are NOT jumping jacks', r.reps, 0);

const failed = results.filter((x) => !x).length;
console.log(failed ? `\n${failed} FAILED` : '\nALL COUNTING TESTS PASSED');
