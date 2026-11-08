# QA report – round 1

Verdict: **not passed**, one blocker (silent data corruption in long citation fields). Everything else checked is in order.

## What I ran

- `npm test`: 69 tests green (Builder's suite). Real-fixture tests print `SKIPPED: no real Citavi fixtures`, as the spec allows.
- `npm run build`, `npm run build:preview`, `npm run lint` (astro check: 0 errors), `node scripts/design-check.mjs` (nothing found), `npm audit --omit=dev` (0 vulnerabilities), `npm run size` (26 kB gzip JS in total).
- New file `tests/qa.test.ts` with three independent probes. Two pass (block-level SDT in a table cell; `[Content_Types].xml` stays the first zip entry and a converted file scans as 0 citations). **One fails: the blocker below.**

## Blocker

1. **Citation instruction is cut through a surrogate pair, which corrupts the reference data.** `chunks()` in `src/core/convert.ts:30` slices the `ADDIN ZOTERO_ITEM …` text every 250 UTF-16 code units. A character outside the Basic Multilingual Plane (emoji, mathematical letters such as 𝒳, rare CJK) that straddles a boundary is split across two `w:instrText` runs. Each half is then written as a lone surrogate, which UTF-8 encoding turns into U+FFFD. The title in the field changes, and Word and Zotero read damaged data. Fix: when slicing, never end a chunk on a high surrogate (move the boundary back by one), or split by code points (`Array.from`). `tests/qa.test.ts` "non-BMP characters survive…" reproduces it and must go green.

## Acceptance criteria (SPEC §6)

| # | Result |
|---|---|
| 1 | Pass: build and tests green, core takes an injected parser. |
| 2–10 | Pass by the Builder's tests (scan counts vs `expected.json`, zero leftover SDTs, schema validation, locators/prefix, shared ids, noteIndex, one `ZOTERO_BIBL`, untouched zip parts, 10-citation test mode). I did not find a contradiction, except the blocker above. |
| 11 | Pass: valid, expired, tampered and wrong-key tokens tested; `convertDocx` returns `locked` without `unlock`. |
| 12 | Pass: checkout 503 without key, mocked Stripe returns a URL, verify returns a token (paid) or 402. |
| 13 | Pass (recorded fixtures); the feature is hidden behind `PUBLIC_ENABLE_LINKING`. |
| 14 | Pass. |
| 15 | Pass: CSP `connect-src 'self' https://api.zotero.org https://cloudflareinsights.com`, inline scripts by hash in `dist/_headers`, no cookies, event payload is only a name. |
| 16 | Pass: 500 citations in about 0.4 s. |
| 17 | Pass: 8 pages, unique titles and descriptions, one `h1`, canonical, sitemap, robots, footer legal links. |
| 18 | Pass: one-sentence "only in your browser" notice, non-affiliation note, price and free parts visible, §356 BGB consent checkbox before checkout, no counters, testimonials, logos or countdowns. |
| 19 | Pass: `.doc`, `.odt`, non-zip, no-Citavi and text-placeholder messages in German, no download. |

## Preview (`npm run build:preview`)

All internal links, stylesheet and font URLs, sitemap entries and the robots sitemap line start with `/preview/`. API calls go through `href()`. On GitHub Pages the functions do not exist, so checkout falls back to "Bezahlung ist gerade nicht verfügbar." (the response is not `ok`). Passes.

## Look

Matches `DESIGN.md`: Zilla Slab and Source Serif 4 self-hosted, kraft/manila/ink palette, square buttons, ledger tables, hang tag only on the scan result and the price. No side-border callouts, gradients, blur, emoji, UI kit or CDN font. The home page is not the stock hero + three cards pattern. No blockers.

## Warnings

- `functions/api/verify.ts`: any paid session id mints a new 30-day token every time it is called, with no age check. A saved success URL gives an unlimited pass. Check `session.created` (reject if older than 30 days) and set `exp` to `created + 30 days`.
- Without JavaScript the tool area is empty and there is no `<noscript>` message. The text around it is real content, but add one line saying the tool needs JavaScript.
- The withdrawal-waiver consent is only a client-side checkbox; nothing records it. Consider Stripe's `consent_collection` or `custom_text` on the Checkout session so the consent is also on the Stripe record.
- `src/lib/zotero.ts:26`: the query `itemType=-attachment || note` is odd Zotero syntax (it still returns everything). Harmless, because linking is off, but check it when the CORS check is done.
- Canonical URLs and the sitemap default to `https://zitatumzug.de` when `SITE_URL` is unset. That domain is not registered yet (human task 3). Set `SITE_URL` in every deploy.
- The full-conversion gate is a boolean (`unlock: true`) checked in the UI. Accepted in SPEC §7 (client-side processing).
- The conversion format is only tested on synthetic fixtures. Zotero's behaviour on citations without `uris` and without `ZOTERO_PREF` is unverified (SPEC open risk).
- Impressum, the Datenschutz controller and the Widerruf address are bracketed placeholders (allowed as drafts, but they must not go live).

## Human tasks

See the `humanTasks` field in the final message.

## Round 2

Verdict: **pass**. The round 1 blocker is fixed in `src/core/convert.ts` (`chunks()` no longer ends a chunk on a high surrogate). `tests/qa.test.ts` "non-BMP characters survive…" is now green.

Re-run: `npm test` 72/72 green, `npm run build` and `npm run build:preview` OK (8 pages), `design-check` nothing found, `npm audit --omit=dev` 0 vulnerabilities. Preview build: sitemap entries and the robots sitemap line start with `/preview/`, and no internal href/src is root-relative. The round 1 warnings still stand (verify.ts re-mints tokens, no noscript line, placeholder legal data, SITE_URL default).

## Round 1: blockers

- (medium) chunks() splits the ADDIN ZOTERO_ITEM instruction every 250 UTF-16 code units and can cut a surrogate pair in two. Each half is written as a lone surrogate and becomes U+FFFD, so titles or other data in the field are silently corrupted. Fix: never end a chunk on a high surrogate (move the boundary back by one) or split by code points. tests/qa.test.ts 'non-BMP characters survive…' reproduces it and must pass. [src/core/convert.ts:30 (chunks), reproduced by tests/qa.test.ts]
