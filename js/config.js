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
  ethicsStatement: ``,

  // Location used for live weather (Manama, Bahrain).
  location: { name: 'Manama, Bahrain', latitude: 26.2235, longitude: 50.5876, timezone: 'Asia/Bahrain' },
};
