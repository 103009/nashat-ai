# Nashat team kit

The symposium rules (guide, page 5) say you **may** use AI to build the website,
but you may **not** submit AI-written text as your own words in the **proposal,
ethics statement, brochure or pitch**. So this kit gives you outlines, questions
to answer and facts to check. **The sentences must be yours.** Judges will ask
questions, and you can only answer well if you wrote it and understand it.

---

## 0. Two-week plan for Nashat

| When | Do | Who leads |
|---|---|---|
| Day 1–2 | Agree roles, write and submit the proposal (§1) | Project Lead |
| Day 2 | Put the site online (README), fill in `js/config.js`, test on 3 phones | AI / Tech Lead |
| Day 3–6 | Round 1 testing: 10+ people, version **1.0** (§2) | Data & Testing Lead |
| Day 6 | Look at the Test Lab results. What failed? Tune a slider, raise `appVersion` to **1.1** | AI / Tech Lead |
| Day 7–9 | Round 2 testing on v1.1, the same way. Now you have before/after numbers | Data & Testing Lead |
| Day 7–10 | Research local facts (§1), write the ethics statement (§3) | Research & Ethics Lead |
| Day 9–11 | Brochure: screenshots, QR code, results (§4) | Design & Comms Lead |
| Day 11–14 | Pitch script, rehearse 3+ times with a timer, Q&A drill (§5–6) | Everyone |

Roles in the guide: Project Lead, AI / Tech Lead, Research & Ethics Lead, Design &
Comms Lead, and, because you are 5, **Data & Testing Lead**. Decide who does what
together and put it in `js/config.js`.

---

## 1. Proposal (half a page): what to include

The guide asks for: team members & roles · chosen field · the problem · who it affects ·
your idea · how it uses AI. Also list a **first and second choice field**.

Questions to answer in your own words:
- **Problem:** What happens to people who want to exercise in a Bahraini summer? What goes wrong when they train at home with no coach?
- **Who it affects:** Students? Office workers? People fasting in Ramadan? Pick 1–2 groups and say why.
- **Evidence:** Find 2–3 real sources. Ideas to research (check each one yourself and note the source):
  - Typical summer temperatures and humidity in Bahrain (Bahrain Meteorological Directorate, Open-Meteo history)
  - Bahrain's summer midday outdoor-work ban for workers (Ministry of Labour): it shows the government treats the heat as a health risk
  - Physical-activity or obesity levels in Bahrain / the Gulf (WHO country data)
  - Common home-workout injuries from bad form
- **Your idea:** one or two sentences on what Nashat does.
- **How it uses AI:** name the technique (*computer vision → pose estimation*), what goes in (video frames) and what comes out (33 body landmarks).
- **Second choice field:** pick one in case your teacher rebalances teams.

---

## 2. Testing (this is where the App Quality marks come from)

The rubric wants an app "tested with real users or data **and improved**". Do this:

1. **Get consent.** Only test people who agree. Don't save names or photos. The Test Lab uses codes like T07.
2. **Run a test:** volunteer picks an exercise → open the coach in **Free count** mode → they do about 10 reps → a teammate counts by hand at the same time → press Finish → **Log as a test** → type the real count, the conditions and their feedback.
3. **Mix the conditions on purpose:** bright/dim light, front/side view, sportswear/loose clothes (thobe), different heights, phone/laptop. This is how you find where the AI fails.
4. **At least 10 people per round.** The guide says 10 tested people beats a complex untested app.
5. **Export a CSV** after each session (results are saved only in that browser). Use the same device for all tests, or use Import backup to combine them.
6. **Improve:** look at "Accuracy by condition". Example: if dim light is bad, add a "move somewhere brighter" note to your pitch. If squats aren't counting for some people, lower the full-depth angle in **Tune the AI rules**. Then raise `appVersion` to 1.1 and test again.
7. **Record:** screenshot the Test Lab charts for the brochure, and note one thing you changed because of testing. Judges love before/after.

> Never invent or round up results. If accuracy is 78%, say 78% and explain why. "Be honest about limits" is one of the guide's winning tips.

---

## 3. Ethics & impact statement (~200 words, your own words)

The guide requires: **bias, privacy, safety, jobs, environmental cost**, and **how you reduce each one**.
Brainstorm prompts for Nashat. Discuss them as a team, then write your own sentences:

| Area | Questions to think about | Possible ways you reduce it (check they are true for our app) |
|---|---|---|
| **Bias** | Does the model work equally well for different skin tones, body sizes, ages, people in wheelchairs, or loose clothing like a thobe or abaya? What did *your* tests show? | Testing with a mix of people and clothes; reporting accuracy by condition; adjustable thresholds |
| **Privacy** | A camera pointed at someone's body is sensitive. Where does the video go? | The model runs on the device; no video is uploaded or stored; no accounts; codes, not names, in tests |
| **Safety** | What if the AI says "good form" when it isn't? What if someone trusts the heat plan and ignores feeling unwell? | Heat limits and warnings; "stop if dizzy" messages; it's guidance, not medical advice; the AI doesn't diagnose |
| **Jobs** | Could apps like this replace personal trainers? Or help them reach more people? | Positioned as a helper for times when no coach is available |
| **Environment** | AI uses energy. Is running on a phone better or worse than a cloud server? What about the energy used to train the model originally? | Small "lite" model on the device; no server running all the time |

Paste your final statement into `ethicsStatement` in `js/config.js`. It will show on the Team page.

---

## 4. Brochure (tri-fold A4): panel plan

Required by the guide: front panel · the problem · how the AI works (diagram) ·
app screenshots + how to use · results · ethics & team · **QR code**.

| Panel | Content | Where to get it |
|---|---|---|
| Front (outside right) | Title "Nashat", field: Sport, team number, one striking image | Screenshot of the coach with the skeleton on a teammate (with their permission) |
| Back (outside middle) | Team names + roles, **QR code**, "Scan to try it" | Team page → *Download QR code* |
| Flap (outside left) | The problem + local evidence (your researched facts, with sources) | Your §1 research |
| Inside left | How the AI works: **data → training → prediction → our rules** diagram | Redraw the 4 steps from the *How it works* page in your own design |
| Inside middle | The app: 3 screenshots (heat check, coach, test lab) + "how to use" in 3 steps | Take them on a phone |
| Inside right | Results (your real Test Lab numbers + 1–2 user quotes) + ethics summary | Test Lab charts, your statement |

Tips: keep text short (judges skim), use the site's colours (orange `#F97316`, green
`#22C55E`, dark navy `#0F1420`), and **test the printed QR code with two phones before
printing them all.**

---

## 5. Pitch (5 minutes) + live demo: structure

Every member must speak. Here is a suggested running order and timing. Write your own script.

| Time | Section | Speaker (your choice) | What to cover |
|---|---|---|---|
| 0:00–0:40 | Hook + problem | | A real summer-in-Bahrain moment; who suffers; one researched fact |
| 0:40–1:30 | How the AI works | | Data → training → prediction → our angle rules. Point at the skeleton on screen |
| 1:30–3:00 | **Live demo** | Demo person + narrator | Heat check (live weather) → coach: 5 squats incl. one shallow one, so it says "go lower" → show the counter |
| 3:00–3:50 | Results | | Real accuracy, before/after tuning, user feedback quote |
| 3:50–4:30 | Ethics & limits | | Biggest risk + how you reduce it; where the AI fails |
| 4:30–5:00 | Close | | What AI *can* do here and what it should *not* do (the guide's big question) + "scan the QR to try it" |

**Demo checklist (the day before and on the day)**
- [ ] Phone charged; site already open and the model loaded (press Start once before judges arrive)
- [ ] Phone stand / tripod; test the distance (whole body visible, 2–3 m)
- [ ] Bright light at the stand; plain background if possible
- [ ] Voice volume up
- [ ] **Backup:** record a 30-second video of a teammate doing squats now. If the camera or venue fails, use *Use a video file* in the coach
- [ ] **Backup 2:** screenshots of every page in your slides
- [ ] Test Lab results exported to CSV and screenshotted (the browser could be cleared)

---

## 6. Q&A drill: questions judges will probably ask

Each member should be able to answer these without notes. Practise them out loud.

**About the AI**
1. How does the AI learn? Who trained it, and on what data?
2. What exactly does the model output? (Hint: 33 landmarks, x/y/z, visibility)
3. Did *you* train the model? What part did you build yourselves? (Be clear: Google trained the pose model; you built the angle rules, rep counting, form checks, heat logic, testing and tuning.)
4. Why use AI for this instead of normal programming?
5. Why does it run on the phone and not on a server?
6. What is a "state machine" and how does it count a rep?

**About results & limits**
7. How accurate is it? How did you measure that?
8. What if it gets it wrong, e.g. counts a rep that wasn't done, or says good form when it's bad?
9. When does it fail? (light, clothing, camera angle, hidden joints)
10. What did you change after testing?

**About ethics & the real world**
11. Is it fair to everyone (skin tone, body type, clothing)? How do you know?
12. What happens to the camera video?
13. Could someone get hurt following the heat plan? Is the heat part AI? (No: it's a formula plus rules. Saying so honestly scores well.)
14. Would this replace personal trainers?
15. What would you add with more time? (e.g. Arabic voice, more exercises, a model you train yourselves with Teachable Machine poses)

**Key terms to use correctly:** computer vision · pose estimation · neural network ·
training data / labels · prediction · landmark / keypoint · confidence (visibility) ·
on-device inference · threshold · accuracy · bias.

---

## 7. Final submission checklist (from the guide)

- [ ] Project proposal (approved)
- [ ] App / website link (+ files)
- [ ] Ethics & impact statement (~200 words, your own words)
- [ ] Printed tri-fold brochure with a **working** QR code
- [ ] Pitch slides or script (5 minutes)
- [ ] Poster (optional)
