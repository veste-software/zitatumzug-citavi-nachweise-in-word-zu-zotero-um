import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { XmlAdapter } from '../src/core/xml';
import { scanDocx } from '../src/core/scan';
import { convertDocx } from '../src/core/convert';

const xml: XmlAdapter = {
  parse: (t) => new DOMParser().parseFromString(t, 'text/xml') as unknown as Document,
  serialize: (d) => new XMLSerializer().serializeToString(d as never),
};
const dir = join(__dirname, '..', 'fixtures', 'real');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.docx')) : [];

describe('real Citavi documents', () => {
  if (!files.length) {
    it('skipped without fixtures', () => {
      console.log('SKIPPED: no real Citavi fixtures');
      expect(files).toHaveLength(0);
    });
    return;
  }
  for (const f of files) {
    it(`scan and convert ${f}`, () => {
      const bytes = new Uint8Array(readFileSync(join(dir, f)));
      const s = scanDocx(bytes, xml, f);
      expect(s.ok).toBe(true);
      const r = convertDocx(bytes, xml, { mode: 'full', unlock: true });
      expect(r.ok).toBe(true);
      if (r.ok && s.ok) expect(r.converted).toBe(s.counts.readable);
    });
  }
});
