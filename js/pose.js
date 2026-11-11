// Loads the AI model and runs it on the camera (or a video file).
// Everything runs inside the browser on this device — no video is uploaded.

import { FilesetResolver, PoseLandmarker } from '../vendor/mediapipe/vision_bundle.mjs';

const cache = {};             // one loaded model per engine ('GPU' / 'CPU')
export const modelInfo = { delegate: null, loadMs: null, error: null };

function withTimeout(promise, ms, msg) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); })])
    .finally(() => clearTimeout(t));
}

/**
 * Load MediaPipe Pose Landmarker (lite) from this website's own files.
 * engine: 'auto' (try GPU, fall back to CPU), 'GPU' or 'CPU'.
 */
export function loadPoseModel(engine = 'auto') {
  const key = engine === 'auto' ? 'auto' : engine;
  if (!cache[key]) {
    cache[key] = (async () => {
      const t0 = performance.now();
      const base = new URL('../', import.meta.url);
      const vision = await withTimeout(
        FilesetResolver.forVisionTasks(new URL('vendor/mediapipe/wasm', base).href),
        60000, 'The AI engine took too long to download. Check the internet connection and try again.');
      const make = (delegate) => withTimeout(PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: new URL('models/pose_landmarker_lite.task', base).href, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }), 60000, 'The AI model took too long to load. Check the internet connection and try again.');
      let landmarker, delegate;
      if (engine === 'CPU') { landmarker = await make('CPU'); delegate = 'CPU'; }
      else {
        try { landmarker = await make('GPU'); delegate = 'GPU'; }
        catch (e) {
          if (engine === 'GPU') throw e;
          console.warn('GPU engine not available, using CPU', e);
          landmarker = await make('CPU'); delegate = 'CPU';
        }
      }
      Object.assign(modelInfo, { delegate, loadMs: Math.round(performance.now() - t0), error: null });
      landmarker.__delegate = delegate;
      return landmarker;
    })();
    cache[key].catch((e) => { modelInfo.error = e.message || String(e); delete cache[key]; });
  }
  return cache[key];
}

/** Start the camera in a <video>. facing: 'user' (selfie) or 'environment' (back). */
export async function startCamera(video, facing = 'user') {
  stopVideo(video);
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot use the camera. The site must be opened over https:// (or localhost).');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return stream;
}

/** Play a video file the user picked (backup for the live demo). */
export async function startFile(video, file) {
  stopVideo(video);
  video.src = URL.createObjectURL(file);
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  await video.play();
}

export function stopVideo(video) {
  const s = video.srcObject;
  if (s) s.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
  if (video.src) { URL.revokeObjectURL(video.src); video.removeAttribute('src'); video.load(); }
}

/**
 * Run the model on every new video frame.
 * onResult(landmarks|null, { aspect, t, fps }) is called each time.
 * onError(error) is called if the model keeps failing (e.g. a broken GPU engine).
 * Returns a stop() function.
 */
export function runLoop(video, landmarker, onResult, onError) {
  let running = true;
  let errors = 0;
  let lastVideoTime = -1;
  let lastTs = 0;
  let frames = 0, fpsT = performance.now(), fps = 0;

  const tick = () => {
    if (!running) return;
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime && video.videoWidth) {
      lastVideoTime = video.currentTime;
      let ts = performance.now();
      if (ts <= lastTs) ts = lastTs + 1; // timestamps must always increase
      lastTs = ts;
      let res = null;
      try { res = landmarker.detectForVideo(video, ts); errors = 0; }
      catch (e) {
        console.error(e);
        if (++errors === 5 && onError) { running = false; onError(e); return; }
      }
      frames++;
      if (ts - fpsT > 1000) { fps = (frames * 1000) / (ts - fpsT); frames = 0; fpsT = ts; }
      const lm = res?.landmarks?.[0] ?? null;
      onResult(lm, { aspect: video.videoWidth / video.videoHeight, t: ts, fps });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => { running = false; };
}

// Skeleton lines between landmarks (body only, no face/hand detail).
const BONES = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 31], [28, 32], [27, 29], [28, 30],
];

/** Draw the skeleton on a canvas that sits on top of the video. */
export function drawSkeleton(canvas, video, lm, { color = '#F97316', showAll = false, highlight = [] } = {}) {
  const w = video.videoWidth || 640, h = video.videoHeight || 480;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (!lm) return;
  const r = Math.max(3, w / 140);
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, w / 160);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  for (const [a, b] of BONES) {
    if ((lm[a].visibility ?? 1) < 0.4 || (lm[b].visibility ?? 1) < 0.4) continue;
    ctx.beginPath();
    ctx.moveTo(lm[a].x * w, lm[a].y * h);
    ctx.lineTo(lm[b].x * w, lm[b].y * h);
    ctx.stroke();
  }
  const points = showAll ? lm.map((_, i) => i) : [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (const i of points) {
    const p = lm[i];
    if ((p.visibility ?? 1) < 0.4) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, highlight.includes(i) ? r * 1.8 : r, 0, Math.PI * 2);
    ctx.fillStyle = highlight.includes(i) ? '#22C55E' : color;
    ctx.fill();
  }
}

export const CAMERA_HELP = {
  NotAllowedError: 'Camera access is blocked. In Brave/Chrome, click the camera or lock icon at the right of the address bar, set Camera to Allow, then reload. On Windows also check Settings → Privacy & security → Camera → allow apps and desktop apps.',
  SecurityError: 'Camera access is blocked for this page. Open the site through its https:// link, not as a file.',
  NotFoundError: 'No camera was found. Plug in a webcam (or check Windows Settings → Privacy & security → Camera), or use "Use a video file" instead.',
  NotReadableError: 'The camera is busy or blocked. Close other apps using it (Zoom, Teams, Camera app) and try again.',
  AbortError: 'The camera could not start. Close other apps using it and try again.',
  OverconstrainedError: 'This camera mode is not available. Try "Switch camera".',
};
