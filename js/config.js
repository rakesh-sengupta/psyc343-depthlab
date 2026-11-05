// =====================================================================
//  PSYC343 Session 9 - Depth Lab : configuration
//  Edit this file only. Everything else reads from it.
// =====================================================================
window.DEPTHLAB_CONFIG = {
  course: "PSYC343 Vision: Ways of Seeing",
  session: "S09",

  // Unlock codes shown on the slides. Case and spaces are ignored.
  // Change them each year if you like (and change the slides to match).
  codes: {
    1: "HORIZON",
    2: "JULESZ",
    3: "PARALLAX",
    4: "PONZO"
  },

  // ---------------- where the data go ----------------
  // (a) DataPipe -> OSF  (recommended: full trial-by-trial CSV per student per phase)
  //     Create an experiment at https://pipe.jspsych.org, link it to a PRIVATE OSF
  //     project, switch "data collection" on, and paste the 12-character ID here.
  datapipe_id: "",

  // (b) Google Sheet (optional: one summary row per student per phase, live during class)
  //     Deploy apps-script/Code.gs as a web app and paste its /exec URL here.
  sheets_url: "",

  // Students can always download their own CSV at the end of each phase.
  // If neither (a) nor (b) is set, that download is the only copy, so ask them
  // to upload it to Canvas.

  // ---------------- grading ----------------
  // Only the quiz questions are graded (1 mark each, first attempt only).
  // Predictions and experiment responses are never marked right or wrong.
  // The OFFICIAL grade is computed in the Google Sheet (apps-script/Code.gs) and shown on
  // grade.html; keep the numbers below the same as the Sheet's "Settings" tab.
  grading: {
    label: "Session 9 in-class quiz",
    items: { 1: 4, 2: 3, 3: 3, 4: 5 },   // graded questions per phase (15 in all)
    out_of: 10,                          // marks the whole quiz is worth
    // Optional letter grades: [minimum percent, letter], highest first. Empty = marks and % only.
    bands: []
  },

  // Show the 'skip' helpers (for the instructor's dry run). Add ?debug=1 to the URL.
  debug: new URLSearchParams(location.search).has("debug")
};
