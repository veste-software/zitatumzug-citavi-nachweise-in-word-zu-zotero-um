import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { XmlAdapter } from '../src/core/xml';
import { convertDocx } from '../src/core/convert';

const xml: XmlAdapter = {
  parse: (t) => new DOMParser().parseFromString(t, 'text/xml') as unknown as Document,
  serialize: (d) => new XMLSerializer().serializeToString(d as never),
};
const schema = JSON.parse(readFileSync(join(__dirname, 'schema/csl-citation.json'), 'utf8'));

/** Minimal validator for the keywords used in our schema file. */
function validate(v: any, s: any, path = '$'): string[] {
  const errs: string[] = [];
  const types: string[] | null = s.type ? ([] as string[]).concat(s.type) : null;
  const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
  if (types && !types.includes(t)) return [`${path}: expected ${types}, got ${t}`];
  if (s.const !== undefined && v !== s.const) errs.push(`${path}: const`);
  if (t === 'object') {
    for (const k of s.required ?? []) if (!(k in v)) errs.push(`${path}.${k}: missing`);
    for (const [k, sub] of Object.entries(s.properties ?? {})) if (k in v) errs.push(...validate(v[k], sub, `${path}.${k}`));
  }
  if (t === 'array') {
    if (s.minItems && v.length < s.minItems) errs.push(`${path}: too short`);
    if (s.items) v.forEach((x: any, i: number) => errs.push(...validate(x, s.items, `${path}[${i}]`)));
  }
  return errs;
}

function instructions(s: string): string[] {
  return s
    .split('fldCharType="begin"')
    .slice(1)
    .map((seg) =>
      [...seg.split('fldCharType="separate"')[0].matchAll(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g)]
        .map((m) => m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
        .join(''),
    )
    .filter((t) => /^\s*ADDIN ZOTERO_ITEM/.test(t));
}

describe('ZOTERO_ITEM instructions validate against the CSL citation schema', () => {
  for (const name of ['author-year', 'footnotes', 'numeric', 'edge', 'large']) {
    it(name, () => {
      const bytes = new Uint8Array(readFileSync(join(__dirname, 'fixtures', name + '.docx')));
      const r = convertDocx(bytes, xml, { mode: 'full', unlock: true });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const files = unzipSync(r.bytes);
      let n = 0;
      for (const [p, data] of Object.entries(files)) {
        if (!/^word\/(document|footnotes|endnotes)\.xml$/.test(p)) continue;
        for (const ins of instructions(new TextDecoder().decode(data))) {
          const json = JSON.parse(ins.replace(/^\s*ADDIN ZOTERO_ITEM CSL_CITATION /, '').trim());
          expect(validate(json, schema)).toEqual([]);
          n++;
        }
      }
      expect(n).toBeGreaterThan(0);
    });
  }
});
