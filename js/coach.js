import { initPage, $, $$, speak, toast, fmtTime, esc } from './ui.js';
import { loadPoseModel, startCamera, startFile, stopVideo, runLoop, drawSkeleton, CAMERA_HELP } from './pose.js';
import { createAnalyzer, EXERCISES, CUES } from './exercises.js';
import { DEFAULT_PLAN } from './heat.js';
import { load, save, getSettings, saveSettings } from './store.js';

initPage();

const video = $('#video');
const canvas = $('#overlay');
const stage = $('#stage');
const plan = load('plan', DEFAULT_PLAN);

let exercise = load('lastExercise', 'squat');
let facing = 'user';
let source = 'camera';
let stopLoop = null;
let session = null;

// ── plan panel ──
function planText() {
  if ($('#free-mode').checked) return 'Free count: the coach just counts reps with no set target. Use this when testing accuracy.';
  const water = plan.waterEveryMin ? `, water reminder every ${plan.waterEveryMin} min` : '';
  return `${plan.sets} sets × ${plan.reps} reps, ${plan.restSec}s rest, max ${plan.maxMinutes} min${water}. ` +
    `Heat index ${Math.round(plan.heatIndexC)} °C (${plan.level.name})${plan.fasting ? ', fasting mode' : ''}.`;
}
function refreshPlan() {
  $('#plan-text').textContent = planText();
  const lvl = plan.level?.id ?? 0;
  const warn = $('#heat-warning');
  if (lvl >= 3 || (plan.fasting && lvl >= 1)) {
    $('#heat-warning-text').innerHTML = `<strong>${esc(plan.level.name)} heat (${Math.round(plan.heatIndexC)} °C).</strong> Only train indoors with air-conditioning. The plan has been made shorter and easier.`;
    warn.classList.remove('hidden');
  } else warn.classList.add('hidden');
}
$('#free-mode').checked = load('freeMode', false);
$('#free-mode').addEventListener('change', () => { save('freeMode', $('#free-mode').checked); refreshPlan(); resetCounters(); });
refreshPlan();

// ── exercise picker ──
function selectExercise(id) {
  exercise = id;
  save('lastExercise', id);
  $$('#pick button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ex === id)));
  $('#setup-text').textContent = EXERCISES[id].setup;
  if (session) { endSession(false); beginSession(); }
}
$$('#pick button').forEach((b) => b.addEventListener('click', () => selectExercise(b.dataset.ex)));
selectExercise(exercise);

// ── voice toggle ──
function refreshVoice() {
  const on = getSettings().voice;
  $('#voice-btn').textContent = `Voice: ${on ? 'on' : 'off'}`;
  $('#voice-btn').setAttribute('aria-pressed', String(on));
}
$('#voice-btn').addEventListener('click', () => {
  const s = getSettings(); s.voice = !s.voice; saveSettings(s); refreshVoice();
  if (!s.voice) window.speechSynthesis?.cancel();
});
refreshVoice();

// ── UI helpers ──
function setCue(msg, level = 'info') {
  const c = $('#cue');
  if (c.textContent !== msg) c.textContent = msg;
  c.className = `cue ${level}`;
}
function flash(kind) {
  const f = $('#flash');
  f.className = 'rep-flash';
  void f.offsetWidth;
  f.className = `rep-flash go-${kind}`;
}
function resetCounters() {
  $('#c-reps').textContent = '0'; $('#c-good').textContent = '0'; $('#c-total').textContent = '0';
  $('#hud-set').textContent = $('#free-mode').checked ? 'Free count' : `Set 1/${plan.sets}`;
}
function status(msg) { $('#status').textContent = msg; }

// ── session ──
function beginSession() {
  const free = $('#free-mode').checked;
  session = {
    exercise, free, startedAt: performance.now(), activeMs: 0, lastT: null,
    set: 1, setsTotal: free ? Infinity : plan.sets, target: free ? Infinity : plan.reps,
    analyzer: createAnalyzer(exercise, getSettings()),
    done: { reps: 0, goodReps: 0, partials: 0, faults: {} },
    resting: false, restEnd: 0, lastWaterAt: 0, lastSeen: 0, ended: false,
  };
  resetCounters();
  $('#summary').classList.add('hidden');
  speak(`${EXERCISES[exercise].name}. ${free ? 'Free count.' : `Set 1 of ${plan.sets}. ${plan.reps} reps.`}`, { force: true });
}

function bankSet() {
  const s = session.analyzer.summary();
  session.done.reps += s.reps;
  session.done.goodReps += s.goodReps;
  session.done.partials += s.partials;
  for (const [k, v] of Object.entries(s.faults)) session.done.faults[k] = (session.done.faults[k] || 0) + v;
}

function totals() {
  const s = session.analyzer.summary();
  const faults = { ...session.done.faults };
  for (const [k, v] of Object.entries(s.faults)) faults[k] = (faults[k] || 0) + v;
  return {
    reps: session.done.reps + s.reps,
    goodReps: session.done.goodReps + s.goodReps,
    partials: session.done.partials + s.partials,
    faults,
  };
}

function startRest() {
  bankSet();
  session.resting = true;
  session.restEnd = performance.now() + plan.restSec * 1000;
  $('#rest-next').textContent = String(session.set + 1);
  $('#rest').classList.add('show');
  speak(`Set complete. Rest ${plan.restSec} seconds.`, { force: true });
}

function endRest() {
  session.resting = false;
  session.set += 1;
  session.analyzer = createAnalyzer(exercise, getSettings());
  $('#rest').classList.remove('show');
  $('#c-reps').textContent = '0';
  $('#hud-set').textContent = `Set ${session.set}/${plan.sets}`;
  speak(`Set ${session.set}. Go!`, { force: true });
}
$('#skip-rest').addEventListener('click', () => session?.resting && endRest());

function endSession(showSummary = true, reason = '') {
  if (!session || session.ended) return;
  session.ended = true;
  const t = totals();
  const result = {
    exercise: session.exercise, reps: t.reps, goodReps: t.goodReps, partials: t.partials, faults: t.faults,
    durationSec: Math.round(session.activeMs / 1000), source, at: Date.now(),
  };
  $('#rest').classList.remove('show');
  if (showSummary) {
    $('#s-reps').textContent = t.reps;
    $('#s-form').textContent = t.reps ? Math.round((100 * t.goodReps) / t.reps) + '%' : '–';
    $('#s-partial').textContent = t.partials;
    $('#s-time').textContent = fmtTime(result.durationSec);
    const f = Object.entries(t.faults).sort((a, b) => b[1] - a[1]);
    $('#s-faults').innerHTML = f.length
      ? '<strong>Work on:</strong> ' + f.map(([k, v]) => `${esc(k)} (${v}×)`).join(', ')
      : (t.reps ? '<strong>Great form on every counted rep!</strong>' : '');
    $('#summary').classList.remove('hidden');
    save('lastSession', result);
    const hist = load('sessions', []); hist.unshift(result); save('sessions', hist.slice(0, 50));
    if (reason) speak(reason, { force: true });
    else speak(`Workout finished. ${t.reps} reps, ${t.goodReps} with good form.`, { force: true });
  }
  session = null;
}

$('#log-btn').addEventListener('click', () => {
  save('pendingTest', load('lastSession', null));
  location.href = 'lab.html#new';
});

// ── per-frame handling ──
function onFrame(lm, { aspect, t }) {
  drawSkeleton(canvas, video, lm);
  if (!session) return;

  if (session.lastT !== null && !session.resting) session.activeMs += Math.min(1000, t - session.lastT);
  session.lastT = t;
  $('#hud-time').textContent = fmtTime(session.activeMs / 1000);

  if (session.resting) {
    const left = (session.restEnd - t) / 1000;
    $('#rest-num').textContent = Math.max(0, Math.ceil(left));
    if (left <= 0) endRest();
    return;
  }

  // Heat limits (not in free-count mode)
  if (!session.free) {
    const mins = session.activeMs / 60000;
    if (mins >= plan.maxMinutes) {
      endSession(true, `That's your safe limit of ${plan.maxMinutes} minutes for today's heat. Cool down and drink water.`);
      return;
    }
    if (plan.waterEveryMin && mins - session.lastWaterAt >= plan.waterEveryMin) {
      session.lastWaterAt = mins;
      toast('Water break: take a few sips.', 'warn');
      speak('Water break. Take a few sips.', { force: true });
    }
  }

  if (!lm) { setCue('Step into the frame', 'info'); return; }
  const r = session.analyzer.update(lm, aspect, t);
  if (!r.visible) { setCue('Step back: I need to see your whole body', 'info'); return; }

  $('#metrics').innerHTML = Object.entries(r.metrics)
    .map(([k, v]) => `<div><span class="muted">${k}</span><strong>${k.includes('angle') || k.includes('lean') || k.includes('line') ? Math.round(v) + '°' : v.toFixed(2)}</strong></div>`).join('');

  const tot = totals();
  $('#c-reps').textContent = r.reps;
  $('#c-good').textContent = tot.goodReps;
  $('#c-total').textContent = tot.reps;

  if (r.event === 'rep') {
    flash(r.repGood ? 'good' : 'warn');
    if (r.repGood) { setCue(`Rep ${r.reps}: good form`, 'good'); speak(String(r.reps)); }
    else { setCue(`Rep ${r.reps}: ${CUES[r.faults[0]]}`, 'warn'); speak(`${r.reps}. ${CUES[r.faults[0]]}`); }
    if (r.reps >= session.target) {
      if (session.set >= session.setsTotal) { bankSet(); endSessionAfterSets(); }
      else startRest();
    }
    return;
  }
  if (r.event === 'partial') {
    flash('warn');
    setCue('Not counted: go a bit lower', 'warn');
    speak('Go a bit lower');
    return;
  }
  if (r.feedback.length) {
    const f = r.feedback.find((x) => x.level === 'warn') || r.feedback[0];
    setCue(f.msg, f.level);
    if (f.level === 'warn') speak(f.msg);
  }
}

function endSessionAfterSets() {
  // all sets complete: the last set is already banked, so swap in an empty analyser
  session.analyzer = createAnalyzer(exercise, getSettings());
  endSession(true, 'Workout complete. Great job! Cool down and drink water.');
  setCue('Workout complete!', 'good');
}

// ── start / stop ──
async function start(kind, file) {
  $('#start-btn').disabled = true;
  status('Loading the AI model (about 6 MB the first time)…');
  setCue('');
  try {
    const modelP = loadPoseModel();
    if (kind === 'file') { source = 'video file'; await startFile(video, file); stage.classList.remove('mirror'); }
    else { source = 'camera'; await startCamera(video, facing); stage.classList.toggle('mirror', facing === 'user'); }
    const landmarker = await modelP;
    $('#empty').classList.add('hidden');
    $('#stop-btn').classList.remove('hidden');
    status(`AI model ready. Running on this device (${kind === 'file' ? 'video file' : 'camera'}).`);
    stopLoop?.();
    stopLoop = runLoop(video, landmarker, onFrame);
    beginSession();
  } catch (e) {
    console.error(e);
    const msg = CAMERA_HELP[e.name] || e.message || 'Something went wrong starting the coach.';
    status(msg);
    toast(msg, 'warn');
  } finally {
    $('#start-btn').disabled = false;
  }
}

function stopAll() {
  endSession(true);
  stopLoop?.(); stopLoop = null;
  stopVideo(video);
  drawSkeleton(canvas, video, null);
  $('#empty').classList.remove('hidden');
  $('#stop-btn').classList.add('hidden');
  $('#start-btn').textContent = 'Start again';
  setCue('');
  status('Stopped. Camera is off.');
}

$('#start-btn').addEventListener('click', () => start('camera'));
$('#stop-btn').addEventListener('click', stopAll);
$('#flip-btn').addEventListener('click', () => {
  facing = facing === 'user' ? 'environment' : 'user';
  if (stopLoop && source === 'camera') start('camera');
  else toast(`Will use the ${facing === 'user' ? 'front' : 'back'} camera.`);
});
$('#file-input').addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (f) start('file', f);
  e.target.value = '';
});
document.addEventListener('visibilitychange', () => { if (document.hidden && stopLoop) stopAll(); });

// Load the model in the background so "Start" is quick.
loadPoseModel().then(() => status('AI model loaded and ready.')).catch(() => status('The AI model will load when you press Start.'));
