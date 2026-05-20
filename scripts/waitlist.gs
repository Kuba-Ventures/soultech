// Soultech waitlist intake.
// Deploy as Web App: Execute as = Me, Who has access = Anyone.
// Receives JSON { name, email, useCase, ts, source } and appends to the active sheet.

const SHEET_NAME = "Waitlist";
const HEADERS = ["timestamp", "name", "email", "useCase", "source"];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: "Empty body" });
    }
    const body = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    sheet.appendRow([
      body.ts || new Date().toISOString(),
      body.name || "",
      body.email || "",
      body.useCase || "",
      body.source || "landing-page",
    ]);
    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  return jsonOut({ ok: true, ping: "waitlist" });
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
