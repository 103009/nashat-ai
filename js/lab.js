import { initPage, $, $$, esc, toast } from './ui.js';
import { load, save, remove, getSettings, saveSettings, DEFAULT_SETTINGS } from './store.js';
import { CONFIG } from './config.js';
import { EXERCISES } from './exercises.js';

initPage();

let tests = load('tests', []);
const persist = () => save('tests', tests);

// ── maths ──
/** Rep-count accuracy = 1 − (total counting error ÷ total real reps). */
export function accuracy(list) {
  const real = list.reduce((s, t) => s + t.realReps, 0);
  if (!list.length || real === 0) return null;
  const err = list.reduce((s, t) => s + Math.abs(t.aiReps - t.realReps), 0);
  return Math.max(0, 1 - err / real);
}
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (x) => (x === null ? '–' : Math.round(x * 100) + '%');

function groupBy(list, key) {
  const m = new Map();
  for (const t of list) {
    const k = typeof key === 'function' ? key(t) : t[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(t);
  }
  return m;
}

// ── rendering ──
function renderStats() {
  const acc = accuracy(tests);
  const exact = tests.length ? tests.filter((t) => t.aiReps === t.realReps).length / tests.length : null;
  const ease = avg(tests.map((t) => t.ease).filter(Boolean));
  const useful = avg(tests.map((t) => t.useful).filter(Boolean));
  const people = new Set(tests.map((t) => t.tester.toUpperCase())).size;
  const formTests = tests.filter((t) => Number.isFinite(t.aiGood) && Number.isFinite(t.realGood) && t.realGood + t.aiGood > 0);
  const formAgree = formTests.length
    ? 1 - formTests.reduce((s, t) => s + Math.abs(t.aiGood - t.realGood), 0) / Math.max(1, formTests.reduce((s, t) => s + Math.max(t.aiGood, t.realGood), 0))
    : null;
  const tiles = [
    [tests.length, `Tests logged (${people} people)`],
    [pct(acc), 'Rep-count accuracy'],
    [pct(exact), 'Sets counted exactly right'],
    [formAgree === null ? '–' : pct(formAgree), 'Form check agrees with a person'],
    [ease === null ? '–' : ease.toFixed(1) + '/5', 'Ease of use'],
    [useful === null ? '–' : useful.toFixed(1) + '/5', 'Feedback helpfulness'],
  ];
  $('#stats').innerHTML = tiles.map(([v, k]) => `<div class="card stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
}

function bars(el, groups, labelFn = (k) => k) {
  if (!groups.size) { el.innerHTML = '<p class="muted small">No tests yet.</p>'; return; }
  el.innerHTML = [...groups.entries()].map(([k, list]) => {
    const a = accuracy(list);
    const w = a === null ? 0 : Math.round(a * 100);
    const label = `${labelFn(k)}: ${pct(a)} accuracy from ${list.length} test${list.length === 1 ? '' : 's'}`;
    return `<div class="chart-row" title="${esc(label)}">
      <span>${esc(labelFn(k))} <span class="muted small">(${list.length})</span></span>
      <div class="chart-track" role="img" aria-label="${esc(label)}"><div class="chart-fill" style="width:${w}%"></div></div>
      <strong class="num" style="text-align:right">${pct(a)}</strong></div>`;
  }).join('');
}

function renderCharts() {
  const byVersion = new Map([...groupBy(tests, 'version').entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true })));
  bars($('#chart-version'), byVersion, (k) => 'v' + k);
  bars($('#chart-ex'), groupBy(tests, 'exercise'), (k) => EXERCISES[k]?.name || k);
  const cond = new Map();
  for (const [k, v] of groupBy(tests, 'light')) cond.set('Light: ' + k, v);
  for (const [k, v] of groupBy(tests, 'view')) cond.set('View: ' + k, v);
  for (const [k, v] of groupBy(tests, 'cloth')) cond.set('Clothes: ' + k, v);
  bars($('#chart-cond'), cond);
}

function renderTable() {
  const body = $('#tests-body');
  if (!tests.length) { body.innerHTML = '<tr><td colspan="13" class="muted">No tests yet. Log your first one above.</td></tr>'; return; }
  body.innerHTML = tests.map((t, i) => {
    const err = t.aiReps - t.realReps;
    return `<tr>
      <td>${esc(t.tester)}</td><td>${esc(EXERCISES[t.exercise]?.name || t.exercise)}</td><td>v${esc(t.version)}</td>
      <td class="num">${t.aiReps}</td><td class="num">${t.realReps}</td>
      <td class="num">${err > 0 ? '+' : ''}${err}</td>
      <td>${esc(t.view)}</td><td>${esc(t.light)}</td><td>${esc(t.cloth)}</td>
      <td class="num">${t.ease ?? '–'}</td><td class="num">${t.useful ?? '–'}</td>
      <td style="white-space:normal;min-width:180px">${esc(t.notes)}</td>
      <td><button class="btn btn-sm btn-ghost" data-del="${i}" type="button" aria-label="Delete test ${esc(t.tester)}">Delete</button></td></tr>`;
  }).join('');
}

function renderAll() { renderStats(); renderCharts(); renderTable(); }

$('#tests-body').addEventListener('click', (e) => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  if (!confirm('Delete this test?')) return;
  tests.splice(Number(b.dataset.del), 1);
  persist(); renderAll();
});

// ── form ──
function nextTesterCode() {
  const n = tests.reduce((m, t) => Math.max(m, Number(String(t.tester).replace(/\D/g, '')) || 0), 0) + 1;
  return 'T' + String(n).padStart(2, '0');
}
function resetForm() {
  $('#test-form').reset();
  $('#f-tester').value = nextTesterCode();
  $('#prefill-note').textContent = '';
}
resetForm();

const pending = load('pendingTest', null);
if (pending) {
  $('#f-ex').value = pending.exercise;
  $('#f-ai').value = pending.reps;
  $('#f-aigood').value = pending.goodReps;
  $('#prefill-note').textContent = `Filled in from your last AI coach session (${pending.reps} reps counted). Now enter the real count.`;
  remove('pendingTest');
  if (location.hash === '#new') setTimeout(() => $('#f-real').focus(), 300);
}

const radio = (name) => $(`input[name="${name}"]:checked`)?.value;
const intOrNull = (v) => (v === '' || v === null ? null : Number.parseInt(v, 10));

$('#test-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const t = {
    tester: $('#f-tester').value.trim(),
    exercise: $('#f-ex').value,
    aiReps: intOrNull($('#f-ai').value),
    realReps: intOrNull($('#f-real').value),
    aiGood: intOrNull($('#f-aigood').value),
    realGood: intOrNull($('#f-realgood').value),
    view: radio('view'), light: radio('light'), cloth: radio('cloth'), device: radio('device'),
    ease: intOrNull($('#f-ease').value), useful: intOrNull($('#f-useful').value), again: $('#f-again').value || null,
    notes: $('#f-notes').value.trim(),
    version: CONFIG.appVersion,
    at: new Date().toISOString(),
  };
  const errors = [];
  if (!t.tester) errors.push('Add a tester code.');
  if (!Number.isFinite(t.aiReps) || t.aiReps < 0) errors.push('Enter the reps the AI counted.');
  if (!Number.isFinite(t.realReps) || t.realReps < 0) errors.push('Enter the real number of reps.');
  if (!$('#f-consent').checked) errors.push('Tick the consent box. Only test people who agreed.');
  $('#form-error').textContent = errors.join(' ');
  if (errors.length) return;
  tests.unshift(t);
  persist();
  renderAll();
  resetForm();
  toast('Test saved.', 'good');
});

// ── export / import ──
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const COLS = ['tester', 'exercise', 'version', 'aiReps', 'realReps', 'aiGood', 'realGood', 'view', 'light', 'cloth', 'device', 'ease', 'useful', 'again', 'notes', 'at'];
const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
$('#export-csv').addEventListener('click', () => {
  const csv = [COLS.join(','), ...tests.map((t) => COLS.map((c) => csvCell(t[c])).join(','))].join('\n');
  download(`nashat-tests-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
});
$('#export-json').addEventListener('click', () => {
  download(`nashat-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ tests, settings: getSettings() }, null, 2), 'application/json');
});
$('#import-json').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const incoming = Array.isArray(data) ? data : data.tests;
    if (!Array.isArray(incoming)) throw new Error('No tests in file');
    const key = (t) => `${t.tester}|${t.at}|${t.aiReps}|${t.realReps}`;
    const have = new Set(tests.map(key));
    const added = incoming.filter((t) => t && Number.isFinite(t.aiReps) && Number.isFinite(t.realReps) && !have.has(key(t)));
    tests = [...added, ...tests];
    persist(); renderAll();
    toast(`Imported ${added.length} new test${added.length === 1 ? '' : 's'}.`, 'good');
  } catch {
    toast('That file is not a Nashat backup.', 'warn');
  }
});
$('#clear').addEventListener('click', () => {
  if (!tests.length) return;
  if (!confirm(`Delete all ${tests.length} tests from this device? Export a backup first if you need them.`)) return;
  tests = []; persist(); renderAll();
});

// ── tuning ──
const SLIDERS = [
  ['squatDownAngle', 'Squat: full-depth knee angle', 70, 130, 1, '°'],
  ['squatPartialAngle', 'Squat: "go lower" knee angle', 100, 150, 1, '°'],
  ['squatLeanMax', 'Squat: max torso lean', 25, 70, 1, '°'],
  ['pushupDownAngle', 'Push-up: bottom elbow angle', 60, 120, 1, '°'],
  ['pushupBodyLineMin', 'Push-up: straight body (min)', 130, 175, 1, '°'],
  ['jackFeetRatio', 'Jumping jack: feet apart (× shoulder width)', 1.0, 2.5, 0.05, '×'],
  ['minVisibility', 'Min AI confidence a joint is visible', 0.2, 0.9, 0.05, ''],
  ['smoothing', 'Smoothing (higher = steadier, slower)', 0, 0.9, 0.05, ''],
];
function renderSliders(s) {
  $('#cur-version').textContent = 'v' + CONFIG.appVersion;
  $('#sliders').innerHTML = SLIDERS.map(([k, label, min, max, step, unit]) => `
    <div class="field">
      <label for="s-${k}">${label}: <span id="v-${k}">${s[k]}${unit}</span></label>
      <input type="range" id="s-${k}" data-key="${k}" data-unit="${unit}" min="${min}" max="${max}" step="${step}" value="${s[k]}">
      <p class="hint">Default ${DEFAULT_SETTINGS[k]}${unit}</p>
    </div>`).join('');
}
renderSliders(getSettings());
$('#sliders').addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.key) $(`#v-${el.dataset.key}`).textContent = el.value + el.dataset.unit;
});
$('#save-settings').addEventListener('click', () => {
  const s = getSettings();
  $$('#sliders input').forEach((el) => { s[el.dataset.key] = Number(el.value); });
  saveSettings(s);
  toast('Settings saved. The coach will use them next time you press Start.', 'good');
});
$('#reset-settings').addEventListener('click', () => {
  const s = { ...DEFAULT_SETTINGS, voice: getSettings().voice };
  saveSettings(s); renderSliders(s);
  toast('Back to default settings.');
});

renderAll();
if (location.hash === '#new') $('#new').scrollIntoView();
