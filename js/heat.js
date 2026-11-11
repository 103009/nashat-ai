// Heat-stress logic. NOTE: this part is NOT AI — it is a published formula
// (US National Weather Service heat index) plus safety rules. The AI part of
// Nashat is the pose detection in the coach.

import { CONFIG } from './config.js';

const cToF = (c) => c * 9 / 5 + 32;
const fToC = (f) => (f - 32) * 5 / 9;

/** NWS heat index (Rothfusz regression with adjustments). Inputs/outputs in °C. */
export function heatIndexC(tempC, rh) {
  const T = cToF(tempC);
  const R = Math.max(0, Math.min(100, rh));
  let hi = 0.5 * (T + 61 + (T - 68) * 1.2 + R * 0.094);
  if ((hi + T) / 2 >= 80) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
      - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R
      + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
    if (R < 13 && T >= 80 && T <= 112) {
      hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (R > 85 && T >= 80 && T <= 87) {
      hi += ((R - 85) / 10) * ((87 - T) / 5);
    }
  }
  return fToC(hi);
}

// NWS categories, in °C.
export const LEVELS = [
  { id: 0, key: 'ok',      name: 'Lower risk',       min: -Infinity, color: 'var(--lvl-0)' },
  { id: 1, key: 'caution', name: 'Caution',          min: 27,        color: 'var(--lvl-1)' },
  { id: 2, key: 'xcaution',name: 'Extreme caution',  min: 32,        color: 'var(--lvl-2)' },
  { id: 3, key: 'danger',  name: 'Danger',           min: 41,        color: 'var(--lvl-3)' },
  { id: 4, key: 'xdanger', name: 'Extreme danger',   min: 54,        color: 'var(--lvl-4)' },
];

export function levelFor(hiC) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) if (hiC >= l.min) lvl = l;
  return lvl;
}

// Sun exposure can add up to ~8 °C (15 °F) to the heat index (NWS).
export const SUN_BONUS_C = 8;

const BASE_PLANS = [
  { sets: 3, reps: 12, restSec: 45,  maxMinutes: 30, waterEveryMin: 20, place: 'Outdoors is fine' },
  { sets: 3, reps: 10, restSec: 60,  maxMinutes: 25, waterEveryMin: 15, place: 'Shade preferred' },
  { sets: 2, reps: 10, restSec: 90,  maxMinutes: 20, waterEveryMin: 10, place: 'Shade or indoors only' },
  { sets: 2, reps: 8,  restSec: 120, maxMinutes: 15, waterEveryMin: 10, place: 'Indoors with air-conditioning only' },
  { sets: 1, reps: 8,  restSec: 120, maxMinutes: 10, waterEveryMin: 10, place: 'Indoors with air-conditioning only' },
];

/**
 * Build a workout plan from the conditions.
 * @param {{tempC:number, rh:number, inSun:boolean, fasting:boolean}} input
 */
export function makePlan({ tempC, rh, inSun, fasting }) {
  const hi = heatIndexC(tempC, rh) + (inSun ? SUN_BONUS_C : 0);
  const level = levelFor(hi);
  const p = { ...BASE_PLANS[level.id] };
  const tips = [];

  if (level.id >= 3) tips.push('Do not exercise outdoors right now. Train inside with air-conditioning, or move your session to a cooler time.');
  if (level.id === 2) tips.push('Avoid direct sun. Wear light, loose clothing and stop at the first sign of dizziness or headache.');
  if (level.id === 1) tips.push('Take your rest breaks in the shade and sip water between sets.');

  if (fasting) {
    p.reps = Math.max(5, Math.round(p.reps * 0.7));
    p.sets = Math.max(1, p.sets - (p.sets > 2 ? 1 : 0));
    p.restSec += 30;
    p.maxMinutes = Math.min(p.maxMinutes, 20);
    p.waterEveryMin = null; // can't drink while fasting
    if (level.id >= 1) p.place = 'Indoors with air-conditioning only';
    tips.push('Fasting: keep it light. Best times are a short session about 1 hour before iftar, or 1.5–2 hours after iftar once you have had water and food.');
  }

  tips.push('Stop straight away if you feel dizzy, sick, confused or stop sweating. These are warning signs of heat illness. Get help.');

  return { heatIndexC: hi, level, ...p, fasting: !!fasting, inSun: !!inSun, tempC, rh, tips, createdAt: Date.now() };
}

export const DEFAULT_PLAN = makePlan({ tempC: 24, rh: 50, inSun: false, fasting: false });

/** Live weather + hourly forecast from Open-Meteo (free, no key). */
export async function fetchWeather() {
  const { latitude, longitude, timezone } = CONFIG.location;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
    + `&current=temperature_2m,relative_humidity_2m&hourly=temperature_2m,relative_humidity_2m`
    + `&forecast_days=2&timezone=${encodeURIComponent(timezone)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('Weather service error ' + res.status);
    const d = await res.json();
    const now = { tempC: d.current.temperature_2m, rh: d.current.relative_humidity_2m, time: d.current.time };
    const currentHour = d.current.time.slice(0, 13); // "YYYY-MM-DDTHH"
    let start = d.hourly.time.findIndex((t) => t.slice(0, 13) === currentHour);
    if (start < 0) start = 0;
    const hours = [];
    for (let i = start; i < Math.min(start + 24, d.hourly.time.length); i++) {
      const tempC = d.hourly.temperature_2m[i];
      const rh = d.hourly.relative_humidity_2m[i];
      const hi = heatIndexC(tempC, rh);
      hours.push({ time: d.hourly.time[i], tempC, rh, hi, level: levelFor(hi) });
    }
    return { now, hours };
  } finally {
    clearTimeout(timer);
  }
}

/** The coolest hour in the next 24 h, between 05:00 and 22:00. */
export function bestHour(hours) {
  const awake = hours.filter((h) => {
    const hr = Number(h.time.slice(11, 13));
    return hr >= 5 && hr <= 22;
  });
  const pool = awake.length ? awake : hours;
  return pool.reduce((best, h) => (best === null || h.hi < best.hi ? h : best), null);
}
