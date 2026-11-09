// Runs apps-script/Code.gs in Node against fake Google services, end to end.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(__dirname, 'Code.gs'), 'utf8');

type Mail = { to: string; subject: string; body: string; htmlBody: string };

function makeEnv(quota = 100) {
  const rows: string[][] = [];
  const sent: Mail[] = [];
  let remaining = quota;
  let uuid = 0;
  let textFormat = '';
  const cache = new Map<string, string>();
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: (r: unknown[]) => rows.push(r.map(String)),
    getRange: (r: number | string, c?: number, nr?: number, nc?: number) =>
      typeof r === 'string'
        ? { setNumberFormat: (f: string) => (textFormat = f) }
        : ({
      getValues: () => rows.slice(r - 1, r - 1 + (nr ?? 1)).map((row) => row.slice(c! - 1, c! - 1 + (nc ?? 1))),
      setValue: (v: unknown) => {
        rows[r - 1][c! - 1] = String(v);
      },
    }),
    deleteRow: (r: number) => rows.splice(r - 1, 1),
  };
  const ctx: Record<string, unknown> = {
    console,
    JSON,
    Date,
    Math,
    String,
    encodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    MailApp: {
      getRemainingDailyQuota: () => remaining,
      sendEmail: (m: Mail) => {
        if (remaining <= 0) throw new Error('quota');
        remaining--;
        sent.push(m);
      },
    },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache.get(k) ?? null, put: (k: string, v: string) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    Utilities: { getUuid: () => `tok-${++uuid}` },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.example/exec' }) },
    ContentService: { createTextOutput: (s: string) => ({ setMimeType: () => ({ text: s }) }), MimeType: { JSON: 'json' } },
    HtmlService: { createHtmlOutput: (h: string) => ({ setTitle: () => ({ html: h }) }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'me@example.com' }) },
  };
  vm.createContext(ctx);
  vm.runInContext(SOURCE, ctx);
  const fn = (name: string) => ctx[name] as (...a: unknown[]) => any;
  return { ctx, rows, sent, fn, textFormat: () => textFormat, setQuota: (q: number) => (remaining = q), clearCache: () => cache.clear() };
}

const post = (body: object) => ({ postData: { contents: JSON.stringify(body) }, parameter: {} });

describe('week maths', () => {
  const env = makeEnv();
  const key = (iso: string) => env.fn('currentWeekKey')(new Date(iso));
  it('Sunday 19:59 Tashkent is still last week', () => expect(key('2026-11-15T14:59:00Z')).toBe('2026-11-08'));
  it('Sunday 20:00 Tashkent starts a new week', () => expect(key('2026-11-15T15:00:00Z')).toBe('2026-11-15'));
  it('Wednesday belongs to the previous Sunday', () => expect(key('2026-11-18T10:00:00Z')).toBe('2026-11-15'));
  it('week index counts from 4 Jan 2026', () => expect(env.fn('weekIndex')('2026-01-11')).toBe(1));
  it('normalises and validates email', () => {
    expect(env.fn('normaliseEmail')('  A@B.UZ ')).toBe('a@b.uz');
    expect(env.fn('normaliseEmail')('nope')).toBe('');
  });
});

describe('subscribe, confirm, send, unsubscribe', () => {
  let env: ReturnType<typeof makeEnv>;
  beforeEach(() => {
    env = makeEnv();
  });

  it('runs the whole flow', () => {
    const r = env.fn('doPost')(post({ email: 'Nigora@Example.com', locale: 'ru', consent: true }));
    expect(JSON.parse(r.text)).toEqual({ ok: true });
    expect(env.rows[1].slice(0, 3)).toEqual(['nigora@example.com', 'ru', 'pending']);
    expect(env.textFormat()).toBe('@'); // columns kept as plain text
    expect(env.sent).toHaveLength(1);
    expect(env.sent[0].subject).toContain('подтвердите');
    expect(env.sent[0].body).toContain('action=confirm&t=tok-1');

    // Not confirmed yet: nothing weekly.
    env.fn('weeklySend')();
    expect(env.sent).toHaveLength(1);

    const page = env.fn('doGet')({ parameter: { action: 'confirm', t: 'tok-1' } });
    expect(page.html).toContain('Готово');
    expect(env.rows[1][2]).toBe('active');

    env.fn('weeklySend')();
    expect(env.sent).toHaveLength(2);
    expect(env.sent[1].body).toContain('https://umr.grader.uz/?from=email');
    expect(env.sent[1].body).toContain('action=unsubscribe&t=tok-1');
    expect(env.sent[1].htmlBody).not.toContain('undefined');

    // Same week again: no repeat.
    env.fn('weeklySend')();
    expect(env.sent).toHaveLength(2);

    // Opening the unsubscribe link only asks; the tap deletes the row.
    const ask = env.fn('doGet')({ parameter: { action: 'unsubscribe', t: 'tok-1' } });
    expect(ask.html).toContain('<form');
    expect(env.rows).toHaveLength(2);
    const done = env.fn('doPost')({ parameter: { action: 'unsubscribe', t: 'tok-1' } });
    expect(done.html).toContain('удалён');
    expect(env.rows).toHaveLength(1); // header only
  });

  it('refuses sign-up without consent', () => {
    const r = env.fn('doPost')(post({ email: 'a@b.uz', locale: 'en' }));
    expect(JSON.parse(r.text).ok).toBe(false);
    expect(env.rows).toHaveLength(0);
  });

  it('rate-limits repeated sign-ups for one address', () => {
    env.fn('doPost')(post({ email: 'a@b.uz', locale: 'en', consent: true }));
    env.fn('doPost')(post({ email: 'a@b.uz', locale: 'en', consent: true }));
    expect(env.sent).toHaveLength(1);
  });

  it('carries over to later runs when the daily quota runs out', () => {
    for (let i = 0; i < 5; i++) {
      env.fn('doPost')(post({ email: `p${i}@b.uz`, locale: 'uz-Latn', consent: true }));
      env.fn('doGet')({ parameter: { action: 'confirm', t: `tok-${i + 1}` } });
    }
    const before = env.sent.length;
    env.setQuota(13); // reserve is 10, so 3 go out now
    env.fn('weeklySend')();
    expect(env.sent.length - before).toBe(3);
    env.setQuota(100); // next day
    env.fn('weeklySend')();
    expect(env.sent.length - before).toBe(5);
  });

  it('deletes unconfirmed sign-ups after 7 days', () => {
    env.fn('doPost')(post({ email: 'old@b.uz', locale: 'en', consent: true }));
    env.rows[1][5] = new Date(Date.now() - 8 * 86400000).toISOString();
    env.fn('cleanupPending')();
    expect(env.rows).toHaveLength(1);
  });

  it('answers ok for an address that is already active, without a new email', () => {
    env.fn('doPost')(post({ email: 'a@b.uz', locale: 'en', consent: true }));
    env.fn('doGet')({ parameter: { action: 'confirm', t: 'tok-1' } });
    env.clearCache();
    const r = env.fn('doPost')(post({ email: 'a@b.uz', locale: 'ru', consent: true }));
    expect(JSON.parse(r.text)).toEqual({ ok: true });
    expect(env.sent).toHaveLength(1);
    expect(env.rows[1][1]).toBe('ru');
  });

  it('shows the invalid page for an unknown token', () => {
    expect(env.fn('doGet')({ parameter: { action: 'confirm', t: 'nope' } }).html).toContain('Bu havola');
  });
});
