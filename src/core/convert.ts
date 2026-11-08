/** Replace Citavi SDTs by Zotero complex fields (SPEC §5.4). Pure: parser injected, no network. */
import { zipSync } from 'fflate';
import { collect, loadDocx, PART_PATH, PARTS, type FoundCitation, type LoadError } from './docx';
import { mapEntry } from './csl';
import { W_NS, XML_NS, serializeXml, wEls, type XmlAdapter } from './xml';

export const TEST_LIMIT = 10;
const SCHEMA = 'https://github.com/citation-style-language/schema/raw/master/csl-citation.json';
const BIBL_TEXT = '{Literaturverzeichnis – wird von Zotero beim Aktualisieren erzeugt}';

export interface ConvertOptions {
  mode: 'test' | 'full';
  standardPrefix?: string;
  /** Full mode needs the caller to prove it holds a valid unlock (see src/lib/token.ts). */
  unlock?: boolean;
  /** Optional: CSL item id → Zotero item URIs (from the opt-in library linking). */
  uriMap?: Record<string, string[]>;
}

export type ConvertResult =
  | { ok: true; bytes: Uint8Array; converted: number; skipped: number; bibliographyReplaced: boolean }
  | { ok: false; error: LoadError | 'locked' };

function randomId(): string {
  const a = new Uint8Array(4);
  globalThis.crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

function chunks(s: string, n = 250): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out;
}

class Builder {
  constructor(private doc: Document) {}
  el(name: string): Element {
    return this.doc.createElementNS(W_NS, 'w:' + name);
  }
  fld(type: 'begin' | 'separate' | 'end'): Element {
    const r = this.el('r');
    const f = this.el('fldChar');
    f.setAttributeNS(W_NS, 'w:fldCharType', type);
    r.appendChild(f);
    return r;
  }
  instr(text: string): Element[] {
    return chunks(text).map((c) => {
      const r = this.el('r');
      const i = this.el('instrText');
      i.setAttributeNS(XML_NS, 'xml:space', 'preserve');
      i.appendChild(this.doc.createTextNode(c));
      r.appendChild(i);
      return r;
    });
  }
  textRun(text: string): Element {
    const r = this.el('r');
    const t = this.el('t');
    t.setAttributeNS(XML_NS, 'xml:space', 'preserve');
    t.appendChild(this.doc.createTextNode(text));
    r.appendChild(t);
    return r;
  }
  /** begin, instruction, separate, display runs, end */
  field(instruction: string, display: Node[]): Element[] {
    return [this.fld('begin'), ...this.instr(` ${instruction} `), this.fld('separate'), ...display, this.fld('end')] as Element[];
  }
}

/** Display runs of the old SDT (text runs, not field-code runs), cloned so formatting survives. */
function displayRuns(sdt: Element): Node[] {
  const out: Node[] = [];
  for (const r of wEls(sdt, 'r')) {
    if (r.getElementsByTagNameNS(W_NS, 'instrText').length || r.getElementsByTagNameNS(W_NS, 'fldChar').length) continue;
    if (!r.getElementsByTagNameNS(W_NS, 't').length) continue;
    out.push(r.cloneNode(true));
  }
  return out;
}

function replaceSdt(sdt: Element, b: Builder, runs: Element[]) {
  const parent = sdt.parentNode!;
  const inPara = (parent as Element).localName === 'p';
  if (inPara) {
    for (const r of runs) parent.insertBefore(r, sdt);
  } else {
    const p = b.el('p');
    for (const r of runs) p.appendChild(r);
    parent.insertBefore(p, sdt);
  }
  parent.removeChild(sdt);
}

export function convertDocx(bytes: Uint8Array, xml: XmlAdapter, opts: ConvertOptions): ConvertResult {
  if (opts.mode === 'full' && opts.unlock !== true) return { ok: false, error: 'locked' };
  const loaded = loadDocx(bytes, xml);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  const { citations, bibliographies } = collect(loaded);

  let converted = 0;
  const readable = citations.filter((c) => c.readable);
  const chosen: FoundCitation[] = opts.mode === 'test' ? readable.slice(0, TEST_LIMIT) : readable;
  for (const c of chosen) {
    const b = new Builder(c.sdt.ownerDocument);
    const json = {
      citationID: randomId() + randomId().slice(0, 2),
      properties: { noteIndex: c.noteIndex },
      citationItems: c.entries.map((e) => {
        const item = mapEntry(e, { standardPrefix: opts.standardPrefix });
        const uris = opts.uriMap?.[item.id];
        if (uris?.length) item.uris = uris;
        return item;
      }),
      schema: SCHEMA,
    };
    const instruction = `ADDIN ZOTERO_ITEM CSL_CITATION ${JSON.stringify(json)}`;
    replaceSdt(c.sdt, b, b.field(instruction, displayRuns(c.sdt)));
    converted++;
  }

  let bibliographyReplaced = false;
  if (opts.mode === 'full') {
    for (const sdt of bibliographies) {
      const b = new Builder(sdt.ownerDocument);
      const instruction = 'ADDIN ZOTERO_BIBL {"uncited":[],"omitted":[],"custom":[]} CSL_BIBLIOGRAPHY';
      replaceSdt(sdt, b, b.field(instruction, [b.textRun(BIBL_TEXT)]));
      bibliographyReplaced = true;
    }
  }

  const enc = new TextEncoder();
  const files: Record<string, Uint8Array> = { ...loaded.files };
  if (converted || bibliographyReplaced) {
    for (const p of PARTS) {
      const doc = loaded.docs[p];
      if (doc) files[PART_PATH[p]] = enc.encode(serializeXml(xml, doc));
    }
  }
  return {
    ok: true,
    bytes: zipSync(files),
    converted,
    skipped: citations.length - converted,
    bibliographyReplaced,
  };
}
