# Nashat (نشاط): heat-smart AI exercise coach

AI Symposium 2027 · Hawar International School · Field: **Sport**
Team: Saqer Alnoaimi, Ahmed Alathem, Ahmed Alkhaldi, Mohammed Alashraaf, Saif Buhindi

A website that uses the phone camera and an on-device pose-detection AI
(MediaPipe Pose Landmarker) to count reps, check exercise form and give voice
feedback. It also plans a safe workout from Bahrain's live heat index.

## Pages

| Page | What it does |
|---|---|
| `index.html` | Home: the problem and the solution |
| `heat.html` | Live Manama weather → heat index → safe plan; 24-hour forecast; fasting mode |
| `coach.html` | **The AI coach**: camera + pose AI, rep counting, form feedback, sets, rest, heat time limit |
| `how.html` | Live view of the AI's 33 landmarks + how it works, what it can and can't do |
| `lab.html` | Test Lab: log real user tests, work out accuracy, export CSV, tune the AI rules |
| `team.html` | Team, ethics statement, privacy, QR code, credits |

## Edit this first

Open `js/config.js` and fill in:
- `teamNumber`
- each member's `role`
- `ethicsStatement`: your own words
- `siteUrl`: your public link, once the site is online
- `appVersion`: raise it each time you improve the app after testing

## Put it online (free, needs HTTPS for the camera)

**Option A: Netlify Drop (easiest, about 2 minutes)**
1. Go to https://app.netlify.com/drop and log in.
2. Drag the whole `nashat-ai` folder onto the page.
3. You get a link like `https://something.netlify.app`. Rename it in Site settings.
4. Put that link into `siteUrl` in `js/config.js`, then drag the folder again to update.

**Option B: GitHub Pages**
1. Create a public GitHub repository and upload everything in this folder.
2. Settings → Pages → Branch: `main`, folder `/ (root)` → Save.
3. Your link is `https://<username>.github.io/<repo>/`.

The camera only works over `https://` (or `localhost`). Opening `index.html`
straight from your computer's files will **not** work, because browsers block
modules and the camera there.

## Run it on your own computer

```bash
cd nashat-ai
python3 -m http.server 8000
```

Then open http://localhost:8000.

## How the code is organised

```
js/config.js     team settings (edit me)
js/pose.js       loads the AI model, runs it on each camera frame, draws the skeleton
js/exercises.js  turns the 33 landmarks into angles; rep counting + form rules
js/heat.js       heat index formula (NWS), risk levels, workout plan, weather API
js/coach.js      the coach page: sets, rest, timers, voice, summary
js/lab.js        test logging, accuracy maths, CSV export, tuning sliders
js/store.js      saves data in the browser (localStorage); default AI-rule settings
js/ui.js         navigation, footer, voice, small helpers
vendor/          MediaPipe runtime (Apache 2.0) + QR generator (MIT), served locally
models/          pose_landmarker_lite.task: the trained AI model (about 6 MB)
```

Everything the AI needs is bundled in the site, so it does not depend on outside
CDNs at the symposium. Only the live weather button and the Google font need internet.

## Credits

MediaPipe Pose Landmarker © Google (Apache 2.0) · Open-Meteo weather (CC BY 4.0) ·
qrcode-generator © Kazuhiko Arase (MIT) · Barlow fonts (SIL OFL) · Lucide-style icons (ISC).
Built with coding help from Claude (Anthropic), as the symposium rules allow.
