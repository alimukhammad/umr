# Umr — MVP (guest test version)

Umr (Uzbek for "life") shows a person's life as a woven grid of weeks. This is the **guest MVP** for the five Phase 0 user interviews: no server, no account, everything saved in the visitor's own browser.

Built from the Umr product documents (PRD, Technical requirements, Webapp flow, Design brief).

## What's in it

| Screen | Status |
| --- | --- |
| S1 Welcome, language choice | ✅ |
| S2 Birth date, with checks for future dates, over 110 years and 31 Feb | ✅ |
| S13 Adults only (under 18: nothing stored) | ✅ |
| S3 Woven reveal (2 s, no prompt during it, reduced motion respected) | ✅ |
| S4 Grid home: 52 × 90 canvas grid, decade gaps, line at 75, life facts, this week's wisdom, "Need to talk?" | ✅ |
| S5 Year view: 7 × 7 + 3 targets of 44 px+, dates, previous/next year | ✅ |
| S6 Week sheet: private note (1,000 characters, autosaved), milestones | ✅ |
| S7 Milestone form: title, six kinds, date | ✅ |
| S10 Share image, 1080 × 1920, made on the device, no name/date/notes | ✅ |
| S11 Settings: language, theme, horizon 75–100, birth date, JSON export, delete everything | ✅ |
| S12 Support: all five listed numbers, **labelled unverified, for testing only** | ⚠️ Verify before launch |
| S8 Keep your grid (Telegram sign-in + consent) | ⏳ Needs server |
| S9 Weekly reflection in Telegram | ⏳ Needs server and bot |

Audience: people in Uzbekistan at launch. Uzbek Latin is the default whatever the browser language, and weeks roll over at midnight Tashkent time (UTC+5).

Languages: Uzbek Latin, Russian, English — **draft copy**, needs native review. Uzbek uses the current alphabet with ʻ (U+02BB); convert before 22 April 2027.

Wisdom: eight reflection questions plus eight well-known Uzbek proverbs, shown with "Draft – needs source review" until a reviewer signs them off.

## Run it

```bash
npm install
npm run dev          # local development
npm test             # unit tests for the week function (cases from Technical requirements)
npm run build        # static site in dist/ (for Caddy)
npm run build:single # one self-contained dist-single/index.html for a shareable test link
```

## Structure

```
src/lib/week.ts       the one week function + tests (lifeWeek, weekRange, openWeeks, birth checks)
src/lib/grid.ts       canvas drawing shared by the grid and the share image; Design brief palettes
src/lib/store.ts      guest storage (localStorage), JSON export shaped like GET /me/export
src/lib/i18n.ts       locale detection (uz → uz-Latn), date formatting with Uzbek month names
src/lib/wisdom.ts     reflection questions and draft proverbs
src/lib/support.ts    support contacts (ALL UNVERIFIED)
src/locales/          en, ru, uz-Latn copy
src/components/       screens
src/fonts.css         self-hosted Noto Sans/Serif, woff2, split Latin / Latin Ext / Cyrillic
```

## Budgets (from Technical requirements)

- JavaScript: about 85 KB gzipped (target under 150 KB) ✅
- Fonts: about 70 KB for Latin + Cyrillic (target under 100 KB) ✅. Latin Extended loads only for the 2027 letters.
- No third-party analytics, trackers or CDNs.

## Moving to the full build

- Notes and milestone titles move to the server, encrypted (AES-256-GCM), per Backend schema.
- `exportJSON` already matches the planned `/me/export` shape.
- Translations live in plain TS objects; swap to i18next when Russian plural forms are needed.
- Before any real user data: Gate 3 (safety review, legal steps, restore rehearsal).
