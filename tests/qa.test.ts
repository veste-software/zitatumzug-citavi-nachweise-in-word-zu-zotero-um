import { describe, expect, it } from 'vitest';
import { unzipSync, zipSync } from 'fflate';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { XmlAdapter } from '../src/core/xml';
import { convertDocx } from '../src/core/convert';
import { scanDocx } from '../src/core/scan';

// QA probes written independently of the Builder's fixtures.
const xml: XmlAdapter = {
  parse: (t) => new DOMParser().parseFromString(t, 'text/xml') as unknown as Document,
  serialize: (d) => new XMLSerializer().serializeToString(d as never),
};
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const dec = new TextDecoder();

function payload(title: string) {
  const j = { Entries: [{ Id: 'e1', ReferenceId: 'r1', PageRange: { OriginalString: '12' }, Reference: { Id: 'r1', ReferenceType: 'Book', Title: title, Year: '2020', Authors: [{ LastName: 'Muster', FirstName: 'Max' }] } }] };
  return Buffer.from(JSON.stringify(j), 'utf8').toString('base64');
}

function sdt(title: string, tag = 'CitaviPlaceholder#abc') {
  return `<w:sdt><w:sdtPr><w:tag w:val="${tag}"/></w:sdtPr><w:sdtContent><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ADDIN CitaviPlaceholder${payload(title)} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>(Muster 2020, S. 12)</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:sdtContent></w:sdt>`;
}

function docx(body: string): Uint8Array {
  const enc = new TextEncoder();
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${body}<w:sectPr/></w:body></w:document>`;
  return zipSync({
    '[Content_Types].xml': enc.encode('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'word/document.xml': enc.encode(document),
  });
}

function instructions(out: Uint8Array): string[] {
  const s = dec.decode(unzipSync(out)['word/document.xml']);
  const doc = new DOMParser().parseFromString(s, 'text/xml');
  const res: string[] = [];
  let cur: string | null = null;
  const nodes = doc.getElementsByTagNameNS(W, 'r');
  for (let i = 0; i < nodes.length; i++) {
    const r = nodes[i];
    const f = r.getElementsByTagNameNS(W, 'fldChar')[0];
    const type = f?.getAttributeNS(W, 'fldCharType');
    if (type === 'begin') cur = '';
    else if (type === 'separate' && cur !== null) {
      res.push(cur);
      cur = null;
    } else if (cur !== null) cur += r.getElementsByTagNameNS(W, 'instrText')[0]?.textContent ?? '';
  }
  return res;
}

describe('QA probes', () => {
  it('non-BMP characters survive when the instruction is split into 250-char chunks', () => {
    // Slide a surrogate pair across the chunk boundary.
    for (let pad = 0; pad < 6; pad++) {
      const title = 'x'.repeat(40 + pad) + '𝒳𝒴𝒵'.repeat(120);
      const out = convertDocx(docx(`<w:p>${sdt(title)}</w:p>`), xml, { mode: 'full', unlock: true });
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      const ins = instructions(out.bytes).filter((t) => t.includes('ZOTERO_ITEM'));
      expect(ins).toHaveLength(1);
      expect(ins[0]).not.toContain('�');
      const json = JSON.parse(ins[0].replace(/^\s*ADDIN ZOTERO_ITEM CSL_CITATION /, '').trim());
      expect(json.citationItems[0].itemData.title).toBe(title);
    }
  });

  it('block-level SDT in a table cell gets a paragraph; conversion is not repeated on the output', () => {
    const body = `<w:tbl><w:tr><w:tc>${sdt('Kurz')}<w:p/></w:tc></w:tr></w:tbl>`;
    const out = convertDocx(docx(body), xml, { mode: 'full', unlock: true });
    expect(out.ok && out.converted).toBe(1);
    if (!out.ok) return;
    const s = dec.decode(unzipSync(out.bytes)['word/document.xml']);
    expect(s).not.toContain('CitaviPlaceholder#');
    expect(s).toMatch(/<w:tc><w:p>/);
    const again = scanDocx(out.bytes, xml, 'x.docx');
    expect(again.ok && again.counts.total).toBe(0);
  });

  it('keeps [Content_Types].xml as the first zip entry', () => {
    const out = convertDocx(docx(`<w:p>${sdt('A')}</w:p>`), xml, { mode: 'test' });
    expect(out.ok).toBe(true);
    if (out.ok) expect(Object.keys(unzipSync(out.bytes))[0]).toBe('[Content_Types].xml');
  });
});
