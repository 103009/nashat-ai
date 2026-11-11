// Small wrapper around localStorage. Everything the app saves stays on this device.
const PREFIX = 'nashat.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or blocked (private mode) — app still works, just doesn't remember */
  }
}

export function remove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}

// Tunable AI-rule settings. Change them in the Test Lab after user testing.
export const DEFAULT_SETTINGS = {
  squatDownAngle: 100,      // knee angle (°) of a full-depth squat (side view)
  squatLeanMax: 50,         // max forward lean of the torso (°) at the bottom
  pushupDownAngle: 90,      // elbow angle (°) at the bottom of a push-up
  pushupBodyLineMin: 155,   // shoulder–hip–ankle angle (°) for a straight body
  jackFeetRatio: 1.5,       // ankle gap ÷ shoulder width that counts as "feet apart"
  goodDepth: 0.8,           // how deep (0–1) a rep must go to count as good form
  minVisibility: 0.5,       // how sure the AI must be that a joint is visible (0–1)
  smoothing: 0.35,          // 0 = no smoothing, 0.9 = very smooth but slower
  voice: true,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...load('settings', {}) };
}

export function saveSettings(s) {
  save('settings', s);
}
