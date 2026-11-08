// SYNTHETIC – shaped after the published format facts, not a real Citavi export.
// Builds minimal valid .docx files with Citavi-style content-control citations into tests/fixtures/
// plus expected.json with the exact expected scan counts. No network. Run: npm run fixtures
import { zipSync, strToU8 } from 'fflate';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'fixtures');
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- synthetic references (invented works) ----
const person = (FirstName, LastName) => ({ FirstName, LastName });
const REF = {
  mueller: { Id: 'r-mueller', ReferenceType: 'Book', Authors: [person('Jürgen', 'Müller')], Title: 'Die Überlieferung der Quellen', Year: '2019', Publishers: ['Beispielverlag'], PlaceOfPublication: 'München', Isbn: '978-0-00-000001-0' },
  schmidt: { Id: 'r-schmidt', ReferenceType: 'JournalArticle', Authors: [person('Anna', 'Schmidt'), person('Björn', 'Köhler')], Title: 'Zur Methodik der Textkritik', Year: '2021', Periodical: { Name: 'Zeitschrift für Beispiele' }, Volume: '12', Number: '3', PageRange: '101-125', Doi: '10.0000/beispiel.2021.12' },
  weber: { Id: 'r-weber', ReferenceType: 'Thesis', Authors: [person('Lena', 'Weber')], Title: 'Studien zur Quellenlage', Year: '2017', PlaceOfPublication: 'Göttingen' },
  fischer: { Id: 'r-fischer', ReferenceType: 'InternetDocument', Authors: [person('Max', 'Fischer')], Title: 'Ein Beitrag im Netz', Year: '2023', OnlineAddress: 'https://example.org/beitrag' },
  amt: { Id: 'r-amt', ReferenceType: 'Report', Organizations: [{ Name: 'Statistisches Beispielamt' }], Title: 'Jahresbericht Größen und Maße', Year: '2020', PlaceOfPublication: 'Bonn' },
  kapitel: {
    Id: 'r-kapitel', ReferenceType: 'Contribution', Authors: [person('Clara', 'Schäfer')], Title: 'Rezeption im Wandel', Year: '2018', PageRange: '33-58',
    ParentReference: { Id: 'r-sammel', ReferenceType: 'BookEdited', Title: 'Handbuch der Rezeption', Editors: [person('Hans', 'Lange'), person('Ute', 'Öztürk')], Publishers: ['Sammelverlag'], PlaceOfPublication: 'Berlin', Year: '2018' },
  },
};

let eid = 0;
const entry = (ref, extra = {}) => ({ Id: `e-${++eid}`, ReferenceId: ref.Id, Reference: ref, ...extra });

// ---- XML builders ----
let sdtId = 1000;
const b64 = (obj) => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
const instrRuns = (text) =>
  (text.match(/.{1,90}/gs) ?? ['']).map((c) => `<w:r><w:instrText xml:space="preserve">${c}</w:instrText></w:r>`).join('');

function sdtRuns(payloadText, visible) {
  return `<w:r><w:fldChar w:fldCharType="begin"/></w:r>${instrRuns(payloadText)}<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${esc(visible)}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
}
const sdtPr = (tag) => `<w:sdtPr><w:alias w:val="Citavi Placeholder"/><w:tag w:val="${tag}"/><w:id w:val="${++sdtId}"/></w:sdtPr>`;
const guid = (n) => `CitaviPlaceholder#00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let g = 0;

/** payload: raw string for the instrText (already encoded), visible: text shown */
const inlineSdt = (payloadText, visible) => `<w:sdt>${sdtPr(guid(++g))}<w:sdtContent>${sdtRuns(payloadText, visible)}</w:sdtContent></w:sdt>`;
const blockSdt = (payloadText, visible) => `<w:sdt>${sdtPr(guid(++g))}<w:sdtContent><w:p>${sdtRuns(payloadText, visible)}</w:p></w:sdtContent></w:sdt>`;
const payloadOf = (...entries) => b64({ Entries: entries });
const bibSdt = (tag = 'CitaviBibliography') =>
  `<w:sdt><w:sdtPr><w:tag w:val="${tag}"/><w:id w:val="${++sdtId}"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>Müller, Jürgen (2019): Die Überlieferung der Quellen. München.</w:t></w:r></w:p></w:sdtContent></w:sdt>`;
const para = (inner) => `<w:p>${inner}</w:p>`;
const text = (t) => `<w:r><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;

function docx({ body, footnotes, endnotes }) {
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${footnotes ? '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>' : ''}${endnotes ? '<Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>' : ''}</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${footnotes ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>' : ''}${endnotes ? '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes" Target="endnotes.xml"/>' : ''}</Relationships>`,
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS}><w:body>${body}</w:body></w:document>`,
  };
  const notes = (kind, list) =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:${kind}s ${NS}><w:${kind} w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:${kind}><w:${kind} w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:${kind}>${list.map((n) => `<w:${kind} w:id="${n.id}"><w:p>${n.xml}</w:p></w:${kind}>`).join('')}</w:${kind}s>`;
  if (footnotes) files['word/footnotes.xml'] = notes('footnote', footnotes);
  if (endnotes) files['word/endnotes.xml'] = notes('endnote', endnotes);
  files['docProps/core.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Synthetische Testdatei</dc:title></cp:coreProperties>`;
  const enc = {};
  for (const [k, v] of Object.entries(files)) enc[k] = strToU8(v);
  return zipSync(enc);
}

const fixtures = {};
const expected = {};
const add = (name, parts, exp) => {
  fixtures[name] = docx(parts);
  expected[name] = exp;
};
const blank = { body: 0, footnotes: 0, endnotes: 0, total: 0, readable: 0, unreadable: 0, uniqueReferences: 0, withLocator: 0, bibliography: false, otherFields: { zotero: 0, endnote: 0, word: 0 }, textPlaceholders: 0 };

// author-year: 6 body citations, 3 unique refs, 2 with locator, bibliography
add('author-year.docx', {
  body:
    para(text('Einleitung. ') + inlineSdt(payloadOf(entry(REF.mueller, { PageRange: '12-15' })), '(Müller 2019, S. 12–15)')) +
    para(text('Weiter ') + inlineSdt(payloadOf(entry(REF.schmidt)), '(Schmidt & Köhler 2021)')) +
    para(text('Nochmals ') + inlineSdt(payloadOf(entry(REF.mueller)), '(Müller 2019)')) +
    para(text('Dann ') + inlineSdt(payloadOf(entry(REF.weber, { PageRange: { OriginalString: '77' } })), '(Weber 2017, S. 77)')) +
    para(text('Und ') + inlineSdt(payloadOf(entry(REF.schmidt)), '(Schmidt & Köhler 2021)')) +
    para(text('Schluss ') + inlineSdt(payloadOf(entry(REF.weber)), '(Weber 2017)')) +
    bibSdt(),
}, { ...blank, body: 6, total: 6, readable: 6, uniqueReferences: 3, withLocator: 2, bibliography: true });

// footnotes: 5 citations in footnotes.xml (ids 2..6), prefix/suffix/standard prefix, no bibliography
const fnRef = (id) => `<w:r><w:footnoteReference w:id="${id}"/></w:r>`;
add('footnotes.docx', {
  body: [2, 3, 4, 5, 6].map((id) => para(text(`Satz ${id}.`) + fnRef(id))).join(''),
  footnotes: [
    { id: 2, xml: inlineSdt(payloadOf(entry(REF.mueller, { PageRange: '45', UseStandardPrefix: true })), 'Vgl. Müller 2019, S. 45.') },
    { id: 3, xml: inlineSdt(payloadOf(entry(REF.schmidt, { PageRange: '110', Prefix: 'Siehe', Suffix: 'm. w. N.' })), 'Siehe Schmidt/Köhler 2021, S. 110 m. w. N.') },
    { id: 4, xml: inlineSdt(payloadOf(entry(REF.weber, { UseStandardPrefix: true }), entry(REF.fischer)), 'Vgl. Weber 2017; Fischer 2023.') },
    { id: 5, xml: inlineSdt(payloadOf(entry(REF.mueller, { UseStandardPrefix: true, Prefix: 'Dazu' })), 'Dazu Müller 2019.') },
    { id: 6, xml: inlineSdt(payloadOf(entry(REF.amt, { PageRange: '9-10' })), 'Statistisches Beispielamt 2020, S. 9–10.') },
  ],
}, { ...blank, footnotes: 5, total: 5, readable: 5, uniqueReferences: 5, withLocator: 3 });

// numeric: 4 body citations, bibliography
add('numeric.docx', {
  body:
    para(text('Erste Aussage ') + inlineSdt(payloadOf(entry(REF.mueller)), '[1]')) +
    para(text('Zweite ') + inlineSdt(payloadOf(entry(REF.schmidt, { PageRange: '104' })), '[2, S. 104]')) +
    para(text('Dritte ') + inlineSdt(payloadOf(entry(REF.mueller), entry(REF.schmidt)), '[1, 2]')) +
    para(text('Vierte ') + inlineSdt(payloadOf(entry(REF.fischer)), '[3]')) +
    bibSdt('CitaviFilteredBibliography'),
}, { ...blank, body: 4, total: 4, readable: 4, uniqueReferences: 3, withLocator: 1, bibliography: true });

// edge: $id/$ref payload, chapter with ParentReference, organisation, umlauts, undecodable payload,
// inline + block SDT, raw JSON with leading token, endnote citation, pre-existing Zotero field, text placeholder
const refPayload = b64({
  $id: '1',
  Entries: { $id: '2', $values: [
    { $id: '3', Id: 'e-ref-1', ReferenceId: 'r-mueller', Reference: { $id: '4', ...REF.mueller }, PageRange: '8' },
    { $id: '5', Id: 'e-ref-2', ReferenceId: 'r-mueller', Reference: { $ref: '4' } },
  ] },
});
const rawJsonPayload = ' ADDIN CitaviPlaceholder ' + JSON.stringify({ Entries: [entry(REF.fischer, { PageRange: '3' })] });
const zoteroField = `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ADDIN ZOTERO_ITEM CSL_CITATION {"citationID":"abc12345","properties":{"noteIndex":0},"citationItems":[],"schema":"https://github.com/citation-style-language/schema/raw/master/csl-citation.json"} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>(Bereits Zotero)</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
add('edge.docx', {
  body:
    para(text('Referenzen: ') + inlineSdt(refPayload, '(Müller 2019, S. 8; Müller 2019)')) +
    para(text('Kapitel: ') + inlineSdt(payloadOf(entry(REF.kapitel, { PageRange: '40' })), '(Schäfer 2018, S. 40)')) +
    para(text('Organisation: ') + inlineSdt(payloadOf(entry(REF.amt)), '(Statistisches Beispielamt 2020)')) +
    para(text('Kaputt: ') + inlineSdt('!!!kein-base64-und-kein-json!!!', '(Unlesbar 2020)')) +
    blockSdt(payloadOf(entry(REF.weber, { PageRange: '5' })), '(Weber 2017, S. 5)') +
    para(text('Roh: ') + inlineSdt(rawJsonPayload, '(Fischer 2023, S. 3)')) +
    para(text('Fremd: ') + zoteroField) +
    para(text('Platzhalter im Text: {Miller 2009 #84}')) +
    para(text('Endnote') + `<w:r><w:endnoteReference w:id="2"/></w:r>`) +
    bibSdt(),
  endnotes: [{ id: 2, xml: inlineSdt(payloadOf(entry(REF.weber)), 'Weber 2017.') }],
}, { ...blank, body: 6, endnotes: 1, total: 7, readable: 6, unreadable: 1, uniqueReferences: 5, withLocator: 4, bibliography: true, otherFields: { zotero: 1, endnote: 0, word: 0 }, textPlaceholders: 1 });

add('no-citavi.docx', { body: para(text('Ein Dokument ganz ohne Nachweise.')) }, { ...blank });

// large: 500 citations
{
  const refs = Object.values(REF);
  let body = '';
  for (let i = 0; i < 500; i++) {
    const r = refs[i % refs.length];
    body += para(text(`Absatz ${i}. `) + inlineSdt(payloadOf(entry(r, { PageRange: String(i + 1) })), `(Beleg ${i}, S. ${i + 1})`));
  }
  add('large.docx', { body: body + bibSdt() }, { ...blank, body: 500, total: 500, readable: 500, uniqueReferences: 6, withLocator: 500, bibliography: true });
}

mkdirSync(OUT, { recursive: true });
for (const [name, bytes] of Object.entries(fixtures)) writeFileSync(join(OUT, name), bytes);
writeFileSync(join(OUT, 'expected.json'), JSON.stringify(expected, null, 2) + '\n');
console.log(`wrote ${Object.keys(fixtures).length} fixtures to tests/fixtures/`);
