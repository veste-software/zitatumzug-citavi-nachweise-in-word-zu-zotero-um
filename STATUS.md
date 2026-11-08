# Zitatumzug: Citavi-Nachweise in Word zu Zotero umwandeln

**Stage:** planned · **Platform:** web · **Score:** 3.6/5 · **Spend:** $4.58

For students and researchers in Germany, Austria and Switzerland whose university is ending its Citavi licence. Upload a Word file and the browser turns its Citavi citations into live Zotero citations, entirely on the user's device. Nobody has to re-insert hundreds of citations by hand, and it still works after the licence has expired.

**Why now:** German universities ending their Citavi campus licences after price rises, announced from late 2025: FH Dortmund 2026-08-31, Göttingen 2026-11-30, TU Freiberg 2026-12-01, Münster and HCU Hamburg 2026-12-31. Münster sent a reminder on 2026-10-26. (2026-10-26). Window: Most deadlines fall between 30 November and 31 December 2026. After that, students are left with theses whose Citavi fields can no longer be refreshed. Demand should run through 2027 as theses started in Citavi are finished and more universities drop the licence (Münster cites sharply higher costs; RWTH extended only to 2027-02-01). The gap has stayed open for years: Zotero converts Mendeley citations but not Citavi ones, library guides say it is impossible, and the only tool is an obscure Python desktop app.

## Needs you

- [ ] [task 1] By 2026-11-14 provide at least 3 real Citavi 6/7 Word documents (author-year with bibliography, German footnote style with page numbers and 'Vgl.', numeric style) in fixtures/real/; Citavi Free on Windows is enough
- [ ] [task 2] Optionally download the HU Berlin Citavi workshop .docx by hand in a browser (URL in SPEC.md section 11; it sits behind a bot check)
- [ ] [task 3] Before going live, open 3 or more converted files in Word with Zotero 7, set the style, refresh, and confirm citations, page numbers, footnotes and bibliography
- [ ] [task 4] Register a domain without 'citavi' or 'zotero' in it (e.g. zitatumzug.de), check the name 'Zitatumzug' in DPMA/EUIPO, connect Cloudflare Pages
- [ ] [task 5] Create a Stripe account and a 9 EUR price; set STRIPE_SECRET_KEY, STRIPE_PRICE_ID, UNLOCK_SIGNING_KEY, PUBLIC_UNLOCK_VERIFY_KEY, SITE_URL (test mode first; going live is your call)
- [ ] [task 6] Have a lawyer review the legal pages (Impressum, Datenschutz, Kaufbedingungen/Widerrufsbelehrung for digital content) and decide on VAT (Kleinunternehmer or OSS)
- [ ] [task 7] Set up Google Search Console and Bing Webmaster Tools and submit the sitemap
- [ ] [task 8] Optionally, once the round trip passes, tell university library contacts that the converter exists
- [ ] [task 9] Put at least 3 real Citavi 6/7 Word documents (author-year with bibliography, footnote style with page numbers and Vgl., numeric) into fixtures/real/ by 2026-11-14
- [ ] [task 10] Before going live: open 3+ converted outputs in Word with Zotero 7, set a style, click Refresh, and confirm citations, page numbers, footnotes and bibliography
- [ ] [task 11] In a browser console on the deployed site, confirm that fetch('https://api.zotero.org/keys/<your key>') succeeds (CORS); only then set PUBLIC_ENABLE_LINKING=true
- [ ] [task 12] Register the domain (e.g. zitatumzug.de), check the name 'Zitatumzug' at DPMA/EUIPO, and connect Cloudflare Pages
- [ ] [task 13] Create a Stripe account and a 9 EUR price; set STRIPE_SECRET_KEY (test key), STRIPE_PRICE_ID and SITE_URL in Cloudflare Pages
- [ ] [task 14] Generate an Ed25519 key pair with scripts/gen-keys.mjs once the Builder adds it; set UNLOCK_SIGNING_KEY and PUBLIC_UNLOCK_VERIFY_KEY
- [ ] [task 15] Create a Cloudflare Web Analytics site and set PUBLIC_CF_BEACON_TOKEN; bind an Analytics Engine dataset or KV for the event counter
- [ ] [task 16] Fill in the operator data in Impressum and have a lawyer review the legal pages (Impressum, Datenschutz, Kaufbedingungen/Widerruf); decide on VAT handling (Kleinunternehmer or OSS)

## Recommendation

None yet. The Growth role gives one after launch.

## Metrics

No real numbers yet. Fill in `metrics.json` (Search Console, analytics, Stripe); agents never invent them.

## Monetisation

one-off paid pass (freemium: free scan, test copy and reference export; paid full conversion) (Umzugspass 9 EUR incl. VAT once: unlimited full conversions for 30 days, no subscription, no account)

## Target queries

- citavi zotero word
- citavi zitate in zotero umwandeln
- citavi nachweise in zotero konvertieren
- citavi word dokument zotero übernehmen
- citavi word zotero umstieg zitate
- citavi lizenz abgelaufen word dokument
- citavi campuslizenz endet
- citavi felder zotero
- citavi feldfunktion word
- citavi literaturverzeichnis exportieren word
- citavi literaturliste retten
- citavi to zotero word citations

## Alternatives found

- CiteMigrate (partial): Python/PyQt desktop app installed with git clone and pip, 'only tested under macOS', needs a Zotero Web API key and the library already in Zotero. Created 2026-02-23, last push 2026-02-25, 1 star. Out of reach for most Windows students.
- literaturverwaltungsmigration (benedikt-e) (partial): Moves the Citavi library and knowledge items through a Citavi macro on Windows. Says outright that it does not convert Word citations.
- Zotero's built-in Citavi project import (partial): Imports the library but not citations already placed in Word documents. Knowledge element types and links are lost.

## Kill criteria

- Fewer than 100 organic clicks in Search Console by 2027-01-31 and fewer than 10 paid passes by 2027-02-28: freeze development, keep only the free scan/export online
- 3 or more of the first 10 real Citavi documents fail the Word+Zotero round trip and 2 Builder sessions cannot fix it: do not go live
- Zotero ships a built-in Citavi citation converter: make the tool free and stop development

## Links

- Repo: https://github.com/veste-software/zitatumzug-citavi-nachweise-in-word-zu-zotero-um
- Preview (GitHub Pages, builds from main): https://veste-software.github.io/zitatumzug-citavi-nachweise-in-word-zu-zotero-um/

## History

- 2026-11-08 10:23 · scouted · found by scout
- 2026-11-08 10:33 · specced · spec written
- 2026-11-08 10:38 · killed · declined by the review: overall index 2.65 is below 3.6
- 2026-11-08 20:47 · specced · built as a one-day prototype although the review panel declined it (declined by the review: overall index 2.65 is below 3.6. weakest: potential 2. skeptic: The conversion has not been tested on real Citavi files or in real Zotero. The spec relies on synthetic fixture…); the studio had nothing else to build, and the prototype is how the owner judges it
- 2026-11-08 20:53 · planned · scaffold and plan written
