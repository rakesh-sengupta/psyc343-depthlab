/**
 * Depth Lab -> Google Sheet + Google Drive: data collection, live class results AND automatic grading.
 *
 * SET-UP (once, ~5 minutes)
 * 1. Create a Google Sheet (e.g. "PSYC343 S09 Depth Lab").
 * 2. Extensions > Apps Script. Replace the code with this file. Save.
 * 3. Run the function `setup` once (Run button) and accept the permissions (Sheets + Drive).
 *    It creates the "Settings" and "Grades" tabs and a Drive folder for the data files;
 *    the folder's link is written into the Settings tab.
 * 4. Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone.
 *    Copy the URL ending in /exec into web/js/config.js (sheets_url).
 *    (After editing this code later: Deploy > Manage deployments > edit > Version: New version.)
 *
 * WHAT IT DOES, each time a student finishes a phase (one POST):
 * - saves the full trial-by-trial CSV as a file in the Drive data folder,
 *     S09_P<phase>_<roll>_<name>_<timestamp>.csv
 * - appends one summary row (results + quiz marks + link to the file) to tab "Phase <n>",
 * - rebuilds the "Grades" tab: per roll number, the quiz marks of the FIRST attempt at each
 *   phase, the total, marks out of `out_of`, percent and (optional) letter,
 * - replies {"status":"ok"} so the student's screen can confirm the save.
 * Submissions carry an id; a re-sent duplicate is recognised and not stored twice.
 *
 * grade.html asks (GET ?roll=...&name=...) for one student's grade. It answers only if the
 * name matches the one recorded for that roll number, and only after `release_from`.
 *
 * SETTINGS tab (edit the values in column B):
 *   release_from  blank = grades visible as soon as each phase is finished;
 *                 or a date-time, e.g. 2026-11-06 18:00, to release after class.
 *   items         graded questions per phase, e.g. 4,3,3,5
 *   out_of        marks the quiz is worth (e.g. 10)
 *   bands         optional letter grades, highest first, e.g. 90:A,80:A-,70:B,60:C,50:D,0:F
 *   override      optional manual corrections, e.g. KREA1003=+1;KREA1010=-2 (questions)
 *   data_folder   (filled in by setup) link to the Drive folder with the CSV files
 *
 * "Anyone" means anyone with the URL can submit data or look up a grade if they know a roll
 * number AND the matching name. Treat this as a classroom tool, not a secure record: keep the
 * Sheet and the folder private, and export the Grades tab to Canvas as the record of grades.
 */

const DEFAULTS = [
  ["release_from", "", "blank = immediately; or a date-time such as 2026-11-06 13:00"],
  ["items", "4,3,3,5", "graded questions in phases 1,2,3,4"],
  ["out_of", 10, "marks the quiz is worth"],
  ["bands", "", "optional, e.g. 90:A,80:A-,70:B,60:C,50:D,0:F"],
  ["override", "", "optional manual corrections, e.g. KREA1003=+1;KREA1010=-2"],
  ["data_folder", "", "filled in by setup: the Drive folder that receives the CSV files"]
];
const FOLDER_NAME = "PSYC343 S09 Depth Lab data";

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  settings_(ss);
  folder_(ss);
  rebuildGrades_(ss);
}

// The Drive folder for the CSV files (created on first use; its id is kept in the script properties).
function folder_(ss) {
  const props = PropertiesService.getScriptProperties();
  let f = null;
  const id = props.getProperty("DATA_FOLDER_ID");
  if (id) { try { f = DriveApp.getFolderById(id); } catch (e) { f = null; } }
  if (!f) {
    f = DriveApp.createFolder(FOLDER_NAME);
    props.setProperty("DATA_FOLDER_ID", f.getId());
    const sh = ss.getSheetByName("Settings");
    if (sh) {
      const vals = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
      const r = vals.findIndex(v => v[0] === "data_folder");
      if (r >= 0) sh.getRange(r + 1, 2).setValue(f.getUrl());
    }
  }
  return f;
}

function norm_(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function normName_(s) { return String(s || "").toLowerCase().replace(/[^a-z]/g, ""); }

function settings_(ss) {
  let sh = ss.getSheetByName("Settings");
  if (!sh) {
    sh = ss.insertSheet("Settings");
    sh.getRange(1, 1, DEFAULTS.length, 3).setValues(DEFAULTS);
    sh.getRange(1, 1, DEFAULTS.length, 1).setFontWeight("bold");
    sh.getRange(1, 2, DEFAULTS.length, 1).setNumberFormat("@");   // keep text as typed
    sh.autoResizeColumns(1, 3);
  }
  const v = {};
  sh.getRange(1, 1, sh.getLastRow(), 2).getValues().forEach(r => { v[String(r[0]).trim()] = r[1]; });
  const items = String(v.items || "4,3,3,5").split(",").map(x => Number(x.trim()) || 0);
  const bands = String(v.bands || "").split(",").map(x => x.trim()).filter(Boolean)
    .map(x => { const [m, l] = x.split(":"); return [Number(m), String(l || "").trim()]; })
    .sort((a, b) => b[0] - a[0]);
  const override = {};
  String(v.override || "").split(";").map(x => x.trim()).filter(Boolean).forEach(x => {
    const [r, d] = x.split("="); override[norm_(r)] = Number(d) || 0;
  });
  let release = null;
  if (v.release_from instanceof Date) release = v.release_from;
  else if (String(v.release_from || "").trim()) release = new Date(String(v.release_from).trim().replace(" ", "T"));
  return { items, out_of: Number(v.out_of) || 10, bands, override, release };
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const body = JSON.parse(e.postData.contents);
    const row = body.summary || body;               // older clients sent only the summary
    row.received = new Date();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    settings_(ss);
    const name = "Phase " + (row.phase || "?");
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    let header = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    // duplicate? (the same submission re-sent after a network problem)
    const iId = header.indexOf("sub_id");
    if (row.sub_id && iId >= 0 && sh.getLastRow() > 1) {
      const ids = sh.getRange(2, iId + 1, sh.getLastRow() - 1, 1).getValues().map(r => r[0]);
      if (ids.indexOf(row.sub_id) >= 0) return json_({ status: "ok", duplicate: true });
    }
    if (body.csv) {
      const fname = String(body.filename || (row.sub_id || "submission") + ".csv").replace(/[^A-Za-z0-9._-]/g, "_");
      row.data_file = folder_(ss).createFile(fname, body.csv, MimeType.CSV).getUrl();
    }
    const extra = Object.keys(row).filter(k => header.indexOf(k) < 0);
    if (extra.length) {
      header = header.concat(extra);
      sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
    sh.appendRow(header.map(k => (row[k] === undefined || row[k] === null) ? "" : row[k]));
    rebuildGrades_(ss);
    return json_({ status: "ok", duplicate: false, saved_file: !!body.csv });
  } catch (err) {
    return json_({ status: "error", message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Rebuild the Grades tab from the Phase tabs (first attempt per roll number per phase).
function rebuildGrades_(ss) {
  const S = settings_(ss);
  const people = {};   // roll -> {roll, name, p:[...], attempts:[...]}
  for (let ph = 1; ph <= 4; ph++) {
    const sh = ss.getSheetByName("Phase " + ph);
    if (!sh || sh.getLastRow() < 2) continue;
    const vals = sh.getDataRange().getValues(), h = vals[0];
    const iR = h.indexOf("roll"), iN = h.indexOf("name"), iC = h.indexOf("quiz_correct");
    for (let r = 1; r < vals.length; r++) {
      const roll = norm_(vals[r][iR]);
      if (!roll) continue;
      const p = people[roll] || (people[roll] = { roll: String(vals[r][iR]).trim(), name: vals[r][iN], p: [null, null, null, null], attempts: [0, 0, 0, 0] });
      p.attempts[ph - 1]++;
      if (p.p[ph - 1] === null) p.p[ph - 1] = Math.min(Number(vals[r][iC]) || 0, S.items[ph - 1]);   // first attempt only
    }
  }
  const total = S.items.reduce((a, b) => a + b, 0);
  const out = [["roll", "name", "phase1", "phase2", "phase3", "phase4", "adjust", "correct", "of", "marks", "out_of", "percent", "letter", "phases_done", "repeat_attempts"]];
  Object.keys(people).sort().forEach(k => {
    const p = people[k];
    const adj = S.override[k] || 0;
    const correct = Math.max(0, Math.min(total, p.p.reduce((a, b) => a + (b || 0), 0) + adj));
    const percent = Math.round(1000 * correct / total) / 10;
    const marks = Math.round(100 * S.out_of * correct / total) / 100;
    const band = S.bands.find(b => percent >= b[0]);
    out.push([p.roll, p.name].concat(p.p.map(x => x === null ? "" : x),
      [adj || "", correct, total, marks, S.out_of, percent, band ? band[1] : "",
       p.p.filter(x => x !== null).length, p.attempts.reduce((a, b) => a + Math.max(0, b - 1), 0)]));
  });
  const g = ss.getSheetByName("Grades") || ss.insertSheet("Grades");
  g.clearContents();
  g.getRange(1, 1, out.length, out[0].length).setValues(out);
  g.getRange(1, 1, 1, out[0].length).setFontWeight("bold");
  g.setFrozenRows(1);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// grade.html: GET ?roll=...&name=...
function doGet(e) {
  const roll = norm_(e && e.parameter.roll), name = normName_(e && e.parameter.name);
  if (!roll) return json_({ status: "info", message: "Depth Lab grade service is running." });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const S = settings_(ss);
  if (S.release && new Date() < S.release) {
    return json_({ status: "not_released", release_from: Utilities.formatDate(S.release, Session.getScriptTimeZone(), "d MMM yyyy, HH:mm") });
  }
  const g = ss.getSheetByName("Grades");
  if (!g || g.getLastRow() < 2) return json_({ status: "none", message: "No grades recorded yet." });
  const vals = g.getDataRange().getValues(), h = vals[0], col = (k) => h.indexOf(k);
  const row = vals.slice(1).find(r => norm_(r[col("roll")]) === roll);
  if (!row || normName_(row[col("name")]) !== name) {
    return json_({ status: "none", message: "No record matches that roll number and name. Use the name exactly as you typed it in class." });
  }
  const phases = {};
  for (let ph = 1; ph <= 4; ph++) phases[ph] = row[col("phase" + ph)];
  return json_({
    status: "ok", phases,
    correct: row[col("correct")], total: row[col("of")], marks: row[col("marks")], out_of: row[col("out_of")],
    percent: row[col("percent")], letter: row[col("letter")], bands: S.bands,
    note: (row[col("phases_done")] < 4 ? "Phases not recorded count as 0. If you missed a phase for a valid reason, contact the instructor." : "")
      + (row[col("adjust")] ? " Includes a manual adjustment by the instructor." : "")
  });
}
