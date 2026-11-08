# DESIGN – Zitatumzug

## The idea

Zitatumzug is the cousin of a **hardware-shop price tag and the shop's ledger book**: kraft-paper brown, a manila tag on a string, black stamp ink, blue ledger ruling and hand-numbered rows. A move (Umzug) is boxes, parcel tags and an inventory list – every citation in the thesis is an item on that list, counted, numbered and tagged for its new home.

Starting direction kept as given: it fits the subject (a move, an inventory, a one-off price) and it is far from the usual academic-software blue.

## Typefaces (self-hosted, never a CDN)

| Role | Face | Source | Use |
|---|---|---|---|
| Display / stamp | **Zilla Slab** 500, 700 | `@fontsource/zilla-slab` | headings, tag numerals, stamped labels (uppercase, letterspaced `0.08em`) |
| Text / ledger | **Source Serif 4** (variable, opsz) | `@fontsource-variable/source-serif-4` | body, tables, form text; `font-variant-numeric: tabular-nums lining-nums` in every table and count |
| Code | system `ui-monospace` stack | – | unlock code and field names only |

Type scale (ratio ≈ 1.333, with one oversized step for the tag numerals), set as tokens in `src/styles/global.css`:

| Token | Size | Use |
|---|---|---|
| `--step--1` | 0.84rem | small print, ledger column heads (Zilla Slab caps) |
| `--step-0` | 1.0625rem (17px) | body |
| `--step-1` | 1.33rem | h3, lead |
| `--step-2` | 1.78rem | h2 |
| `--step-3` | 2.6rem | h1 (clamp down to 2rem at 360 px) |
| `--step-tag` | clamp(3.5rem, 12vw, 6.5rem) | the big count on the tag |

Line length 62ch for running text. German quotes „…“ and real dashes – in all copy.

## Colours

| Name | Hex | For |
|---|---|---|
| Kraft | `#C8A97E` | page background outside the sheet, tag body, header band |
| Manila | `#F4EAD5` | the reading surface (sheet / ledger page); dominant on content pages |
| Stempelschwarz | `#221F1C` | all text and rules of weight; contrast on Manila ≈ 15:1, on Kraft ≈ 8:1 |
| Stempelrot | `#A8231B` | the accent: stamps, the price, primary button fill, focus ring. Used sparingly – at most one red thing per screen region |
| Linienblau | `#6F8BA3` | ledger ruling lines and the hole ring only, never text |

Selection: Stempelrot background with Manila text.

## Grid and spacing

- One sheet column, max 72rem, on a Kraft page. Inside: a 12-column grid; running text spans columns 1–8, a margin column 9–12 holds notes, the tag and the ledger's "Stand"/source annotations (asymmetric, like a ledger's remarks column). Below 760 px everything stacks.
- Spacing tokens `--space-1 … --space-7` = 0.25, 0.5, 1, 1.5, 2.5, 4, 6.5 rem. Sections are separated by a 2px Stempelschwarz rule plus `--space-6`, not by boxes.
- Ledger tables: rows 2.25rem high, ruled with 1px Linienblau lines, a double rule under the head, a red vertical margin rule left of the "Nr." column (like a real ledger page), row numbers in Zilla Slab as `001`, `002`.

## Signature element: the price tag (Anhänger)

A manila/kraft hang tag built in CSS + inline SVG (`src/components/Tag.astro`):
- the shape: a rectangle with the two left corners cut at 45° via `clip-path: polygon(...)`;
- a punched hole near the cut end: a circle (radial background) ringed in Linienblau, with an inline-SVG string looping out of it;
- content: a stamped label in Zilla Slab caps („GEFUNDEN“, „UMZUGSPASS“), one huge numeral (`--step-tag`), and a small ruled line with the detail („davon 37 mit Seitenzahl“);
- a slightly rotated (−2°) Stempelrot rubber-stamp mark (`.stamp`: 2px red border, uneven opacity via an SVG noise mask, Zilla Slab caps) for states like „GEPRÜFT“ or „9 € EINMALIG“.

The tag carries the scan result on the tool page and the price in the paywall. It appears nowhere else as decoration.

## Components

- **Buttons:** square corners (radius 0), Zilla Slab 700 caps, 2px Stempelschwarz border. Primary = Stempelrot fill with Manila text; secondary = transparent with ink border. Hover: background darkens / underline; active: 2px inset shadow (pressed stamp). No lift, no pill.
- **Inputs:** a ruled line, not a box – Manila field with a 2px bottom border in ink, label above in small caps. Drop zone: dashed 2px ink border like a cut-here line, with a scissors-free label „Datei hier ablegen“.
- **Results:** the tag (counts) + a ledger table (first 10 citations: Nr., Text im Dokument, Autor, Jahr, Titel, Seite).
- **Notices:** a full-width band with a 1px rule above and below, a stamped label at the start („HINWEIS“, „FEHLER“ in red caps), text in ink. No side border, no tinted rounded box, no icon.
- **Focus:** 3px Stempelrot outline, 2px offset, on everything focusable.

## Voice

Plain, concrete German, Sie-form for the legal pages, „Sie“ on the tool too (theses are formal; readers include PhD candidates). Short sentences, numbers instead of adjectives: „187 Nachweise gefunden, 183 lesbar.“ Name the real thing (Feldfunktion, Fußnote, Literaturverzeichnis). Honest about limits. No exclamation marks, no „einfach“/„nahtlos“/„revolutionär“.

## Will not do

- no side-border callouts, no rounded cards, no shadows beyond a hard 2px offset
- no gradients, no blur, no purple/indigo/default Tailwind colours
- no centred hero + three cards + numbered steps + CTA band; the tool sits at the top of `/`
- no emoji, no icon packs, no Citavi or Zotero logos or look-alike colours
- no stock photos or illustrations; nothing but CSS and hand-drawn inline SVG
- no animations except the tag swinging in once (≤ 400 ms) when a scan finishes, disabled under `prefers-reduced-motion`
