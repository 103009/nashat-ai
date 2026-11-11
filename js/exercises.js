// Exercise analysers (v2).
//
// The AI model (MediaPipe Pose Landmarker) gives us 33 body landmarks per video
// frame. This file turns those landmarks into ONE number per frame, the rep
// "progress" p (0 = start position, 1 = bottom of a full rep), and a small
// state machine counts a rep each time p goes down past 0.5 and comes back up
// below 0.2.
//
// Why this design (after user testing showed under-counting):
//  • Every rep is counted. Shallow reps still count, but are marked "not deep enough".
//  • Depth is measured two ways and the larger is used, so it works facing the
//    camera AND side-on: a joint angle (knee/elbow) and how far the body drops
//    (hip towards knee height, shoulders towards the hands). A front camera makes
//    knee angles look straighter than they are, but the hip drop is still clear.
//  • The start position is learned from YOU (decaying maximum), so you don't need
//    to lock your knees/elbows perfectly straight for a rep to finish.
//  • Smoothing adapts to the frame rate, so slow computers don't "miss" the bottom.
//
// Landmark numbers used (BlazePose topology):
//   0 nose · 11/12 shoulders · 13/14 elbows · 15/16 wrists
//   23/24 hips · 25/26 knees · 27/28 ankles     (odd = left, even = right)

export const L = {
  nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
};

export const EXERCISES = {
  squat: {
    id: 'squat', name: 'Squats', view: 'Facing the camera or side-on',
    setup: 'Stand 2–3 m from the camera so your body from head to knees (ideally feet) is in the frame.',
  },
  pushup: {
    id: 'pushup', name: 'Push-ups', view: 'Side-on works best',
    setup: 'Put the camera low, about 2 m away and side-on, so it can see your head, arms and hips.',
  },
  jacks: {
    id: 'jacks', name: 'Jumping jacks', view: 'Facing the camera',
    setup: 'Face the camera, 2–3 m away, with room to spread your arms. Your hands must stay in the frame above your head.',
  },
};

// Rep state machine thresholds (on the progress value p)
const DOWN_ENTER = 0.5; // p above this = you are going down into a rep
const UP_EXIT = 0.2;    // p below this = you are back at the start → rep complete
const MIN_REP_MS = 300; // ignore impossible double-counts

// ── geometry helpers ──────────────────────────────────────────
// Landmarks are 0–1 of the image width/height, so x is scaled by the
// aspect ratio to measure angles in real (square) pixels.
const P = (lm, i, aspect) => ({ x: lm[i].x * aspect, y: lm[i].y, v: lm[i].visibility ?? 1 });

export function angleAt(a, b, c) {
  const abx = a.x - b.x, aby = a.y - b.y, cbx = c.x - b.x, cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

/** Angle of the line a→b away from vertical, in degrees (0 = upright). */
const fromVertical = (a, b) => (Math.atan2(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) * 180) / Math.PI;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const vis = (lm, ids) => ids.reduce((s, i) => s + (lm[i].visibility ?? 1), 0) / ids.length;

/** Pick the body side (left/right) the camera sees best. */
function bestSide(lm, left, right) {
  return vis(lm, left) >= vis(lm, right) ? left : right;
}

/** A maximum that slowly "forgets", so the start position adapts to each person. */
function decayingMax(initial, perSecond) {
  let v = initial;
  return {
    get: () => v,
    update(x, dtMs) { v = Math.max(x, v - perSecond * (dtMs / 1000)); return v; },
    reset() { v = initial; },
  };
}

/** Exponential smoothing that weakens when frames are far apart (slow computers). */
function smoother(strength) {
  let v = null;
  return {
    next(x, dtMs) {
      if (v === null || !Number.isFinite(x)) { v = x; return v; }
      const a = Math.pow(strength, Math.max(1, dtMs) / 33); // 33 ms ≈ one frame at 30 fps
      v = a * v + (1 - a) * x;
      return v;
    },
    reset() { v = null; },
  };
}

// ── per-exercise "progress" readers ─────────────────────────────
// Each returns { visible, p, metrics, live: [{msg, level}], faults: Set (form problems this frame) }

function squatReader(s) {
  const standAngle = decayingMax(165, 4);   // your straight-leg knee angle
  const standRatio = decayingMax(0.75, 0.08); // your standing hip-above-knee height (÷ torso)
  const standTilt = decayingMax(-15, 6);       // minus your standing thigh tilt (a "decaying minimum")
  return (lm, aspect, dt) => {
    const [sh, hip, knee, ankle] = bestSide(lm, [11, 23, 25, 27], [12, 24, 26, 28]).map((i) => P(lm, i, aspect));
    if (Math.min(sh.v, hip.v, knee.v) < s.minVisibility) return { visible: false };
    const torso = Math.max(1e-6, dist(sh, hip));
    // signal 1: knee angle (needs the ankle)
    let pAngle = 0, kneeAngle = null;
    if (ankle.v >= s.minVisibility * 0.8) {
      kneeAngle = angleAt(hip, knee, ankle);
      const stand = standAngle.update(Math.min(kneeAngle, 180), dt);
      pAngle = clamp01((stand - kneeAngle) / Math.max(20, stand - s.squatDownAngle));
    }
    // signal 2: hip drops towards knee height (works facing the camera)
    const ratio = (knee.y - hip.y) / torso;
    const standR = standRatio.update(ratio, dt);
    const pDrop = clamp01((standR - ratio) / Math.max(0.2, standR - 0.12));
    // signal 3: thigh tilts from upright towards horizontal (works side-on even without the feet)
    const tilt = fromVertical(hip, knee);
    const stand0 = -standTilt.update(-tilt, dt);
    const pTilt = clamp01((tilt - stand0) / Math.max(30, 75 - stand0));
    const p = Math.max(pAngle, pDrop, pTilt);

    const lean = fromVertical(sh, hip);
    const faults = new Set();
    const live = [];
    // forward lean only means something side-on (shoulders look narrow)
    const lSh = P(lm, 11, aspect), rSh = P(lm, 12, aspect);
    const sideOn = dist(lSh, rSh) < 0.45 * torso;
    if (sideOn && p > 0.6 && lean > s.squatLeanMax) { faults.add('Leaning too far forward'); live.push({ msg: 'Keep your chest up', level: 'warn' }); }
    // knees caving in (facing the camera, deep part of the squat)
    if (!sideOn && p > 0.7) {
      const lk = P(lm, 25, aspect), rk = P(lm, 26, aspect), la = P(lm, 27, aspect), ra = P(lm, 28, aspect);
      if (Math.min(la.v, ra.v) > s.minVisibility && dist(lk, rk) < 0.7 * dist(la, ra)) {
        faults.add('Knees caving in'); live.push({ msg: 'Push your knees out', level: 'warn' });
      }
    }
    if (p >= s.goodDepth) live.push({ msg: 'Good depth. Now drive up!', level: 'good' });
    return { visible: true, p, faults, live, metrics: { Depth: p, 'Knee angle': kneeAngle, 'Torso lean': lean } };
  };
}

function pushupReader(s) {
  const topAngle = decayingMax(160, 4);
  const topDrop = decayingMax(0.6, 0.06); // shoulder height above the hands at the top (÷ arm length)
  return (lm, aspect, dt) => {
    const [sh, el, wr, hip, ank] = bestSide(lm, [11, 13, 15, 23, 27], [12, 14, 16, 24, 28]).map((i) => P(lm, i, aspect));
    if (Math.min(sh.v, el.v, wr.v) < s.minVisibility) return { visible: false };
    // standing up = hips clearly BELOW the shoulders and the torso upright
    // (in a push-up the hips are level with the shoulders, or look higher when the camera is in front of you)
    const armLen = dist(sh, el) + dist(el, wr);
    if (hip.v >= s.minVisibility * 0.8 && hip.y - sh.y > 0.5 * armLen && fromVertical(sh, hip) < 35) {
      return { visible: true, p: 0, faults: new Set(), metrics: {}, live: [{ msg: 'Get into the push-up position', level: 'info' }], notInPosition: true };
    }
    const elbow = angleAt(sh, el, wr);
    const top = topAngle.update(Math.min(elbow, 180), dt);
    const pAngle = clamp01((top - elbow) / Math.max(20, top - s.pushupDownAngle));
    const arm = Math.max(1e-6, dist(sh, el) + dist(el, wr));
    const drop = (wr.y - sh.y) / arm; // shrinks as the chest goes down
    const topD = topDrop.update(drop, dt);
    const pDrop = clamp01((topD - drop) / Math.max(0.15, topD * 0.55));
    const p = Math.max(pAngle, pDrop);

    const faults = new Set();
    const live = [];
    let body = null;
    if (hip.v >= s.minVisibility && ank.v >= s.minVisibility) {
      body = angleAt(sh, hip, ank);
      if (body < s.pushupBodyLineMin) {
        const lineY = sh.y + ((hip.x - sh.x) / ((ank.x - sh.x) || 1e-6)) * (ank.y - sh.y);
        const f = hip.y > lineY ? 'Hips sagging' : 'Hips too high';
        faults.add(f);
        live.push({ msg: f === 'Hips sagging' ? 'Lift your hips, keep your body straight' : 'Lower your hips, keep your body straight', level: 'warn' });
      }
    }
    if (p >= s.goodDepth) live.push({ msg: 'Good depth. Push up!', level: 'good' });
    return { visible: true, p, faults, live, metrics: { Depth: p, 'Elbow angle': elbow, 'Body line': body } };
  };
}

function jacksReader(s) {
  return (lm, aspect) => {
    const nose = P(lm, 0, aspect);
    const lSh = P(lm, 11, aspect), rSh = P(lm, 12, aspect);
    const lWr = P(lm, 15, aspect), rWr = P(lm, 16, aspect);
    if (Math.min(lSh.v, rSh.v, lWr.v, rWr.v) < s.minVisibility) return { visible: false };
    const shoulderW = Math.max(1e-6, dist(lSh, rSh));
    // arms: 0 = hands by your sides, 1 = hands level with your nose or higher
    const shY = (lSh.y + rSh.y) / 2;
    const low = shY + shoulderW * 0.9;
    const armOf = (w) => (low - w.y) / Math.max(1e-6, low - nose.y);
    const arms = Math.max(0, Math.min(1.2, (armOf(lWr) + armOf(rWr)) / 2));
    const p = clamp01(arms);
    const lAn = P(lm, 27, aspect), rAn = P(lm, 28, aspect);
    const feet = Math.min(lAn.v, rAn.v) >= s.minVisibility ? dist(lAn, rAn) / shoulderW : null;
    return { visible: true, p, faults: new Set(), live: [], feet, metrics: { 'Arms up': arms, 'Feet apart': feet } };
  };
}

// ── analyser factory ──────────────────────────────────────────
export function createAnalyzer(type, settings) {
  const s = { goodDepth: 0.8, ...settings };
  const make = { squat: squatReader, pushup: pushupReader, jacks: jacksReader }[type];
  if (!make) throw new Error('Unknown exercise ' + type);
  let reader, sm, state, lastT;

  const reset = () => {
    reader = make(s);
    sm = smoother(s.smoothing);
    state = { phase: 'ready', armed: false, calm: 0, reps: 0, goodReps: 0, partials: 0, rep: null, lastRepAt: -1e9, faults: {} };
    lastT = null;
  };
  reset();

  const result = (extra) => ({
    reps: state.reps, goodReps: state.goodReps, partials: state.partials, phase: state.phase,
    feedback: [], metrics: {}, event: null, faults: [], visible: true, ...extra,
  });

  return {
    type,
    reset,
    /** @param lm 33 landmarks · @param aspect video width ÷ height · @param t time in ms */
    update(lm, aspect, t) {
      if (!lm || lm.length < 33) return result({ visible: false });
      const dt = lastT === null ? 33 : Math.min(500, Math.max(1, t - lastT));
      lastT = t;
      const r = reader(lm, aspect, dt);
      if (!r.visible) return result({ visible: false });
      const p = sm.next(r.p, dt);
      const out = result({ metrics: r.metrics, feedback: [...r.live] });
      out.metrics.Depth = p;

      if (r.notInPosition) { state.armed = false; state.calm = 0; state.phase = 'ready'; return out; }

      // wait until the person is in the start position before counting
      if (!state.armed) {
        state.calm = p < UP_EXIT ? state.calm + 1 : 0;
        if (state.calm >= 2) { state.armed = true; state.phase = 'up'; }
        else { out.feedback.unshift({ msg: type === 'pushup' ? 'Hold the top of a push-up to start' : 'Stand still in the start position', level: 'info' }); return out; }
      }

      if (state.phase === 'up' && p > DOWN_ENTER) {
        state.phase = 'down';
        state.rep = { peak: p, faults: new Set(), feetMax: r.feet ?? null };
      }
      if (state.phase === 'down') {
        const rep = state.rep;
        rep.peak = Math.max(rep.peak, p);
        r.faults.forEach((f) => rep.faults.add(f));
        if (r.feet != null) rep.feetMax = Math.max(rep.feetMax ?? 0, r.feet);
        if (p < UP_EXIT) {
          state.phase = 'up';
          if (t - state.lastRepAt >= MIN_REP_MS) {
            state.lastRepAt = t;
            const faults = [...rep.faults];
            if (type === 'jacks') {
              if (rep.peak < 0.95) faults.push('Arms not all the way up');
              if (rep.feetMax != null && rep.feetMax < s.jackFeetRatio) faults.push('Feet not wide enough');
            } else if (rep.peak < s.goodDepth) {
              faults.push('Not deep enough');
              state.partials += 1;
            }
            state.reps += 1;
            const good = faults.length === 0;
            if (good) state.goodReps += 1;
            for (const f of faults) state.faults[f] = (state.faults[f] || 0) + 1;
            Object.assign(out, { event: 'rep', repGood: good, faults, reps: state.reps, goodReps: state.goodReps, partials: state.partials, phase: 'up' });
          }
          state.rep = null;
        }
      }
      return out;
    },
    summary() {
      return { reps: state.reps, goodReps: state.goodReps, partials: state.partials, faults: { ...state.faults } };
    },
  };
}

/** Friendly coaching cue for a fault name. */
export const CUES = {
  'Leaning too far forward': 'Keep your chest up',
  'Knees caving in': 'Push your knees out',
  'Not deep enough': 'Go a bit lower',
  'Hips sagging': 'Lift your hips',
  'Hips too high': 'Lower your hips',
  'Arms not all the way up': 'Arms all the way up',
  'Feet not wide enough': 'Jump your feet wider',
};
