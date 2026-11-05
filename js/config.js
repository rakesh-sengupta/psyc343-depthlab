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
  // One Google Apps Script web app (apps-script/Code.gs, bound to a Google Sheet) receives
  // everything when a student finishes a phase:
  //   - the full trial-by-trial CSV  -> a file in a Google Drive folder (one per student per phase)
  //   - a one-row summary            -> tab "Phase 1" ... "Phase 4" (live class results)
  //   - the quiz marks               -> tab "Grades" (automatic grading; grade.html reads it)
  // Deploy the script as a web app and paste its URL (ending in /exec) here.
  sheets_url: "https://script.google.com/macros/s/AKfycbySbqCl8FQBDYk84L0u5MEwfky22B2Jqx63WVZOExLc9jcBGeEWwWIj8iGdG38DYSTpcA/exec",

  // Students can always download their own CSV at the end of each phase. If the upload fails,
  // the lab keeps the submission on the device and re-sends it automatically the next time
  // the page is opened (the script ignores duplicates).

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
