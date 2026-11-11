// Loads the AI model and runs it on the camera (or a video file).
// Everything runs inside the browser on this device — no video is uploaded.

import { FilesetResolver, PoseLandmarker } from '../vendor/mediapipe/vision_bundle.mjs';

let landmarkerPromise = null;

/** Load MediaPipe Pose Landmarker (lite) from this website's own files. */
export function loadPoseModel() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const base = new URL('../', import.meta.url);
      const vision = await FilesetResolver.forVisionTasks(new URL('vendor/mediapipe/wasm', base).href);
      const make = (delegate) => PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: new URL('models/pose_landmarker_lite.task', base).href, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try {
        return await make('GPU');
      } catch (e) {
        console.warn('GPU not available, using CPU', e);
        return await make('CPU');
      }
    })();
    landmarkerPromise.catch(() => { landmarkerPromise = null; });
  }
  return landmarkerPromise;
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
 * onResult(landmarks|null, { aspect, t, fps, raw }) is called each time.
 * Returns a stop() function.
 */
export function runLoop(video, landmarker, onResult) {
  let running = true;
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
      try { res = landmarker.detectForVideo(video, ts); } catch (e) { console.error(e); }
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
  NotAllowedError: 'Camera permission was blocked. Allow camera access in your browser settings, then try again.',
  NotFoundError: 'No camera was found on this device. You can use "Use a video file" instead.',
  NotReadableError: 'The camera is being used by another app. Close it and try again.',
  OverconstrainedError: 'This camera mode is not available. Try switching camera.',
};
