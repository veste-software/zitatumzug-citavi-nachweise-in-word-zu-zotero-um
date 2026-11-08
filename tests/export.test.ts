import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { scanDocx } from '../src/core/scan';
import { toCslJson, toRis, uniqueItems } from '../src/core/export';

const xml = {
  parse: (t: string) => new DOMParser().parseFromString(t, 'text/xml') as unknown as Document,
  serialize: (d: Document) => new XMLSerializer().serializeToString(d as never),
};

describe('reference export', () => {
  const r = scanDocx(new Uint8Array(readFileSync(join(__dirname, 'fixtures', 'author-year.docx'))), xml);
  if (!r.ok) throw new Error('scan');
  const items = uniqueItems(r.citations.map((c) => c.entries));

  it('contains exactly the unique references', () => {
    expect(items).toHaveLength(3);
    expect(JSON.parse(toCslJson(items)).map((i: { id: string }) => i.id)).toEqual(['citavi-r-mueller', 'citavi-r-schmidt', 'citavi-r-weber']);
  });

  it('writes the RIS tags where data exists', () => {
    const ris = toRis(items);
    expect((ris.match(/^ER {2}- /gm) ?? []).length).toBe(3);
    for (const tag of ['TY', 'AU', 'TI', 'PY', 'JO', 'VL', 'IS', 'SP', 'EP', 'PB', 'CY', 'DO', 'SN']) {
      expect(ris).toMatch(new RegExp(`^${tag} {2}- `, 'm'));
    }
    expect(ris).toContain('AU  - Müller, Jürgen');
    expect(ris).toContain('SP  - 101');
    expect(ris).toContain('EP  - 125');
  });
});
