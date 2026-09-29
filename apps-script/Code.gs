const LEGACY_HEADERS = [
  'Timestamp',
  'Name (first and last)',
  'Score for Today (net-gain or net-loss)',
  "Email (If you're not on the email list already)",
];
const NAME_HEADER = 'Name (first and last)';
const EMAIL_HEADER = "Email (If you're not on the email list already)";
const STATUS_PREFIX = 'score-submission:';

function doPost(e) {
  const cache = CacheService.getScriptCache();
  let requestId = '';
  try {
    const payload = JSON.parse(e && e.parameter && e.parameter.payload || '{}');
    requestId = String(payload.requestId || '');
    if (!/^[a-f0-9-]{20,64}$/i.test(requestId)) throw new Error('Invalid request.');

    const cached = cache.get(STATUS_PREFIX + requestId);
    if (cached) return postResponse();

    const name = cleanText(payload.name, 120);
    const email = cleanText(payload.email, 254);
    if (!name) throw new Error('Name is required.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');

    let score = '';
    if (payload.score !== null && payload.score !== '') {
      score = Number(payload.score);
      if (!Number.isFinite(score)) throw new Error('Score must be a number.');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = findScoreSheet(spreadsheet);
      ensureDailyLayout(sheet, spreadsheet.getSpreadsheetTimeZone());
      upsertDailyScore(sheet, spreadsheet, { name: name, email: email, score: score });
      cache.put(STATUS_PREFIX + requestId, JSON.stringify({ ok: true }), 600);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    if (requestId) cache.put(STATUS_PREFIX + requestId, JSON.stringify({ ok: false, error: error && error.message ? error.message : 'Unable to save this score.' }), 600);
  }
  return postResponse();
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'standings') return standingsResponse(String(e.parameter.callback || ''));
  const requestId = String(e && e.parameter && e.parameter.requestId || '');
  const callback = String(e && e.parameter && e.parameter.callback || '');
  if (!requestId && !callback) {
    return ContentService.createTextOutput('Sheepshead score receiver ready.').setMimeType(ContentService.MimeType.TEXT);
  }
  if (!/^[a-f0-9-]{20,64}$/i.test(requestId)) return jsonp(callback, { ok: false, error: 'Invalid request.' });
  if (!/^[A-Za-z_$][\w$]{0,100}$/.test(callback)) {
    return ContentService.createTextOutput('Invalid callback.').setMimeType(ContentService.MimeType.TEXT);
  }
  const status = CacheService.getScriptCache().get(STATUS_PREFIX + requestId);
  return jsonp(callback, status ? JSON.parse(status) : { pending: true });
}

function jsonp(callback, result) {
  if (!/^[A-Za-z_$][\w$]{0,100}$/.test(callback)) {
    return ContentService.createTextOutput('Invalid callback.').setMimeType(ContentService.MimeType.TEXT);
  }
  const serialized = JSON.stringify(result).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return ContentService.createTextOutput(callback + '(' + serialized + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function postResponse() {
  return HtmlService.createHtmlOutput('<!doctype html><html><body>Score received.</body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function findScoreSheet(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const lastColumn = sheet.getLastColumn();
    if (!lastColumn) continue;
    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(value => value.trim());
    if (LEGACY_HEADERS.every(header => headers.includes(header)) || (headers[0] === NAME_HEADER && headers[1] === EMAIL_HEADER)) return sheet;
  }
  throw new Error('Could not find the score sheet with the expected column headers.');
}

function ensureDailyLayout(sheet, timeZone) {
  const lastColumn = sheet.getLastColumn();
  const headers = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(value => value.trim()) : [];
  if (headers[0] === NAME_HEADER && headers[1] === EMAIL_HEADER) return;
  if (!LEGACY_HEADERS.every(header => headers.includes(header))) throw new Error('The score sheet headers do not match the expected layout.');

  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, lastColumn).getValues() : [];
  const indexes = Object.fromEntries(LEGACY_HEADERS.map(header => [header, headers.indexOf(header)]));
  const people = new Map();
  const days = new Map();

  rows.forEach(row => {
    const name = cleanText(row[indexes[NAME_HEADER]], 120);
    if (!name) return;
    const timestamp = row[indexes['Timestamp']];
    const day = dateParts(timestamp, timeZone);
    if (!day) return;
    if (!days.has(day.key)) days.set(day.key, day.label);
    const key = normalizeName(name);
    if (!people.has(key)) people.set(key, { name: name, email: '', scores: new Map() });
    const person = people.get(key);
    const email = cleanText(row[indexes[EMAIL_HEADER]], 254);
    if (email) person.email = email;
    person.scores.set(day.key, numericScore(row[indexes[LEGACY_HEADERS[2]]]));
  });

  const orderedDays = Array.from(days.keys()).sort();
  const newHeaders = [NAME_HEADER, EMAIL_HEADER].concat(orderedDays.map(key => days.get(key)));
  const newRows = Array.from(people.values()).map(person => [safeCellText(person.name), safeCellText(person.email)].concat(orderedDays.map(key => person.scores.has(key) ? person.scores.get(key) : '')));
  sheet.clearContents();
  sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
  if (newRows.length) sheet.getRange(2, 1, newRows.length, newHeaders.length).setValues(newRows);
  if (orderedDays.length && newRows.length) {
    sheet.getRange(2, 3, newRows.length, orderedDays.length).setNumberFormat('0.##');
  }
}

function upsertDailyScore(sheet, spreadsheet, submission) {
  const timeZone = spreadsheet.getSpreadsheetTimeZone();
  const today = dateParts(new Date(), timeZone);
  let lastColumn = sheet.getLastColumn();
  let headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(value => value.trim());
  let scoreColumn = -1;
  for (let column = 2; column < headers.length; column++) {
    const existingDay = dateParts(headers[column], timeZone);
    if (existingDay && existingDay.key === today.key) { scoreColumn = column + 1; break; }
  }
  if (scoreColumn < 0) {
    scoreColumn = lastColumn + 1;
    sheet.getRange(1, scoreColumn).setValue(today.label);
    headers.push(today.label);
  }
  sheet.getRange(2, scoreColumn, Math.max(sheet.getLastRow() - 1, 1), 1).setNumberFormat('0.##');

  const lastRow = sheet.getLastRow();
  const names = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat() : [];
  const match = names.findIndex(existing => normalizeName(existing) === normalizeName(submission.name));
  let rowNumber;
  if (match < 0) {
    rowNumber = sheet.getLastRow() + 1;
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([[safeCellText(submission.name), safeCellText(submission.email)].concat(new Array(headers.length - 2).fill(''))]);
  } else {
    rowNumber = match + 2;
    if (submission.email) sheet.getRange(rowNumber, 2).setValue(safeCellText(submission.email));
  }
  const scoreCell = sheet.getRange(rowNumber, scoreColumn);
  scoreCell.setNumberFormat('0.##');
  scoreCell.setValue(numericScore(submission.score));
  CacheService.getScriptCache().remove('standings'); // next read reflects this score
  try { writeStandingsTab(spreadsheet, sheet); } catch (ignore) {} // keep the published Standings tab current
}

function dateParts(value, timeZone) {
  let date;
  if (value instanceof Date && !isNaN(value.getTime())) date = value;
  else {
    const text = String(value == null ? '' : value).trim();
    const match = text.match(/^(?:([A-Za-z]{3})\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) date = new Date(Number(match[4]), Number(match[2]) - 1, Number(match[3]));
    else {
      const parsed = new Date(text);
      if (!isNaN(parsed.getTime())) date = parsed;
    }
  }
  if (!date || isNaN(date.getTime())) return null;
  return {
    key: Utilities.formatDate(date, timeZone, 'yyyy-MM-dd'),
    label: Utilities.formatDate(date, timeZone, 'EEE M/d/yyyy'),
  };
}

function normalizeName(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function cleanText(value, maxLength) {
  const text = String(value == null ? '' : value).trim();
  if (text.length > maxLength) throw new Error('One of the text fields is too long.');
  return text;
}

function safeCellText(value) {
  return /^[=+@\-]/.test(value) ? "'" + value : value;
}

function numericScore(value) {
  if (value === '' || value == null) return '';
  const number = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(number) ? number : '';
}

var STANDINGS_TAB = 'Standings';

// Name + all-time total (sum of every daily score) for each player.
function computeStandings(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const players = [];
  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    rows.forEach(function (row) {
      const name = String(row[0] == null ? '' : row[0]).replace(/^'/, '').trim();
      if (!name) return;
      let total = 0;
      for (let c = 2; c < row.length; c++) total += Number(numericScore(row[c])) || 0;
      players.push({ name: name, total: Math.round(total * 100) / 100 });
    });
  }
  return players;
}

// Keeps a small public-safe "Standings" tab (no emails) up to date. Publish only this tab to the web (see README)
// and the website can read it straight from Google's servers, which is much faster than a script call.
function writeStandingsTab(spreadsheet, sheet) {
  const players = computeStandings(sheet).sort(function (a, b) { return b.total - a.total || a.name.localeCompare(b.name); });
  const tab = spreadsheet.getSheetByName(STANDINGS_TAB) || spreadsheet.insertSheet(STANDINGS_TAB);
  tab.clear();
  const values = [['Name', 'Total']].concat(players.map(function (p) { return [safeCellText(p.name), p.total]; }));
  tab.getRange(1, 1, values.length, 2).setValues(values);
  return players;
}

// Run this once from the Apps Script editor (Run > setupStandingsTab) to create the tab before publishing it.
function setupStandingsTab() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  writeStandingsTab(spreadsheet, findScoreSheet(spreadsheet));
}

function standingsResponse(callback) {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get('standings');
    if (cached) return jsonp(callback, { ok: true, players: JSON.parse(cached) });
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = findScoreSheet(spreadsheet);
    const players = computeStandings(sheet);
    try { cache.put('standings', JSON.stringify(players), 60); } catch (ignore) {}
    return jsonp(callback, { ok: true, players: players });
  } catch (error) {
    return jsonp(callback, { ok: false, error: error && error.message ? error.message : 'Unable to read standings.' });
  }
}
