# SPEC: Zitatumzug – Citavi-Nachweise in Word zu Zotero umwandeln

Decision: **build**. Platform: **web** (static site plus two small serverless functions). UI language: **German**.
Spec written 2026-11-08 by the Product lead. Every factual claim below was checked by me on that date, unless it is marked otherwise.

---

## 1. Problem and users

German universities are ending their Citavi campus licences. Students and researchers who wrote a thesis, dissertation or paper with the Citavi Word add-in have Word documents full of Citavi citation fields. Zotero cannot read those fields. Every library guide I opened gives the same advice: copy the document, delete every citation and insert it again by hand with the Zotero plugin. For a thesis with 100 to 400 citations, that means hours of error-prone work. It is worst for numeric styles, where Göttingen says you cannot just keep citing with Zotero.

**Users:** students (bachelor, master, state exams) and PhD candidates in Germany, Austria and Switzerland who
- wrote part of a document with the Citavi Word add-in (Citavi 6/7 desktop, Windows),
- are moving to Zotero because their campus licence ends or has ended, and
- want to keep working on that document with live citations and an automatic bibliography.

**Job to be done:** "Turn the Citavi citations in my .docx into Zotero citations that Zotero can refresh, without retyping anything and without uploading my unpublished thesis anywhere."

## 2. Why now

- **Trigger (confirmed):** campus licences end in a wave. Göttingen ends on 30 Nov 2026. Münster ends on 31 Dec 2026, and its library sent a reminder on 26 Oct 2026. Search results also list FH Aachen (30 Jun 2026), FH Dortmund (31 Aug 2026), HCU Hamburg (31 Dec 2026) and BTU Cottbus ("last extension"); I saw these in search results but did not open them. Konstanz already ended in March 2024, so this is a recurring pattern.
- **Window:** peak demand runs from now to about mid-January 2027, around the deadlines. After that, a long tail through 2027 as theses started in Citavi get finished and more universities drop the licence.
- **What keeps the gap open:** the conversion was always technically possible, because the reference data sits inside the .docx (see §3). But the only tool that tries is a 1-star Python desktop app. Library guides keep saying "not possible". Zotero added conversion for Mendeley citations but not for Citavi.
- **Ship by: 2026-11-22** (before the Göttingen deadline). A narrow v1 that works beats a broad one in January.

## 3. Evidence (confirmed by me on 2026-11-08)

| What | Source | Confirmed |
|---|---|---|
| Münster: campus licence ends 31.12.2026 and will not be renewed because of higher costs. Projects may become inaccessible. Reminder dated 26.10.2026. | https://www.uni-muenster.de/ZBSoz/bibliothek/aktuell/nachricht/3269 | opened |
| SUB Göttingen: licence ends 30 Nov 2026. "References in your text that were created with Citavi cannot currently be automatically linked to Zotero." The workaround is to delete the citations and add them again. You can keep citing with Zotero in author-year or footnote styles, **not in numeric styles**. A private Citavi licence is the alternative. | https://sub.uni-goettingen.de/en/studying/courses/switching-from-citavi-to-zotero | opened |
| ThesisDraft (16 Aug 2026): citations from the Word add-in or the Citavi Assistant cannot be transferred. It recommends re-citing chapter by chapter with the Zotero plugin. | https://thesisdraft.com/de/blog/citavi-word-zitate-retten/ | opened |
| Zotero forum (29 Jun 2022): "you have to re-insert the citations via the Zotero add-on". The need is a standing one. | https://forums.zotero.org/discussion/comment/411174/ | opened |
| Greifswald and Bielefeld give the same advice (no automatic conversion; re-set the citations). | https://ub.uni-greifswald.de/en/service/other-services/reference-management/citavi/switching-from-citavi-to-zotero/ , https://www.uni-bielefeld.de/ub/learn/refman/faq/ | search-result snippets only |
| **Feasibility 1:** CiteMigrate's source finds Citavi citations as `w:sdt` content controls whose `w:tag/@w:val` starts with `CitaviPlaceholder#`. The payload is the joined `w:instrText` inside `w:sdtContent`, decoded as base64 → UTF-8 JSON (with a fallback for raw JSON or a leading token). Entries sit under `Entries`. The bibliography is an `w:sdt` whose tag contains `CitaviBibliography` or `CitaviFilteredBibliography`. Citations also appear in `footnotes.xml` and `endnotes.xml`. | https://raw.githubusercontent.com/iandus/CiteMigrate/main/citemigrate.py | opened (GPL-3.0: use the format facts only, copy no code) |
| **Feasibility 2:** biblatex-csl-converter 3.6.0 (Fidus Writer) parses the Citavi "WordPlaceholder citation format used in docx exports": `{ Entries: [ { Id, ReferenceId, Reference: {...full reference...}, Prefix, Suffix, PageRange, QuotationType, UseStandardPrefix, ... } ] }`. Reference fields: `Authors/Editors/Organizations` (with `FirstName/LastName/MiddleName/Name`), `Title/Subtitle`, `Year/Date`, `Periodical`, `Volume/Number`, `PageRange`, `Publishers`, `PlaceOfPublication`, `Doi/Isbn/Issn`, `OnlineAddress`, `ReferenceType`, `ParentReference` and others. | https://unpkg.com/biblatex-csl-converter@3.6.0/src/import/citavi.ts | opened |
| Zotero renders citations that are not linked to the library from the item metadata embedded in the document (the "Cited" items). | https://forums.zotero.org/discussion/comment/368761/ | search-result snippets only |
| Zotero Web API: a forum reply says CORS is allowed from any origin. | https://forums.zotero.org/discussion/comment/345958/ | search-result snippet only. **Must be verified in the spike** |
| Recency check: my German and English searches today found no browser tool and no new converter. Library guides still say it is impossible. | own searches 2026-11-08 | — |

**What this means:** every Citavi citation field carries the full reference metadata. The conversion therefore needs neither Citavi, nor a licence, nor the Citavi project. That is the core promise: *it still works after the licence has expired.*

**Not verified (open risks):** the exact shape of `PageRange` and of the JSON.NET `$id`/`$ref` back-references in real payloads, the Citavi Assistant (Citavi Web Office add-in) format, and Zotero's behaviour on first refresh without `ZOTERO_PREF` document properties. All of these go to the spike and the human round trip (§11).

## 4. Positioning

**The gap in one sentence:** Zitatumzug is the only tool that turns the Citavi citations already in your Word file into live Zotero citations, in your browser, with nothing to install, no account, and no Citavi licence needed, keeping page numbers, prefixes and footnotes.

| Alternative | URL | What it lacks |
|---|---|---|
| Re-insert by hand with the Zotero plugin (what libraries recommend) | https://sub.uni-goettingen.de/en/studying/courses/switching-from-citavi-to-zotero | Hours of work for a thesis, easy to miss a citation, page numbers retyped by hand. In numeric styles you cannot mix old and new. |
| Citavi "Save a copy as static text" | https://www.citavi.com/sub/manual5/en/convert_citavi_fields_to_static_text.html (search result) | Kills the fields. The bibliography and numbering no longer update, and new Zotero citations won't merge with the old ones. |
| Private Citavi licence (Lumivero) | linked from the Göttingen page | Costs money (price not verified here), keeps you locked into Citavi on Windows, and is exactly what the universities are moving away from. |
| Citavi Free | (Göttingen FAQ snippet) | Projects over 100 titles become read-only. Windows only. Does not move you to Zotero. |
| CiteMigrate | https://github.com/iandus/CiteMigrate | Python/PyQt desktop app (git clone + pip), "only tested under macOS", needs a Zotero Web API key and the library already in Zotero. It matches fuzzily and **does not read PageRange, Prefix or Suffix, so page numbers are lost**. 1 star, last push 2026-02-25. |
| literaturverwaltungsmigration (benedikt-e) | https://github.com/benedikt-e/literaturverwaltungsmigration | Moves the library and knowledge items only. Says outright that Word citations cannot be converted. |
| Zotero's built-in Citavi project import | Göttingen page | Library only, nothing in Word documents. |
| Zotero's Mendeley citation conversion | — | Mendeley only. |

**What only Zitatumzug does:**
1. Reads the reference data **embedded in the .docx itself**, so it works without Citavi, without the project and after the licence has expired.
2. Writes real Zotero fields (`ADDIN ZOTERO_ITEM CSL_CITATION`) with full item data, **page numbers (locators), prefixes and suffixes**, in the body, footnotes and endnotes, and puts a Zotero bibliography field where the Citavi bibliography was.
3. Optionally **links** the citations to the user's own Zotero library, matching exactly on DOI, ISBN or title + year + first author, never fuzzily.
4. Runs **entirely in the browser**. The thesis never leaves the computer. The page says this in one plain sentence, and the CSP header enforces it.
5. A **free scan** shows within seconds how many citations were found and how many are readable, and a free test copy converts 10 of them, before anyone pays.

## 5. MVP scope

### In

1. **Upload and scan (free, no account).** Drag and drop or pick a `.docx`. The file is read with a JS zip library in the browser and is never sent anywhere. The scan reports:
   - the number of Citavi citation fields (body / footnotes / endnotes),
   - the number of unique references,
   - the number of citations with a page locator,
   - the number of unreadable fields (payload not decodable),
   - whether a Citavi bibliography is present,
   - other citation fields found (Zotero, EndNote, Word's own) that are left untouched,
   - a preview table of the first 10 converted citations (visible text, first author, year, title, locator).
2. **Free test copy:** download `<name>_zotero-test.docx` with **the first 10 citations** converted (in document order) and the rest left as they were. The user checks it in Word with Zotero.
3. **Full conversion (paid):** with a valid unlock token, download `<name>_zotero.docx` with every readable citation converted and the Citavi bibliography replaced by a Zotero bibliography field.
4. **Conversion rules** (Architect and Builder refine them after the spike):
   - Parts: `word/document.xml`, `word/footnotes.xml`, `word/endnotes.xml`. Other parts are copied byte for byte.
   - Each `w:sdt` whose tag starts with `CitaviPlaceholder#` is replaced by a complex field (`fldChar` begin → `instrText` ` ADDIN ZOTERO_ITEM CSL_CITATION {json} ` → `fldChar` separate → the original visible text, keeping the run properties of the first display run → `fldChar` end). Long instructions are split across several `w:instrText` runs. Inline versus block SDTs must both keep valid paragraph structure.
   - Decode the payload as base64 → UTF-8 → JSON, tolerating a leading token (e.g. `ADDIN CitaviPlaceholder`) and raw JSON. Resolve JSON.NET `$id`/`$ref` references before mapping.
   - CSL citation JSON: a random `citationID`; `properties: { noteIndex }` (the footnote number when inside footnotes or endnotes, else 0); **no** `formattedCitation`/`plainCitation`, so that Zotero regenerates the text on refresh without a "modified citation" prompt; one `citationItem` per entry with `itemData` (CSL-JSON mapped from `Reference`), `locator` + `label: "page"` from `PageRange`, and `prefix`/`suffix`; and the schema `https://github.com/citation-style-language/schema/raw/master/csl-citation.json`.
   - Each reference gets one stable CSL `id` per document (derived from the Citavi `Reference.Id`), so repeat citations of the same work give one bibliography entry.
   - Map Citavi `ReferenceType` to CSL type: at least Book, BookEdited, Contribution (chapter, with container, editors and publisher from `ParentReference`), JournalArticle, NewspaperArticle, Thesis, InternetDocument, ConferenceProceedings / contribution in proceedings, Report/GreyLiterature, Lecture, UnpublishedWork, StatuteOrRegulation, CourtDecision. Anything else falls back to `document`. Persons map to `family`/`given`; organisations map to `literal`.
   - **Standard prefix option:** the user can type a standard prefix once (e.g. "Vgl."). It is written as `prefix` for entries whose payload has `UseStandardPrefix: true`, unless they already have their own prefix. Leave the field empty to skip.
   - Replace the Citavi bibliography `w:sdt` (tag contains `CitaviBibliography` or `CitaviFilteredBibliography`) in place with ` ADDIN ZOTERO_BIBL {"uncited":[],"omitted":[],"custom":[]} CSL_BIBLIOGRAPHY ` and the display text "{Literaturverzeichnis – wird von Zotero beim Aktualisieren erzeugt}". If there is no Citavi bibliography, add none and tell the user how to insert one in Zotero.
   - Fields that cannot be read are left untouched and listed in the report with their visible text.
5. **Optional library linking (in the paid conversion, if the CORS spike passes).** The user pastes a read-only Zotero API key. The browser calls `https://api.zotero.org` directly: it finds the userID through `/keys/<key>`, then pages through `/users/<id>/items`. Matching is **exact only**: DOI, then normalised ISBN, then normalised title + year + first author's family name, and only when exactly one candidate matches. Matched items get `uris: ["http://zotero.org/users/<id>/items/<key>"]`. Unmatched items stay as embedded data. The key is held in memory only and goes nowhere except api.zotero.org. If the spike fails, this feature moves to "Out", and v1 ships with embedded data only.
6. **Free reference export:** download every unique cited reference as **RIS** and as **CSL-JSON**. This is useful when the Citavi project is gone. It also backs the page `/literaturliste-aus-word-retten/`.
7. **After-conversion guide** on the result screen: open the file in Word with Zotero 7 → Zotero tab → Document Preferences → choose a style → Refresh. It also covers footnote styles, numeric styles and the "Cited" section in the Zotero dialog for citing the same works again.
8. **Payment:** Stripe Checkout in test mode, no account. A success redirect leads to a verify function that issues a signed unlock token (Ed25519, expiry 30 days). The token is stored in `localStorage` and also shown as a copyable code, so it can be entered on another device.
9. **Pages:** see §8, plus Impressum, Datenschutz, and Kaufbedingungen & Widerrufsbelehrung.
10. **Cookie-free analytics** (Cloudflare Web Analytics or similar) and one anonymous event counter (`scan_done`, `test_download`, `checkout_start`, `full_download`). It carries the event name only: no file data, no citation counts tied to a person, no IP storage.

### Out (v1)

- An English UI or English pages (v1.1 if German traction appears), and the Austrian and Swiss variants of the legal text.
- `.doc`, `.odt`, LibreOffice and Google Docs. Converting from EndNote, Mendeley or other tools.
- Citavi **text placeholders** (`{Miller 2009 #84}`) and the **Citavi Assistant / Citavi Web** format. The scan detects them where it can and says plainly that they are not supported yet.
- Converting Citavi citation styles to CSL. Knowledge items (Wissenselemente), categories, PDFs, project files (`.ctv6`).
- Fuzzy matching. Writing `ZOTERO_PREF` document properties (only after the human round trip proves the format; until then the user picks the style in Zotero).
- Accounts, a server-side file upload, batch upload, an institution licence (a "Bibliotheken: schreiben Sie uns" mailto line is enough), ads.
- Per-university landing pages (doorway risk). One verified table page instead (§8).

## 6. Acceptance criteria (QA checks every item without a live account, a paid key or a store)

**Fixtures.** The Builder creates **synthetic fixtures** that follow the structure in §3 exactly: `author-year.docx` (body citations, Citavi bibliography), `footnotes.docx` (citations in `footnotes.xml`, with locators, prefix/suffix and `UseStandardPrefix`), `numeric.docx`, `edge.docx` (a `$id`/`$ref` payload, a `ParentReference` chapter, an organisation author, umlauts, one undecodable payload, an inline and a block SDT, a pre-existing Zotero field), `no-citavi.docx`, and `large.docx` (500 citations). Their payload JSON is generated by a script kept in the repo.
**Real fixtures** in `fixtures/real/*.docx` (gitignored) are a human task. Tests over them run when files are present and otherwise print `SKIPPED: no real Citavi fixtures`. **QA must not fail the build because real fixtures are missing**; the go-live gate for that is human task 2.

1. `npm test` and `npm run build` pass. The conversion core is a pure TS module and runs in Node without DOM globals beyond an injected XML parser.
2. On each synthetic fixture, the scan reports the exact expected counts (body / footnotes / endnotes / unique references / with locator / unreadable / bibliography present / other fields).
3. In full mode, the output has **zero** remaining `CitaviPlaceholder#` SDTs except the unreadable ones. The number of `ZOTERO_ITEM` fields equals the number of readable Citavi fields.
4. Every `ZOTERO_ITEM` instruction parses as JSON and validates against the vendored `csl-citation.json` schema. Its `fldChar` begin/separate/end are balanced, and it sits inside a valid `w:p` (the XML stays well-formed and every `w:sdt` / `w:p` / `w:r` nesting is legal).
5. Locators, labels, prefixes and suffixes in the fixtures appear in the matching `citationItems`. With the standard prefix "Vgl." set, exactly the entries with `UseStandardPrefix: true` and no own prefix get `prefix: "Vgl."`.
6. Two citations of the same Citavi reference share one CSL `id`. The `ParentReference` chapter has `type: "chapter"` with `container-title` and `editor` from the parent. The organisation author is `{ "literal": ... }`. Umlauts survive the round trip.
7. Citations in `footnotes.xml` get `noteIndex` equal to their footnote number. Body citations get `noteIndex: 0`.
8. A Citavi bibliography SDT is replaced in place by exactly one `ZOTERO_BIBL` field. A fixture without one gets no added bibliography.
9. Every zip entry other than the edited XML parts is byte-identical to the input. Pre-existing non-Citavi fields are unchanged.
10. **Free mode:** the output converts exactly the first 10 citations in document order and leaves the rest unchanged. The filename ends in `_zotero-test.docx`.
11. **Unlock token:** unit tests accept a valid token, and reject an expired one, a tampered one and one signed with the wrong key. Without a valid token, the full-conversion code path refuses to run.
12. **Checkout function:** with `STRIPE_SECRET_KEY` unset, it returns 503 and the UI shows "Bezahlung ist gerade nicht verfügbar". With a mocked Stripe client, it returns a Checkout URL for `STRIPE_PRICE_ID`. **Verify function:** a mocked paid session returns a token, and a mocked unpaid or unknown session returns 402.
13. **Linking** (if in scope after the spike), with recorded Zotero API fixtures: DOI, ISBN and title+year+author matches get the correct `uris`. A reference with two candidate matches stays unmatched. Pagination over more than 100 items works. A test or static check shows the API key is never written to `localStorage`, `sessionStorage`, cookies or any URL other than `api.zotero.org`.
14. **Reference export:** RIS and CSL-JSON contain exactly the unique references of the fixture. RIS has at least the TY, AU, TI, PY, T2/JO, VL, IS, SP/EP, PB, CY, DO, SN and UR tags where the data exists.
15. **Privacy:** the production headers file sets a CSP whose `connect-src` is limited to `'self'` and `https://api.zotero.org` (plus the analytics endpoint if needed). The conversion module contains no `fetch`, `XMLHttpRequest` or `sendBeacon`. The event counter payload is only an event name. No cookies are set by the site or the functions.
16. **Performance:** the core scans and converts `large.docx` (500 citations) in under 3 s in Node on the build machine.
17. **Pages:** every page in §8 exists, is in German, and has a unique `<title>`, a meta description, one `<h1>` and a canonical URL. `sitemap.xml` and `robots.txt` exist. Every page footer links to Impressum, Datenschutz and Kaufbedingungen.
18. **Honesty:** the tool page states in one plain sentence that the file is processed only in the browser. A visible note says the site is not affiliated with Lumivero/Citavi or with Zotero / the Corporation for Digital Scholarship. There are no logos of either, no testimonials, no user or sales counters, no countdowns and no invented numbers. The price, what is free and what the pass includes are visible before checkout. The checkout step asks for explicit consent to immediate delivery of the digital content and acknowledgement of losing the withdrawal right (§356 Abs. 5 BGB).
19. Unsupported inputs (`.doc`, `.odt`, a non-zip file, a document without Citavi fields, Citavi text placeholders) each get a clear German message and no download.

## 7. Monetisation

- **Model: one-off paid pass (no subscription).** Moving a thesis is a one-time job, and a subscription would be a dark pattern here.
- **Price: 9 € incl. VAT, "Umzugspass".** It covers unlimited full conversions in this browser (or with the code on another device) for **30 days**, so all chapters, plus re-runs after edits. Why 9 €: the payment comes at a moment of acute pain and high intent (deadline, hours of manual work saved), and it sits below a student's hourly wage. It is low enough to buy without asking anyone and high enough to be worth Stripe fees.
- **Free:** the scan, the preview table, the 10-citation test copy, and the RIS/CSL-JSON reference export. The free tier is a real tool on its own. That makes the product linkable and lets libraries recommend it, and the user can verify before paying.
- **Paywall placement:** on the result screen, directly under the scan summary and the test-copy button: "Alle N Nachweise umwandeln – 9 € einmalig". There are no ads anywhere (trust is the product).
- **Later (not v1):** a campus/library pass (for example a flat yearly price for a library that hands out codes), if libraries ask. Sales would need a human, so it waits for inbound demand.
- **Payments:** Stripe Checkout in test mode during the build. Env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `UNLOCK_SIGNING_KEY` (Ed25519 private key), `PUBLIC_UNLOCK_VERIFY_KEY`, `SITE_URL`. Going live is a human step.
- **Honest limit:** processing is client-side, so a determined user could bypass the paywall. That is accepted; do not add obfuscation or DRM.

## 8. Target queries and page plan

| Query | Page | What the page is |
|---|---|---|
| citavi zotero word; citavi zitate in zotero umwandeln; citavi nachweise in zotero konvertieren; citavi word dokument zotero übernehmen; citavi word zotero umstieg zitate | `/` | **The tool**, with a short "So funktioniert's", the after-conversion guide, limitations and an FAQ. |
| citavi lizenz abgelaufen word dokument; citavi campuslizenz endet; citavi lizenz läuft aus was tun | `/citavi-lizenz-abgelaufen/` | A substantive answer: what still works after expiry (the Word file keeps its data), the options compared honestly (re-cite, static text, private licence, Citavi Free, Zitatumzug), the free scan embedded, and **one verified table** of universities with end date + source link + "Stand" date. Only rows whose source page was actually opened go in. |
| citavi felder zotero; citavi feldfunktion word; citavi feldfunktionen entfernen | `/citavi-felder-zotero/` | A technical explainer: what a Citavi field is, why Zotero cannot read it, how Zitatumzug maps it (CSL, locators, prefix), and what is not carried over (the Citavi style itself, Wissenselemente, automatic "Vgl."). |
| citavi literaturverzeichnis exportieren word; citavi literatur aus word exportieren ohne lizenz; citavi literaturliste retten | `/literaturliste-aus-word-retten/` | The same tool, opened in **reference export** mode (RIS/CSL-JSON, free), with steps to import into Zotero. |
| citavi to zotero word citations (EN) | v1.1: `/en/` | Out of v1. |

No other content pages in v1. Each page must work as a tool or be a real answer. No keyword-variant pages, no per-university pages.

## 9. Success metrics and kill criteria

- **Launch gate:** live (test-mode payments acceptable for the first days) by **2026-11-22**, and human task 2 (real round trip) passed before the live payment switch.
- **Targets:** ≥ 300 `scan_done` events by 2026-12-31; ≥ 15 paid passes by 2027-01-31 (once live); ≥ 150 organic clicks in Search Console by 2027-01-31.
- **Kill / stop investing if any of these holds:**
  - fewer than **100 organic clicks** in Search Console by **2027-01-31**, *and* fewer than **10 paid passes** by **2027-02-28**. Then freeze development and keep the free scan/export online only while hosting stays under 20 €/year;
  - the human round trip shows that **3 or more of the first 10 real documents** fail in Word + Zotero and two Builder sessions cannot fix it. Then do not go live;
  - Zotero ships a built-in Citavi citation converter. Then make the tool free, stop development and keep it as a free utility.

## 10. Legal and platform notes

- **Hosting:** a static site on Cloudflare Pages, plus two Pages Functions (`/api/checkout`, `/api/verify`) and one tiny event counter. No database beyond KV/Analytics Engine counters. No file ever reaches the server.
- **Trademarks:** "Citavi" (Lumivero) and "Zotero" (Corporation for Digital Scholarship) are used **descriptively only**. No logos, no look-alike branding, and the domain must not contain either name (for example `zitatumzug.de`). Add a non-affiliation note in the footer of every page.
- **Interoperability:** reading the documented on-disk structure of a user's own file for interoperability is fine. Do **not** copy code from CiteMigrate (GPL-3.0). Check biblatex-csl-converter's licence before depending on it; reimplementing the mapping from the format facts is the safe default.
- **Privacy (GDPR):** no personal data is processed except what Stripe needs for payment. The Datenschutz page names Cloudflare (hosting, cookie-free analytics), Stripe (payment) and api.zotero.org (only if the user opts into linking; the call goes straight from the user's browser). No cookies, no consent banner needed. Say this only because it is literally true.
- **Consumer law (DE/EU):** Impressum (§5 DDG), Datenschutzerklärung, Kaufbedingungen with a Widerrufsbelehrung for digital content and the explicit-consent checkbox (§356 Abs. 5 BGB), a price incl. VAT, and invoices/receipts through Stripe. VAT handling (Kleinunternehmer vs. OSS for EU consumers; Switzerland is non-EU) is a human decision. All legal pages are **drafts** for lawyer review.
- **No liability promise beyond the truth:** the tool never touches the original (the user downloads a copy), and the page tells users to keep their original.

## 11. Human tasks

1. **By 2026-11-14:** create or collect at least 3 real Citavi 6/7 Word documents (author-year in the body with a Citavi bibliography; a German footnote style with page numbers and "Vgl."; a numeric style). Citavi Free on Windows is enough to make them. Optionally download https://www.geschichte.hu-berlin.de/de/das-institut/Fachschaftsinitiative/veranstaltungen/citavi-workshop/dateien-2/vorlage_citavi-workshop_fertig.docx by hand in a browser (it sits behind a bot check, so agents cannot and should not fetch it). Put the files in `fixtures/real/` (gitignored).
2. **Before going live:** open 3 or more converted outputs in Word with Zotero 7 (Windows; Mac if possible), set the style, click Refresh, and confirm that the citations, page numbers, footnotes and bibliography are right. Report failures as fixtures.
3. Register the domain (e.g. `zitatumzug.de`), check that the name "Zitatumzug" is free (DPMA/EUIPO search), and connect Cloudflare Pages.
4. Create a Stripe account, create the 9 € price, and set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `UNLOCK_SIGNING_KEY`, `PUBLIC_UNLOCK_VERIFY_KEY` and `SITE_URL` (test keys first; the live switch is the owner's call).
5. Have a lawyer review the legal pages (Impressum, Datenschutz, Kaufbedingungen/Widerruf) and decide on VAT handling (Kleinunternehmer or OSS).
6. Set up Google Search Console and Bing Webmaster Tools and submit the sitemap.
7. Optional, after task 2 passes: tell university library Zotero/Citavi contacts (Münster, Göttingen, Greifswald and others) that a working converter exists. This is outward-facing, so the owner decides.
