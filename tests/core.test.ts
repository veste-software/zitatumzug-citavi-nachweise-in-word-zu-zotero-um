import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { XmlAdapter } from '../src/core/xml';
import { decodePayload } from '../src/core/payload';
import { scanDocx } from '../src/core/scan';
import { convertDocx } from '../src/core/convert';
import { mapReference, mapEntry } from '../src/core/csl';

const xml: XmlAdapter = {
  parse: (t) => new DOMParser().parseFromString(t, 'text/xml') as unknown as Document,
  serialize: (d) => new XMLSerializer().serializeToString(d as never),
};
const dir = join(__dirname, 'fixtures');
const load = (n: string) => new Uint8Array(readFileSync(join(dir, n)));
const expected = JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8'));
const dec = new TextDecoder();
const part = (bytes: Uint8Array, p: string) => dec.decode(unzipSync(bytes)[p]);

/** Parse errors in xmldom are reported through the error handler; make them throw. */
function strictParse(s: string) {
  const errors: string[] = [];
  const doc = new DOMParser({ errorHandler: { warning: () => {}, error: (m) => errors.push(m), fatalError: (m) => errors.push(m) } }).parseFromString(s, 'text/xml');
  expect(errors).toEqual([]);
  return doc;
}

function zoteroInstructions(s: string): any[] {
  // one field = everything between a "begin" and the next "separate"
  return s
    .split('fldCharType="begin"')
    .slice(1)
    .map((seg) =>
      [...seg.split('fldCharType="separate"')[0].matchAll(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g)]
        .map((m) => m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
        .join(''),
    )
    .filter((t) => /^\s*ADDIN ZOTERO_ITEM/.test(t))
    .map((t) => JSON.parse(t.replace(/^\s*ADDIN ZOTERO_ITEM CSL_CITATION /, '').trim()));
}

describe('fixtures are well-formed', () => {
  for (const name of Object.keys(expected)) {
    it(name, () => {
      const files = unzipSync(load(name));
      for (const [k, v] of Object.entries(files)) if (k.endsWith('.xml') || k.endsWith('.rels')) strictParse(dec.decode(v));
    });
  }
});

describe('payload decoder', () => {
  const entries = { Entries: [{ Id: 'a', Reference: { Title: 'Über Äpfel' } }] };
  const b64 = Buffer.from(JSON.stringify(entries)).toString('base64');
  it('decodes base64 with umlauts', () => {
    const r = decodePayload(b64);
    expect(r.ok && r.entries[0].Reference.Title).toBe('Über Äpfel');
  });
  it('decodes raw JSON and a leading token', () => {
    expect(decodePayload(JSON.stringify(entries)).ok).toBe(true);
    expect(decodePayload(' ADDIN CitaviPlaceholder ' + b64).ok).toBe(true);
    expect(decodePayload(' ADDIN CitaviPlaceholder' + JSON.stringify(entries)).ok).toBe(true);
  });
  it('resolves $ref, also nested and in $values arrays', () => {
    const r = decodePayload(
      JSON.stringify({ $id: '1', Entries: { $id: '2', $values: [{ $id: '3', Reference: { $id: '4', Title: 'T' } }, { $id: '5', Reference: { $ref: '4' } }] } }),
    );
    expect(r.ok && r.entries[1].Reference.Title).toBe('T');
  });
  it('rejects garbage', () => {
    expect(decodePayload('!!!').ok).toBe(false);
    expect(decodePayload('').ok).toBe(false);
    expect(decodePayload(Buffer.from('nur text').toString('base64')).ok).toBe(false);
    expect(decodePayload('{"Entries":[]}').ok).toBe(false);
  });
});

describe('scan', () => {
  for (const [name, exp] of Object.entries(expected)) {
    it(`${name} matches expected.json`, () => {
      const r = scanDocx(load(name), xml, name);
      expect(r.ok && r.counts).toEqual(exp);
    });
  }
  it('rejects wrong inputs', () => {
    expect(scanDocx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]), xml)).toEqual({ ok: false, error: 'doc' });
    expect(scanDocx(load('no-citavi.docx'), xml, 'a.odt')).toEqual({ ok: false, error: 'odt' });
    expect(scanDocx(new TextEncoder().encode('hallo'), xml)).toEqual({ ok: false, error: 'not-docx' });
  });
});

describe('csl mapping', () => {
  it('maps chapter via ParentReference, organisation and persons', () => {
    const edge = scanDocx(load('edge.docx'), xml);
    if (!edge.ok) throw new Error('scan');
    const chapter = mapEntry(edge.citations[1].entries[0]);
    expect(chapter.itemData.type).toBe('chapter');
    expect(chapter.itemData['container-title']).toBe('Handbuch der Rezeption');
    expect(chapter.itemData.editor[1]).toEqual({ family: 'Öztürk', given: 'Ute' });
    expect(chapter.itemData.publisher).toBe('Sammelverlag');
    expect(chapter.locator).toBe('40');
    expect(chapter.label).toBe('page');
    expect(mapEntry(edge.citations[2].entries[0]).itemData.author).toEqual([{ literal: 'Statistisches Beispielamt' }]);
    // same reference, same id
    expect(mapEntry(edge.citations[0].entries[0]).id).toBe(mapEntry(edge.citations[0].entries[1]).id);
  });
  it('falls back to document and keeps unknown PageRange shapes as text', () => {
    expect(mapReference({ Id: 'x', ReferenceType: 'Gizmo', Title: 'T' }).type).toBe('document');
    expect(mapEntry({ Reference: { Id: 'x' }, PageRange: { Foo: 1 } }).locator).toBe('{"Foo":1}');
  });
});

describe('convert', () => {
  it('full mode refuses without unlock', () => {
    expect(convertDocx(load('author-year.docx'), xml, { mode: 'full' })).toEqual({ ok: false, error: 'locked' });
  });

  it('converts every readable citation, keeps XML valid and other parts identical', () => {
    for (const name of ['author-year.docx', 'footnotes.docx', 'numeric.docx', 'edge.docx']) {
      const input = load(name);
      const r = convertDocx(input, xml, { mode: 'full', unlock: true });
      if (!r.ok) throw new Error(name);
      const exp = expected[name];
      expect(r.converted).toBe(exp.readable);
      const out = unzipSync(r.bytes);
      let fields = 0;
      for (const [k, v] of Object.entries(out)) {
        if (!k.startsWith('word/') || !k.endsWith('.xml')) continue;
        const s = dec.decode(v);
        strictParse(s);
        fields += zoteroInstructions(s).length;
        const count = (re: RegExp) => (s.match(re) ?? []).length;
        expect(count(/fldCharType="begin"/g)).toBe(count(/fldCharType="end"/g));
        expect(count(/fldCharType="separate"/g)).toBe(count(/fldCharType="begin"/g));
        expect(s.includes('w:val="Citavi')).toBe(name === 'edge.docx' && k === 'word/document.xml');
      }
      // edge has 1 pre-existing (empty) Zotero field
      expect(fields).toBe(exp.readable + exp.otherFields.zotero);
      const orig = unzipSync(input);
      for (const k of Object.keys(orig)) {
        if (['word/document.xml', 'word/footnotes.xml', 'word/endnotes.xml'].includes(k)) continue;
        expect(Buffer.from(out[k]).equals(Buffer.from(orig[k]))).toBe(true);
      }
    }
  });

  it('writes locators, prefix/suffix, noteIndex and the standard prefix', () => {
    const r = convertDocx(load('footnotes.docx'), xml, { mode: 'full', unlock: true, standardPrefix: 'Vgl.' });
    if (!r.ok) throw new Error('convert');
    const cites = zoteroInstructions(part(r.bytes, 'word/footnotes.xml'));
    expect(cites.map((c) => c.properties.noteIndex)).toEqual([1, 2, 3, 4, 5]);
    expect(cites[0].citationItems[0]).toMatchObject({ locator: '45', label: 'page', prefix: 'Vgl. ' });
    expect(cites[1].citationItems[0]).toMatchObject({ prefix: 'Siehe ', suffix: 'm. w. N.' });
    expect(cites[2].citationItems[0].prefix).toBe('Vgl. ');
    expect(cites[2].citationItems[1].prefix).toBeUndefined();
    expect(cites[3].citationItems[0].prefix).toBe('Dazu ');
    expect(cites[0].schema).toContain('csl-citation.json');
    expect('formattedCitation' in cites[0].properties).toBe(false);
  });

  it('body citations get noteIndex 0 and shared ids; edge cases survive', () => {
    const r = convertDocx(load('edge.docx'), xml, { mode: 'full', unlock: true });
    if (!r.ok) throw new Error('convert');
    const s = part(r.bytes, 'word/document.xml');
    const cites = zoteroInstructions(s);
    expect(cites[0].properties.noteIndex).toBe(0);
    expect(cites[0].citationItems[0].id).toBe(cites[0].citationItems[1].id);
    expect(s).toContain('Müller 2019, S. 8');
    expect(s).toContain('(Unlesbar 2020)'); // unreadable stays untouched
    expect(s).toContain('CitaviPlaceholder#');
    expect(s).toContain('(Bereits Zotero)');
    expect((s.match(/CitaviPlaceholder#/g) ?? []).length).toBe(1);
    expect(part(r.bytes, 'word/endnotes.xml')).toContain('"noteIndex":1');
  });

  it('replaces the bibliography by exactly one ZOTERO_BIBL field, none added when absent', () => {
    const r = convertDocx(load('author-year.docx'), xml, { mode: 'full', unlock: true });
    if (!r.ok) throw new Error('convert');
    const s = part(r.bytes, 'word/document.xml');
    expect((s.match(/ADDIN ZOTERO_BIBL/g) ?? []).length).toBe(1);
    expect(s).toContain('Literaturverzeichnis – wird von Zotero');
    expect(s).not.toContain('CitaviBibliography');
    const f = convertDocx(load('footnotes.docx'), xml, { mode: 'full', unlock: true });
    if (!f.ok) throw new Error('convert');
    expect(f.bibliographyReplaced).toBe(false);
    expect(part(f.bytes, 'word/document.xml')).not.toContain('ZOTERO_BIBL');
  });

  it('test mode converts exactly the first 10 in order and leaves the bibliography', () => {
    const r = convertDocx(load('large.docx'), xml, { mode: 'test' });
    if (!r.ok) throw new Error('convert');
    expect(r.converted).toBe(10);
    const s = part(r.bytes, 'word/document.xml');
    expect(zoteroInstructions(s).length).toBe(10);
    expect((s.match(/CitaviPlaceholder#/g) ?? []).length).toBe(490);
    expect(s).toContain('CitaviBibliography');
    expect(zoteroInstructions(s)[9].citationItems[0].locator).toBe('10');
  });

  it('handles 500 citations in under 3 s', () => {
    const t = Date.now();
    const bytes = load('large.docx');
    scanDocx(bytes, xml);
    const r = convertDocx(bytes, xml, { mode: 'full', unlock: true });
    expect(r.ok && r.converted).toBe(500);
    expect(Date.now() - t).toBeLessThan(3000);
  });

  it('the core has no network calls', () => {
    for (const f of ['convert', 'scan', 'docx', 'payload', 'csl', 'xml']) {
      expect(readFileSync(join(__dirname, '..', 'src', 'core', f + '.ts'), 'utf8')).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon/);
    }
  });
});
