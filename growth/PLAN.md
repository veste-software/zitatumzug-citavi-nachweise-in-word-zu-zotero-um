# Growth plan (prep, written 2026-11-08)

Base URL comes from `SITE_URL`. Nothing here is live yet; no real traffic data exists.

## What was done in prep
- Every page already has a unique title, description, one H1 and a canonical URL (checked in `src/pages/*.astro`).
- `Base.astro` now emits Open Graph and Twitter tags on every page, and accepts `jsonLd` for structured data.
- Home page carries `WebApplication` (price 9 EUR, scan and test copy free) and `FAQPage`. Both match visible content. No ratings, no review counts.
- `sitemap-index.xml` (via `@astrojs/sitemap`) and `robots.txt` exist. Static HTML; the only JS is the tool island.
- Not done: `og:image` (needs a real PNG, no image asset exists) and `BreadcrumbList` (site is one level deep, no value).
- Not verified: the build could not be run in this session (shell denied). Run `npm run build`, `npm test`, `npm run design-check` before launch.

## Query-to-page map (from SPEC §8)
| Query group | Page | Status |
|---|---|---|
| citavi zotero word / zitate umwandeln | `/` | tool, served |
| citavi lizenz abgelaufen / campuslizenz endet | `/citavi-lizenz-abgelaufen/` | served; the university table only keeps rows with an opened source |
| citavi felder zotero / feldfunktion | `/citavi-felder-zotero/` | served |
| citavi literaturliste retten | `/literaturliste-aus-word-retten/` | served (free export) |
| English queries | none | out of v1; do not fake a page |

## Conversion
- Price and free tier are visible next to the tool (hang tag, step table). No ads, no countdowns, no counters.
- Cookie-free events: `scan_done`, `test_download`, `checkout_start`, `full_download`. The funnel to watch: scan_done -> test_download -> checkout_start -> full_download.
- Do not change price in the first 30 days; change one thing at a time and log it in `growth/LOG.md`.

## 30-day plan
**Week 0 (before launch, human):** Search Console and Bing Webmaster Tools (verify the domain, submit `sitemap-index.xml`, use IndexNow from Bing). Real round trip with 3+ documents passes first (SPEC §11.2). Don't announce anything before that.

**Week 1:** Launch. Request indexing for the 5 content URLs in Search Console. Check that the sitemap shows 5 URLs (not 404, legal pages optional).

**Week 2: legitimate places to be found** (read each one's rules, answer real questions, no drive-by links):
- Zotero Forums (forums.zotero.org): existing threads on migrating from Citavi. Answer with the manual steps first, mention the tool as one option and say that you built it.
- r/Zotero, r/AskAcademia, r/Studium, r/de_EDV: only where someone asks. Disclose authorship.
- The page for "Zotero: Migrating from Citavi" on the Zotero documentation wiki is community-edited; propose a link only if the maintainers accept it.
- Fachschaft/Uni-Blogs and Hochschulbibliotheken that already have a "Umstieg Citavi auf Zotero" page (Göttingen, Münster, Greifswald are named in SPEC). Send one short mail to the Zotero/Citavi contact: what it does, what it does not, a link to the free scan. Owner decides on outreach (SPEC §11.7).

**Week 3:** Read Search Console. Rewrite titles/descriptions of pages with impressions but no clicks. Look at which queries lead to `/citavi-lizenz-abgelaufen/`; extend the verified university table with new rows (each only with an opened source and a "Stand" date).

**Week 4:** Decide on one new page only if queries show it (candidates: "Citavi Fußnoten Zotero Seitenzahlen", "Zotero Zitierstil Fußnoten Jura einstellen" as a real how-to). No keyword variants, no per-university pages.

## Outreach ideas that are not spam
- Offer libraries a plain-text snippet they can paste into their migration guide, and a test file to try the free scan.
- Write one honest post on how Citavi stores citations in .docx (the content of `/citavi-felder-zotero/`) for people who like the technical side; post it where such posts are welcome (Zotero forum, a personal blog).
- "Verify it yourself" angle: the page states that the file stays in the browser; add the self-host / source link only if the owner decides to publish the code.

## Human tasks
See `humanTasks` in the report.
