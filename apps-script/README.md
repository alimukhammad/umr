# Umr weekly emails (Google Apps Script)

Umr has no server. This script, bound to a Google Sheet in your account, does three things:

1. Takes sign-ups from the app and sends a "confirm your email" message.
2. Sends one email every Sunday from 20:00 Tashkent time, with this week's question and a button that opens Umr.
3. Deletes a person's row when they unsubscribe, and deletes sign-ups nobody confirmed within 7 days.

The Sheet holds only: email, language, status, a random token, consent version and dates. No birth date, no notes.

## Set it up (about 10 minutes)

1. Sign in to the Google account that will send the emails. Use a dedicated one, such as `umr.reminders@gmail.com`, not your personal inbox.
2. Create a new Google Sheet named **Umr subscribers**. Don't share it with anyone.
3. In the Sheet, open **Extensions → Apps Script**.
4. Replace the contents of `Code.gs` with [`Code.gs`](Code.gs) from this folder.
5. Click the gear (**Project settings**), tick **Show "appsscript.json" manifest file in editor**, then replace that file with [`appsscript.json`](appsscript.json).
6. Back in the editor, choose the function **setup** and click **Run**. Approve the permissions. This creates the `subscribers` tab and two triggers: hourly sending and daily cleanup.
7. Click **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
8. Put that URL in the app: in the repo, set `VITE_REMINDER_ENDPOINT` (see the main README) and rebuild.
9. Choose **sendTestToMe** and click **Run** to see this week's email in all three languages in your own inbox.

When you change `Code.gs` later: **Deploy → Manage deployments → Edit → Version: New version**. The URL stays the same.

## Limits to know

- **100 recipients a day** on a free Gmail account, **1,500** on paid Google Workspace ([Google's quota table](https://developers.google.com/apps-script/quotas)). Confirmation emails count too; the script keeps 10 a day for them.
- Everyone gets Sunday's email from 20:00. If the day's quota runs out, the rest go out in the following hourly runs, so with free Gmail and more than about 90 subscribers some people will get it on Monday or later. Move to Workspace before launch.
- Apps Script web apps don't send CORS headers, so the app posts in `no-cors` mode and can't read the reply. It always tells the person to check their inbox.

## Privacy notes for the lawyer

- Email addresses are stored in Google's data centres, outside Uzbekistan. Since March 2026 that is allowed for ordinary personal data under conditions; confirm which one applies.
- Consent is recorded as `consent_version` (the date of the wording shown in the app) and `created_at`.
- Unsubscribing deletes the row immediately. Google keeps sent-mail copies in the sending account; delete them periodically if the lawyer advises.

## Tests

`apps-script/code.test.ts` runs this script in Node against fake Google services: sign-up, confirm, weekly send, no repeat in the same week, quota carry-over, unsubscribe, cleanup. Run `npm test` in the repo root.
