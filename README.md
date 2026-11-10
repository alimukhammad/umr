# Umr

Umr (Uzbek for "life") shows a person's life as a woven grid of weeks. Live at **https://umr.grader.uz** (GitHub Pages, DNS on eskiz.uz).

**Umr has no server.** The birth date, notes and milestones stay in the visitor's own browser. The only thing that leaves the phone is an email address, if someone asks for the weekly email; a Google Apps Script handles that (see [`apps-script/`](apps-script/README.md)).

## What's in it

| Screen | Status |
| --- | --- |
| S1 Welcome, language choice (Uzbek Latin first) | ✅ |
| S2 Birth date, with checks for future dates, over 110 years and 31 Feb | ✅ |
| S13 Adults only (under 18: nothing stored) | ✅ |
| S3 Woven reveal (2 s, no prompt during it, reduced motion respected) | ✅ |
| S4 Grid home: 52 × 90 canvas grid, decade gaps, line at 75, life facts, this week's wisdom, "Need to talk?" | ✅ |
| S5 Year view: 7 × 7 + 3 targets of 44 px+, dates, previous/next year | ✅ |
| S6 Week sheet: private note (1,000 characters, autosaved), milestones | ✅ |
| S7 Milestone form: title, six kinds, date, optional emoji | ✅ |
| Life Emoji: 8 Noto emoji as pins on the grid (7 px phone, 11 px desktop), year view and share image; dove free, the rest unlocked by a signed code | ✅ Needs payment link and contact settings |
| S9 Weekly reflection by email: email + consent, double opt-in, Sunday 20:00 Tashkent | ✅ Needs the Apps Script deployed |
| S10 Share image, 1080 × 1920, made on the device, no name/date/notes | ✅ |
| S11 Settings: language, theme, horizon 75–100, birth date, email, download and restore a backup file, delete everything | ✅ |
| S12 Support: all five listed numbers, **labelled unverified, for testing only** | ⚠️ Verify before launch |
| S8 Accounts and sync across devices | Not planned for now (no server) |

Audience: people in Uzbekistan at launch. Uzbek Latin is the default whatever the browser language, and weeks roll over at midnight Tashkent time (UTC+5).

Languages: Uzbek Latin, Russian, English — **draft copy**, needs native review. Uzbek uses the current alphabet with ʻ (U+02BB); convert before 22 April 2027.

Wisdom: eight reflection questions plus eight well-known Uzbek proverbs, shown with "Draft – needs source review" until a reviewer signs them off. The weekly email uses the questions only.

## Run it

```bash
npm install
cp .env.example .env   # optional: paste the Apps Script web app URL to show the email sign-up
npm run dev            # local development
npm test               # week function, backup import, and the Apps Script run against fake Google services
npm run build          # static site in dist/
npm run build:single   # one self-contained dist-single/index.html for a shareable test link
```

## Put it online at umr.grader.uz (one time, about 10 minutes)

Every push to `main` builds, tests and publishes the site through GitHub Pages (`.github/workflows/deploy.yml`).

1. **GitHub:** in this repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. **DNS:** on eskiz.uz (grader.uz → DNS records → + Add): name `umr`, TTL `3600`, type `CNAME`, record `alimukhammad.github.io.` — done 9 Nov 2026.
3. **Domain:** back in **Settings → Pages**, enter `umr.grader.uz` as the custom domain, wait for the DNS check, then tick **Enforce HTTPS**. The `public/CNAME` file keeps this setting on every deploy.
4. **Email sign-up:** after deploying the Apps Script, open **Settings → Secrets and variables → Actions → Variables**, add `VITE_REMINDER_ENDPOINT` with the web app URL, then re-run the deploy workflow. Until then the app says "Coming soon" where the sign-up would be.

## Life Emoji: selling unlock codes by hand

There is no server, so payment and unlocking are separate:

1. The buyer taps a locked emoji while adding a milestone and sees the price (50,000 so'm), a **Pay** button (your Payme or Click payment link) and **Email us** / **Message on Telegram** buttons.
2. You check the payment arrived, then make a code on your computer:
   ```bash
   npm run unlock:code -- /path/to/umr-unlock-private.pem
   ```
   It prints a code like `UMR1-…` and a short code ID. Write the ID next to the buyer and payment in your records.
3. Send the code. The buyer pastes it into the offer, or into **Settings → Life Emoji**. The app checks the signature with the public key in `src/lib/unlock.ts`; nothing is sent anywhere.

Keep `umr-unlock-private.pem` **off GitHub** (`*.pem` is ignored) and backed up somewhere safe. Anyone with it can make codes. If it leaks, make a new key pair, replace the public key in `src/lib/unlock.ts`, and send existing buyers new codes. Codes can be shared between people; without accounts that can't be stopped.

To turn the buttons on, add these repository variables (Settings → Secrets and variables → Actions → Variables) and re-run the deploy:

| Variable | Example |
| --- | --- |
| `VITE_PAYMENT_URL` | your Payme or Click payment link (must start with `https://`) |
| `VITE_ORDER_EMAIL` | the address buyers write to (it appears on the public site) |
| `VITE_ORDER_TELEGRAM` | your Telegram username, without `@` |
| `VITE_EMOJI_PRICE_UZS` | `50000` (the default) |

Before taking real money, settle the receipt (IKPU) and IT Park questions in the docs' Registration tab.

Emoji artwork: Noto Emoji by Google, Apache License 2.0 (`public/emoji/NOTICE.txt`).

## Structure

```
src/lib/week.ts         the one week function + tests (lifeWeek, weekRange, openWeeks, birth checks, Tashkent today)
src/lib/grid.ts         canvas drawing shared by the grid and the share image; Design brief palettes
src/lib/store.ts        browser storage, JSON backup export and import
src/lib/reminders.ts    email sign-up call to the Apps Script
src/lib/emoji.ts        the 8 Life Emoji, which one shows per week, image loading
src/lib/unlock.ts       unlock code check (ECDSA P-256 public key)
tools/make-unlock-code.mjs  makes a signed unlock code from your private key
public/emoji/           the 8 Noto Emoji SVGs and their licence
src/lib/i18n.ts         languages, date formatting with Uzbek month names
src/lib/wisdom.ts       reflection questions and draft proverbs
src/lib/support.ts      support contacts (ALL UNVERIFIED)
src/locales/            en, ru, uz-Latn copy
src/components/         screens
src/fonts.css           self-hosted Noto Sans/Serif, woff2, split Latin / Latin Ext / Cyrillic
apps-script/            the Google Apps Script for weekly emails, its setup guide and tests
```

## Budgets (from Technical requirements)

- JavaScript: about 92 KB gzipped (target under 150 KB) ✅
- Fonts: about 70 KB for Latin + Cyrillic (target under 100 KB) ✅. Latin Extended loads only for the 2027 letters.
- No third-party analytics, trackers or CDNs.

## Limits of the no-server setup

- Notes live in one browser. A new phone or a cleared browser loses them unless the person restores a downloaded backup file.
- Free Gmail sends to 100 recipients a day, so Sunday emails spill into Monday and later past about 90 subscribers. Move to Google Workspace (1,500 a day) before launch.
- If accounts or sync are wanted later, the server design in the product documents still applies; `exportJSON` already matches its planned `/me/export` shape.
