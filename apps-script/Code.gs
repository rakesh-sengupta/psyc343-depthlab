/**
 * Depth Lab -> Google Sheet (optional, for live class results)
 *
 * 1. Create a Google Sheet (e.g. "PSYC343 S09 Depth Lab").
 * 2. Extensions > Apps Script. Replace the code with this file. Save.
 * 3. Deploy > New deployment > type "Web app".
 *      Execute as: Me.   Who has access: Anyone.
 *    Copy the URL ending in /exec into web/js/config.js (sheets_url).
 * 4. Each finished phase adds ONE row (summary numbers + quiz score) to a tab
 *    called "Phase 1" ... "Phase 4". Full trial-by-trial data go to OSF via DataPipe.
 *
 * "Anyone" means anyone with the URL can append a row. The URL is not shown to
 * students, but treat the sheet as class data, not as a secure record.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const row = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const name = "Phase " + (row.phase || "?");
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    let header = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    const extra = Object.keys(row).filter(k => header.indexOf(k) < 0);
    if (extra.length) {
      header = header.concat(extra);
      sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
    sh.appendRow(header.map(k => (row[k] === undefined || row[k] === null) ? "" : row[k]));
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Depth Lab sheet endpoint is running.");
}
