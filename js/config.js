// ─────────────────────────────────────────────────────────────
//  TEAM SETTINGS — edit this file, nothing else needs changing.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  appName: 'Nashat',            // نشاط = "energy / activity"
  appNameArabic: 'نشاط',
  tagline: 'The heat-smart AI exercise coach for Bahrain',
  field: 'Sport',
  teamNumber: '',               // e.g. '7' — fill in when your teacher gives you one
  school: 'Hawar International School',
  event: 'AI Symposium 2027',

  // Bump this after every improvement you make from user testing
  // (e.g. '1.0' for the first version, '1.1' after tuning). The Test Lab
  // groups results by version so you can show the improvement.
  appVersion: '1.0',

  // The public link of your website (used for the QR code). Leave empty to
  // use whatever address the page is opened from.
  siteUrl: 'https://103009.github.io/nashat-ai/',

  // Team roles (role descriptions from the AI Symposium 2027 guide, page 4).
  team: [
    { name: 'Saqer Alnoaimi', role: 'Project Lead', leader: true, about: 'Leads the team, keeps everyone on schedule and runs our meetings.' },
    { name: 'Ahmed Alathem', role: 'AI / Tech Lead', about: 'Leads building and testing the AI coach and the website.' },
    { name: 'Ahmed Alkhaldi', role: 'Research & Ethics Lead', about: 'Leads the research and the ethics & impact statement.' },
    { name: 'Mohammed Alashraaf', role: 'Design & Comms Lead', about: 'Leads the brochure, visuals and the pitch script.' },
    { name: 'Saif Buhindi', role: 'Data & Testing Lead', about: 'Runs tests with real users and records the results.' },
  ],

  // Paste your team's OWN ethics & impact statement here (~200 words).
  // The guide does not allow AI-written text for this, so write it yourselves.
  // Separate paragraphs with a blank line.
  ethicsStatement: `Nashat uses AI to coach exercise, so we thought carefully about its risks.

Bias: Pose-detection models can be less accurate for some body types, skin tones, or loose clothing such as a thobe or abaya. Our Test Lab records accuracy by lighting, clothing and camera view, so the counting rules can be adjusted if any group is under-counted.

Privacy: A camera pointed at someone's body is sensitive. Nashat's AI runs entirely in the browser, so video is never uploaded, recorded or stored. There are no accounts, and testers are logged with codes, not names.

Safety: Wrong advice could cause injury or heat illness. Nashat limits workout time and adds rest using the heat index, warns users to train indoors in dangerous heat, and reminds them to stop if they feel dizzy. It gives general guidance, not medical advice.

Jobs: Nashat is designed for times when no coach is available, not to replace personal trainers, who could also use it to check clients' form at home.

Environment: Training AI models uses energy, but Nashat runs a small 6 MB model on the user's own device instead of a server that runs all the time.`,

  // Location used for live weather (Manama, Bahrain).
  location: { name: 'Manama, Bahrain', latitude: 26.2235, longitude: 50.5876, timezone: 'Asia/Bahrain' },
};
