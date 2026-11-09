/**
 * Umr weekly reflection emails — Google Apps Script.
 *
 * What it stores (one row per person, in the Google Sheet this script is bound to):
 *   email, locale, status (pending | active), token, consent_version, created_at, confirmed_at, last_sent_week
 * Nothing else. No birth date, no notes: the app works out the week on the phone.
 *
 * Flow:
 *   1. The app POSTs {email, locale, consent:true, consentVersion} to this web app.
 *   2. The script saves a "pending" row and emails a confirmation link.
 *   3. The link (GET ?action=confirm&t=TOKEN) makes the row "active".
 *   4. An hourly trigger sends this week's question every Sunday from 20:00 Tashkent time.
 *      If Gmail's daily quota runs out, the rest go out in the next hourly runs (Monday, Tuesday…).
 *   5. Every email has an unsubscribe link (GET ?action=unsubscribe&t=TOKEN) that deletes the row.
 *
 * Setup: see apps-script/README.md.
 */

// ---- Settings ---------------------------------------------------------------
var APP_URL = 'https://umr.grader.uz/';
var SHEET_NAME = 'subscribers';
var CONSENT_VERSION = '2026-11-09';
var SEND_HOUR_TASHKENT = 20; // Sunday 20:00
var QUOTA_RESERVE = 10; // keep some daily quota for confirmation emails
var PENDING_DAYS = 7; // unconfirmed sign-ups are deleted after this
var TZ_OFFSET_MS = 5 * 3600 * 1000; // Uzbekistan is UTC+5 all year
var LOCALES = ['uz-Latn', 'ru', 'en'];
var COLS = ['email', 'locale', 'status', 'token', 'consent_version', 'created_at', 'confirmed_at', 'last_sent_week'];

// ---- Copy (draft; needs native review, like the app) ------------------------
var T = {
  'uz-Latn': {
    confirmSubject: 'Umr: elektron pochtangizni tasdiqlang',
    confirmIntro: 'Siz Umrʻdan haftalik mulohaza xatlarini olishni soʻradingiz. Tasdiqlash uchun tugmani bosing.',
    confirmButton: 'Tasdiqlash',
    confirmIgnore: 'Agar buni siz soʻramagan boʻlsangiz, bu xatga eʻtibor bermang. Hech narsa yuborilmaydi.',
    weeklySubject: 'Umr: shu hafta uchun savol',
    weeklyIntro: 'Shu hafta uchun bir savol:',
    weeklyButton: 'Haftamni ochish',
    unsubscribe: 'Obunani bekor qilish',
    footer: 'Bu xatni Umrʻda haftalik eslatmani yoqqaningiz uchun oldingiz.',
    pageConfirmed: 'Tasdiqlandi. Har yakshanba kechqurun bitta xat keladi.',
    pageUnsubscribed: 'Obuna bekor qilindi va elektron pochtangiz oʻchirildi.',
    pageInvalid: 'Bu havola eskirgan yoki allaqachon ishlatilgan.',
    unsubscribeAsk: 'Haftalik xatlardan obunani bekor qilasizmi? Elektron pochtangiz oʻchiriladi.',
    back: 'Umrʻga qaytish',
  },
  ru: {
    confirmSubject: 'Umr: подтвердите адрес почты',
    confirmIntro: 'Вы попросили присылать еженедельные письма для размышления от Umr. Нажмите кнопку, чтобы подтвердить.',
    confirmButton: 'Подтвердить',
    confirmIgnore: 'Если вы этого не делали, просто не обращайте внимания на письмо. Больше ничего не придёт.',
    weeklySubject: 'Umr: вопрос на эту неделю',
    weeklyIntro: 'Один вопрос на эту неделю:',
    weeklyButton: 'Открыть мою неделю',
    unsubscribe: 'Отписаться',
    footer: 'Вы получили это письмо, потому что включили еженедельное напоминание в Umr.',
    pageConfirmed: 'Готово. Одно письмо будет приходить каждое воскресенье вечером.',
    pageUnsubscribed: 'Вы отписались, и ваш адрес удалён.',
    pageInvalid: 'Эта ссылка устарела или уже использована.',
    unsubscribeAsk: 'Отписаться от еженедельных писем? Ваш адрес будет удалён.',
    back: 'Вернуться в Umr',
  },
  en: {
    confirmSubject: 'Umr: please confirm your email',
    confirmIntro: 'You asked Umr for a weekly reflection email. Tap the button to confirm.',
    confirmButton: 'Confirm',
    confirmIgnore: 'If this wasn’t you, ignore this email. Nothing more will be sent.',
    weeklySubject: 'Umr: a question for this week',
    weeklyIntro: 'One question for this week:',
    weeklyButton: 'Open my week',
    unsubscribe: 'Unsubscribe',
    footer: 'You’re getting this because you turned on the weekly reminder in Umr.',
    pageConfirmed: 'Confirmed. One email will arrive every Sunday evening.',
    pageUnsubscribed: 'You’re unsubscribed, and your email address has been deleted.',
    pageInvalid: 'This link has expired or was already used.',
    unsubscribeAsk: 'Stop the weekly emails? Your email address will be deleted.',
    back: 'Back to Umr',
  },
};

// Reflection questions only (no sourcing needed). Same set as the app.
var QUESTIONS = [
  { en: 'Who did you think about this week?', ru: 'О ком вы думали на этой неделе?', 'uz-Latn': 'Bu hafta kim haqida oʻyladingiz?' },
  { en: 'What would you like this week to be remembered for?', ru: 'Чем бы вы хотели запомнить эту неделю?', 'uz-Latn': 'Bu hafta nimasi bilan esda qolishini istardingiz?' },
  { en: 'Whom have you not called in a while?', ru: 'Кому вы давно не звонили?', 'uz-Latn': 'Kimga anchadan beri qoʻngʻiroq qilmadingiz?' },
  { en: 'What are you carrying that you could put down?', ru: 'Что вы несёте с собой, но могли бы отпустить?', 'uz-Latn': 'Qaysi yukni koʻtarib yuribsiz, uni qoʻyib qoʻysa ham boʻladi?' },
  { en: 'What did you learn from someone older than you?', ru: 'Чему вас научил кто-то старше вас?', 'uz-Latn': 'Sizdan kattaroq kishidan nimani oʻrgandingiz?' },
  { en: 'Whom would you like to thank?', ru: 'Кого вам хотелось бы поблагодарить?', 'uz-Latn': 'Kimga rahmat aytmoqchisiz?' },
  { en: 'What small thing made you glad this week?', ru: 'Какая мелочь порадовала вас на этой неделе?', 'uz-Latn': 'Bu hafta qaysi kichik narsa sizni xursand qildi?' },
  { en: 'What would you like to make room for next week?', ru: 'Для чего вы хотели бы найти место на следующей неделе?', 'uz-Latn': 'Keyingi haftada nimaga vaqt ajratmoqchisiz?' },
];

// ---- Web app endpoints ------------------------------------------------------

/** Sign-up from the app. Always answers {ok:true} so it can't be used to test which emails exist. */
function doPost(e) {
  if (e && e.parameter && e.parameter.action === 'unsubscribe') return unsubscribeByForm(e.parameter);
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var email = normaliseEmail(body.email);
    var locale = LOCALES.indexOf(body.locale) >= 0 ? body.locale : 'uz-Latn';
    if (!email || body.consent !== true) return json({ ok: false, error: 'invalid' });

    // At most one confirmation email per address every 10 minutes.
    var cache = CacheService.getScriptCache();
    var key = 'rl:' + email;
    if (cache.get(key)) return json({ ok: true });
    cache.put(key, '1', 600);

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sheet = getSheet();
      var found = findRow(sheet, 'email', email);
      if (found && found.row.status === 'active') {
        // Already subscribed: just keep their language up to date.
        setCell(sheet, found.index, 'locale', locale);
        return json({ ok: true });
      }
      var token = Utilities.getUuid();
      var now = new Date().toISOString();
      if (found) {
        setCell(sheet, found.index, 'locale', locale);
        setCell(sheet, found.index, 'token', token);
        setCell(sheet, found.index, 'created_at', now);
        setCell(sheet, found.index, 'consent_version', CONSENT_VERSION);
      } else {
        sheet.appendRow([email, locale, 'pending', token, CONSENT_VERSION, now, '', '']);
      }
      if (MailApp.getRemainingDailyQuota() > 0) sendConfirmation(email, locale, token);
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'server' });
  }
}

/** Links from emails: ?action=confirm&t=TOKEN or ?action=unsubscribe&t=TOKEN */
function doGet(e) {
  var p = (e && e.parameter) || {};
  var token = String(p.t || '');
  var sheet = getSheet();
  var found = token ? findRow(sheet, 'token', token) : null;
  var locale = found ? found.row.locale : 'uz-Latn';
  var t = T[locale] || T['uz-Latn'];

  if (!found) return page(t.pageInvalid, t);
  if (p.action === 'confirm') {
    if (found.row.status !== 'active') {
      setCell(sheet, found.index, 'status', 'active');
      setCell(sheet, found.index, 'confirmed_at', new Date().toISOString());
    }
    return page(t.pageConfirmed, t);
  }
  if (p.action === 'unsubscribe') {
    // Mail scanners open links on their own, so unsubscribing takes a tap on this page.
    return page(t.unsubscribeAsk, t, { action: 'unsubscribe', token: token, label: t.unsubscribe });
  }
  return page(t.pageInvalid, t);
}

/** The tap on the unsubscribe page. Deletes the row: keep no data we don't need. */
function unsubscribeByForm(p) {
  var sheet = getSheet();
  var found = p.t ? findRow(sheet, 'token', String(p.t)) : null;
  if (!found) return page(T['uz-Latn'].pageInvalid, T['uz-Latn']);
  var t = T[found.row.locale] || T['uz-Latn'];
  sheet.deleteRow(found.index);
  return page(t.pageUnsubscribed, t);
}

// ---- Weekly send (run by an hourly trigger) ---------------------------------

function weeklySend() {
  var weekKey = currentWeekKey(new Date());
  var question = QUESTIONS[weekIndex(weekKey) % QUESTIONS.length];
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var sheet = getSheet();
    var rows = readAll(sheet);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.row.status !== 'active' || r.row.last_sent_week === weekKey) continue;
      if (MailApp.getRemainingDailyQuota() <= QUOTA_RESERVE) break; // the next hourly run carries on
      sendWeekly(r.row.email, r.row.locale, r.row.token, question);
      setCell(sheet, r.index, 'last_sent_week', weekKey);
    }
  } finally {
    lock.releaseLock();
  }
}

/** Deletes sign-ups never confirmed within PENDING_DAYS. Run daily. */
function cleanupPending() {
  var sheet = getSheet();
  var rows = readAll(sheet);
  var cutoff = Date.now() - PENDING_DAYS * 86400000;
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (r.row.status === 'pending' && new Date(r.row.created_at).getTime() < cutoff) sheet.deleteRow(r.index);
  }
}

/** Run once from the editor: creates the sheet header and both triggers. */
function setup() {
  getSheet().getRange('A:H').setNumberFormat('@');
  ScriptApp.getProjectTriggers().forEach(function (tr) { ScriptApp.deleteTrigger(tr); });
  ScriptApp.newTrigger('weeklySend').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('cleanupPending').timeBased().everyDays(1).atHour(3).create();
}

/** Run from the editor to see this week's email in your own inbox. */
function sendTestToMe() {
  var me = Session.getEffectiveUser().getEmail();
  var weekKey = currentWeekKey(new Date());
  LOCALES.forEach(function (l) {
    sendWeekly(me, l, 'test-token', QUESTIONS[weekIndex(weekKey) % QUESTIONS.length]);
  });
}

// ---- Week maths (pure; tested in the repo) ----------------------------------

/**
 * The week a send belongs to, named by the date of its Sunday (Tashkent time).
 * A new week starts every Sunday at SEND_HOUR_TASHKENT:00 Tashkent time.
 */
function currentWeekKey(now) {
  var tz = new Date(now.getTime() + TZ_OFFSET_MS); // read with UTC getters = Tashkent wall clock
  var boundary = Date.UTC(tz.getUTCFullYear(), tz.getUTCMonth(), tz.getUTCDate() - tz.getUTCDay(), SEND_HOUR_TASHKENT);
  if (boundary > tz.getTime()) boundary -= 7 * 86400000;
  return new Date(boundary).toISOString().slice(0, 10);
}

/** Whole weeks since Sunday 4 Jan 2026, so the question changes each week. */
function weekIndex(weekKey) {
  var start = Date.UTC(2026, 0, 4);
  var d = Date.parse(weekKey + 'T00:00:00Z');
  return Math.max(0, Math.round((d - start) / (7 * 86400000)));
}

function normaliseEmail(v) {
  var s = String(v || '').trim().toLowerCase();
  if (s.length > 254) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : '';
}

// ---- Emails -----------------------------------------------------------------

function sendConfirmation(email, locale, token) {
  var t = T[locale] || T['uz-Latn'];
  var url = webAppUrl() + '?action=confirm&t=' + encodeURIComponent(token);
  MailApp.sendEmail({
    to: email,
    subject: t.confirmSubject,
    name: 'Umr',
    body: t.confirmIntro + '\n\n' + url + '\n\n' + t.confirmIgnore,
    htmlBody: layout(
      '<p style="margin:0 0 20px">' + esc(t.confirmIntro) + '</p>' +
        button(url, t.confirmButton) +
        '<p style="margin:24px 0 0;color:#5B6470;font-size:14px">' + esc(t.confirmIgnore) + '</p>',
      locale
    ),
  });
}

function sendWeekly(email, locale, token, question) {
  var t = T[locale] || T['uz-Latn'];
  var q = question[locale] || question['uz-Latn'];
  var open = APP_URL + '?from=email';
  var unsub = webAppUrl() + '?action=unsubscribe&t=' + encodeURIComponent(token);
  MailApp.sendEmail({
    to: email,
    subject: t.weeklySubject,
    name: 'Umr',
    body: t.weeklyIntro + '\n\n' + q + '\n\n' + t.weeklyButton + ': ' + open + '\n\n—\n' + t.footer + '\n' + t.unsubscribe + ': ' + unsub,
    htmlBody: layout(
      '<p style="margin:0 0 8px;color:#5B6470">' + esc(t.weeklyIntro) + '</p>' +
        '<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;line-height:1.4">' + esc(q) + '</p>' +
        button(open, t.weeklyButton) +
        '<p style="margin:32px 0 0;color:#5B6470;font-size:13px">' + esc(t.footer) +
        ' <a href="' + unsub + '" style="color:#5B6470">' + esc(t.unsubscribe) + '</a></p>',
      locale
    ),
  });
}

function layout(inner, locale) {
  return (
    '<div lang="' + locale + '" style="background:#F6F1E7;padding:24px 12px;font-family:Arial,sans-serif;color:#1E2530;font-size:16px;line-height:1.5">' +
    '<div style="max-width:520px;margin:0 auto;background:#FFFAF0;border:1px solid #E2D9C6;border-radius:12px;padding:28px">' +
    '<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;color:#1F4E8C">Umr</p>' +
    inner +
    '</div></div>'
  );
}

function button(url, label) {
  return '<a href="' + url + '" style="display:inline-block;background:#1F4E8C;color:#F6F1E7;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">' + esc(label) + '</a>';
}

function page(message, t, form) {
  var formHtml = form
    ? '<form method="post" action="' + webAppUrl() + '" target="_top">' +
      '<input type="hidden" name="action" value="' + esc(form.action) + '">' +
      '<input type="hidden" name="t" value="' + esc(form.token) + '">' +
      '<button style="font-size:16px;padding:12px 20px;border-radius:10px;border:0;background:#A62B3F;color:#fff;cursor:pointer">' + esc(form.label) + '</button></form>'
    : '';
  var html =
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<div style="font-family:Arial,sans-serif;max-width:460px;margin:15vh auto;padding:0 16px;color:#1E2530;line-height:1.5">' +
    '<p style="font-family:Georgia,serif;font-size:24px;color:#1F4E8C;margin:0 0 12px">Umr</p>' +
    '<p style="font-size:18px">' + esc(message) + '</p>' + formHtml +
    '<p><a href="' + APP_URL + '" target="_top" style="color:#1F4E8C">' + esc(t.back) + '</a></p></div>';
  return HtmlService.createHtmlOutput(html).setTitle('Umr');
}

// ---- Sheet helpers ----------------------------------------------------------

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    // Plain text everywhere, or Sheets turns '2026-11-15' into a date and the weekly check breaks.
    sheet.getRange('A:H').setNumberFormat('@');
    sheet.appendRow(COLS);
  }
  return sheet;
}

function readAll(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, COLS.length).getValues();
  return values.map(function (v, i) {
    var row = {};
    COLS.forEach(function (c, j) { row[c] = String(v[j]); });
    return { index: i + 2, row: row };
  });
}

function findRow(sheet, col, value) {
  var rows = readAll(sheet);
  for (var i = 0; i < rows.length; i++) if (rows[i].row[col] === value) return rows[i];
  return null;
}

function setCell(sheet, rowIndex, col, value) {
  sheet.getRange(rowIndex, COLS.indexOf(col) + 1).setValue(value);
}

function webAppUrl() {
  return ScriptApp.getService().getUrl();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Lets the repo's tests load the pure functions in Node. Ignored by Apps Script.
if (typeof module !== 'undefined') {
  module.exports = { currentWeekKey: currentWeekKey, weekIndex: weekIndex, normaliseEmail: normaliseEmail, esc: esc };
}
