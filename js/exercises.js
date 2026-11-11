// Exercise analysers.
//
// The AI model (MediaPipe Pose Landmarker) gives us 33 body landmarks per video
// frame. This file turns those landmarks into joint angles and uses simple
// rules (a "state machine") to count reps and spot form mistakes.
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
    id: 'squat', name: 'Squats', view: 'Side-on or facing the camera',
    setup: 'Stand 2–3 m from the camera so your whole body, head to feet, is in the frame.',
  },
  pushup: {
    id: 'pushup', name: 'Push-ups', view: 'Side-on to the camera',
    setup: 'Put the phone on the floor about 2 m away, side-on, so it can see you from head to feet.',
  },
  jacks: {
    id: 'jacks', name: 'Jumping jacks', view: 'Facing the camera',
    setup: 'Face the camera, 2–3 m away, with room to spread your arms and legs.',
  },
};

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
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });

/** Pick the body side the camera sees best (for side-on exercises). */
function bestSide(lm, aspect, idsLeft, idsRight) {
  const vis = (ids) => ids.reduce((s, i) => s + (lm[i].visibility ?? 1), 0) / ids.length;
  const left = vis(idsLeft), right = vis(idsRight);
  const ids = left >= right ? idsLeft : idsRight;
  return { pts: ids.map((i) => P(lm, i, aspect)), vis: Math.max(left, right) };
}

function smoother(alpha) {
  let v = null;
  return {
    next(x) { v = v === null ? x : alpha * v + (1 - alpha) * x; return v; },
    reset() { v = null; },
  };
}

// ── analyser factory ──────────────────────────────────────────
export function createAnalyzer(type, settings) {
  const s = settings;
  const sm = { a: smoother(s.smoothing), b: smoother(s.smoothing), c: smoother(s.smoothing) };
  let state;
  const reset = () => {
    state = { phase: 'ready', reps: 0, goodReps: 0, partials: 0, rep: null, lastRepAt: -1e9, armed: false, faults: {} };
    sm.a.reset(); sm.b.reset(); sm.c.reset();
  };
  reset();

  const result = (extra) => ({
    reps: state.reps, goodReps: state.goodReps, partials: state.partials, phase: state.phase,
    feedback: [], metrics: {}, event: null, faults: [], visible: true, ...extra,
  });

  function finishRep(t, faults, out) {
    if (t - state.lastRepAt < 400) return; // ignore jitter double-counts
    state.lastRepAt = t;
    state.reps += 1;
    const good = faults.length === 0;
    if (good) state.goodReps += 1;
    for (const f of faults) state.faults[f] = (state.faults[f] || 0) + 1;
    out.event = 'rep';
    out.repGood = good;
    out.faults = faults;
    out.reps = state.reps;
    out.goodReps = state.goodReps;
  }

  // ── SQUAT ──
  function squat(lm, aspect, t) {
    const side = bestSide(lm, aspect, [L.lShoulder, L.lHip, L.lKnee, L.lAnkle], [L.rShoulder, L.rHip, L.rKnee, L.rAnkle]);
    if (side.vis < s.minVisibility) return result({ visible: false });
    const [sh, hip, knee, ankle] = side.pts;
    const knees = sm.a.next(angleAt(hip, knee, ankle));
    const lean = sm.b.next(fromVertical(sh, hip));

    // Front view? Then also check knees caving in.
    const lKnee = P(lm, L.lKnee, aspect), rKnee = P(lm, L.rKnee, aspect);
    const lAnk = P(lm, L.lAnkle, aspect), rAnk = P(lm, L.rAnkle, aspect);
    const lSh = P(lm, L.lShoulder, aspect), rSh = P(lm, L.rShoulder, aspect);
    const frontView = dist(lSh, rSh) > 0.6 * dist(mid(lSh, rSh), mid(P(lm, L.lHip, aspect), P(lm, L.rHip, aspect)));
    const kneeRatio = frontView ? dist(lKnee, rKnee) / Math.max(1e-6, dist(lAnk, rAnk)) : null;

    const out = result({ metrics: { 'Knee angle': knees, 'Torso lean': lean } });

    if (!state.armed) {
      if (knees > s.squatUpAngle) { state.armed = true; state.phase = 'up'; }
      else { out.feedback.push({ msg: 'Stand up tall to start', level: 'info' }); return out; }
    }

    if (state.phase === 'up' && knees < s.squatUpAngle - 10) {
      state.phase = 'down';
      state.rep = { minKnee: knees, maxLean: lean, minKneeRatio: kneeRatio ?? 9 };
    }
    if (state.phase === 'down') {
      const r = state.rep;
      r.minKnee = Math.min(r.minKnee, knees);
      r.maxLean = Math.max(r.maxLean, lean);
      if (kneeRatio !== null && knees < s.squatPartialAngle) r.minKneeRatio = Math.min(r.minKneeRatio, kneeRatio);
      if (lean > s.squatLeanMax) out.feedback.push({ msg: 'Keep your chest up', level: 'warn' });
      if (knees <= s.squatDownAngle) out.feedback.push({ msg: 'Good depth. Now drive up!', level: 'good' });

      if (knees > s.squatUpAngle) {
        state.phase = 'up';
        if (r.minKnee <= s.squatDownAngle) {
          const faults = [];
          if (r.maxLean > s.squatLeanMax) faults.push('Leaning too far forward');
          if (r.minKneeRatio < 0.75) faults.push('Knees caving in');
          finishRep(t, faults, out);
        } else if (r.minKnee <= s.squatPartialAngle) {
          state.partials += 1;
          out.event = 'partial';
          out.faults = ['Not deep enough'];
        }
        state.rep = null;
      }
    }
    return out;
  }

  // ── PUSH-UP ──
  function pushup(lm, aspect, t) {
    const side = bestSide(lm, aspect,
      [L.lShoulder, L.lElbow, L.lWrist, L.lHip, L.lAnkle],
      [L.rShoulder, L.rElbow, L.rWrist, L.rHip, L.rAnkle]);
    if (side.vis < s.minVisibility) return result({ visible: false });
    const [sh, el, wr, hip, ank] = side.pts;
    const elbow = sm.a.next(angleAt(sh, el, wr));
    const body = sm.b.next(angleAt(sh, hip, ank));
    const horizontal = fromVertical(sh, ank) > 50; // body is lying, not standing

    const out = result({ metrics: { 'Elbow angle': elbow, 'Body line': body } });
    if (!horizontal) {
      out.feedback.push({ msg: 'Get into the push-up position, side-on to the camera', level: 'info' });
      state.armed = false; state.phase = 'ready';
      return out;
    }
    if (!state.armed) {
      if (elbow > s.pushupUpAngle) { state.armed = true; state.phase = 'up'; }
      else { out.feedback.push({ msg: 'Straighten your arms to start', level: 'info' }); return out; }
    }
    // Is the hip below the shoulder–ankle line (sagging) or above it (piking)?
    const lineY = sh.y + ((hip.x - sh.x) / ((ank.x - sh.x) || 1e-6)) * (ank.y - sh.y);
    const sagging = hip.y > lineY;

    if (body < s.pushupBodyLineMin) {
      out.feedback.push({ msg: sagging ? 'Lift your hips, keep your body straight' : 'Lower your hips, keep your body straight', level: 'warn' });
    }
    if (state.phase === 'up' && elbow < s.pushupUpAngle - 15) {
      state.phase = 'down';
      state.rep = { minElbow: elbow, minBody: body, sagging };
    }
    if (state.phase === 'down') {
      const r = state.rep;
      r.minElbow = Math.min(r.minElbow, elbow);
      if (body < r.minBody) { r.minBody = body; r.sagging = sagging; }
      if (elbow <= s.pushupDownAngle) out.feedback.push({ msg: 'Good depth. Push up!', level: 'good' });
      if (elbow > s.pushupUpAngle) {
        state.phase = 'up';
        if (r.minElbow <= s.pushupDownAngle) {
          const faults = [];
          if (r.minBody < s.pushupBodyLineMin) faults.push(r.sagging ? 'Hips sagging' : 'Hips too high');
          finishRep(t, faults, out);
        } else if (r.minElbow <= s.pushupDownAngle + 30) {
          state.partials += 1;
          out.event = 'partial';
          out.faults = ['Not deep enough'];
        }
        state.rep = null;
      }
    }
    return out;
  }

  // ── JUMPING JACKS ──
  function jacks(lm, aspect, t) {
    const ids = [L.nose, L.lShoulder, L.rShoulder, L.lWrist, L.rWrist, L.lAnkle, L.rAnkle];
    const vis = ids.reduce((sum, i) => sum + (lm[i].visibility ?? 1), 0) / ids.length;
    if (vis < s.minVisibility) return result({ visible: false });
    const nose = P(lm, L.nose, aspect);
    const lSh = P(lm, L.lShoulder, aspect), rSh = P(lm, L.rShoulder, aspect);
    const lWr = P(lm, L.lWrist, aspect), rWr = P(lm, L.rWrist, aspect);
    const lAn = P(lm, L.lAnkle, aspect), rAn = P(lm, L.rAnkle, aspect);
    const shoulderW = Math.max(1e-6, dist(lSh, rSh));
    const feet = sm.a.next(dist(lAn, rAn) / shoulderW);
    // arms: 0 = by the sides, 1 = wrists level with the nose or higher
    const shY = (lSh.y + rSh.y) / 2;
    const armOf = (w) => (shY + shoulderW * 0.9 - w.y) / Math.max(1e-6, shY + shoulderW * 0.9 - nose.y);
    const arms = sm.b.next(Math.max(0, Math.min(1.2, Math.min(armOf(lWr), armOf(rWr)))));

    const out = result({ metrics: { 'Feet apart': feet, 'Arms up': arms } });
    const open = feet > s.jackFeetRatio;
    const closed = feet < s.jackFeetRatio * 0.7 && arms < 0.4;

    if (!state.armed) {
      if (closed) { state.armed = true; state.phase = 'closed'; }
      else { out.feedback.push({ msg: 'Stand with feet together and arms down to start', level: 'info' }); return out; }
    }
    if (state.phase === 'closed' && open) {
      state.phase = 'open';
      state.rep = { maxArms: arms };
    }
    if (state.phase === 'open') {
      state.rep.maxArms = Math.max(state.rep.maxArms, arms);
      if (closed) {
        state.phase = 'closed';
        const faults = state.rep.maxArms < 0.9 ? ['Arms not all the way up'] : [];
        finishRep(t, faults, out);
        state.rep = null;
      }
    }
    return out;
  }

  const fn = { squat, pushup, jacks }[type];
  if (!fn) throw new Error('Unknown exercise ' + type);

  return {
    type,
    reset,
    /** @param lm 33 landmarks · @param aspect video width ÷ height · @param t time in ms */
    update(lm, aspect, t) {
      if (!lm || lm.length < 33) return result({ visible: false });
      return fn(lm, aspect, t);
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
};
