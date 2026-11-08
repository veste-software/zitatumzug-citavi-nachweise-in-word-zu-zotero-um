/** Load a .docx and find Citavi fields in it. Shared by scan and convert. */
import { unzipSync } from 'fflate';
import { detectFileKind } from './fileKind';
import { decodePayload, type Json } from './payload';
import { W_NS, wAttr, wChild, wEls, type XmlAdapter } from './xml';

export type PartName = 'document' | 'footnotes' | 'endnotes';
const PART_PATH: Record<PartName, string> = {
  document: 'word/document.xml',
  footnotes: 'word/footnotes.xml',
  endnotes: 'word/endnotes.xml',
};
const PARTS: PartName[] = ['document', 'footnotes', 'endnotes'];

export type LoadError = 'not-docx' | 'doc' | 'odt' | 'no-document';

export interface Loaded {
  files: Record<string, Uint8Array>;
  docs: Partial<Record<PartName, Document>>;
  noteNumbers: { footnotes: Map<string, number>; endnotes: Map<string, number> };
}

export function loadDocx(bytes: Uint8Array, xml: XmlAdapter, fileName = ''): Loaded | { error: LoadError } {
  const kind = detectFileKind(bytes, fileName);
  if (kind === 'ole-doc') return { error: 'doc' };
  if (kind === 'odt') return { error: 'odt' };
  if (kind === 'unknown') return { error: 'not-docx' };
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    return { error: 'not-docx' };
  }
  if (!files['word/document.xml']) return { error: 'no-document' };
  const dec = new TextDecoder();
  const docs: Loaded['docs'] = {};
  for (const p of PARTS) {
    const f = files[PART_PATH[p]];
    if (f) docs[p] = xml.parse(dec.decode(f));
  }
  const number = (tag: string) => {
    const m = new Map<string, number>();
    for (const ref of wEls(docs.document!, tag)) {
      const id = wAttr(ref, 'id');
      if (!m.has(id)) m.set(id, m.size + 1);
    }
    return m;
  };
  return {
    files,
    docs,
    noteNumbers: { footnotes: number('footnoteReference'), endnotes: number('endnoteReference') },
  };
}

export { PART_PATH, PARTS };

export interface FoundCitation {
  /** Document order across body, footnotes, endnotes. */
  index: number;
  part: PartName;
  noteId?: string;
  noteIndex: number;
  sdt: Element;
  visibleText: string;
  readable: boolean;
  reason?: string;
  entries: Json[];
}

const tagOf = (sdt: Element): string => {
  const pr = wChild(sdt, 'sdtPr');
  const tag = pr && wChild(pr, 'tag');
  return tag ? wAttr(tag, 'val') : '';
};

export function isBibliographySdt(sdt: Element): boolean {
  return /Citavi(Filtered)?Bibliography/.test(tagOf(sdt));
}

const textOf = (els: Element[]) => els.map((e) => e.textContent ?? '').join('');

export function collect(loaded: Loaded): { citations: FoundCitation[]; bibliographies: Element[] } {
  const citations: FoundCitation[] = [];
  const bibliographies: Element[] = [];
  for (const part of PARTS) {
    const doc = loaded.docs[part];
    if (!doc) continue;
    for (const sdt of wEls(doc, 'sdt')) {
      const tag = tagOf(sdt);
      if (isBibliographySdt(sdt)) {
        bibliographies.push(sdt);
        continue;
      }
      if (!tag.startsWith('CitaviPlaceholder#')) continue;
      const content = wChild(sdt, 'sdtContent');
      const instr = content ? wEls(content, 'instrText') : [];
      const dec = decodePayload(textOf(instr));
      const visibleText = content ? textOf(wEls(content, 't')) : '';
      let noteId: string | undefined;
      let noteIndex = 0;
      if (part !== 'document') {
        const wrap = ancestor(sdt, part === 'footnotes' ? 'footnote' : 'endnote');
        noteId = wrap ? wAttr(wrap, 'id') : undefined;
        noteIndex = (noteId !== undefined && loaded.noteNumbers[part].get(noteId)) || 0;
      }
      citations.push({
        index: citations.length,
        part,
        noteId,
        noteIndex,
        sdt,
        visibleText,
        readable: dec.ok,
        reason: dec.ok ? undefined : dec.reason,
        entries: dec.ok ? dec.entries : [],
      });
    }
  }
  return { citations, bibliographies };
}

function ancestor(el: Element, local: string): Element | null {
  for (let n = el.parentNode; n; n = n.parentNode) {
    if (n.nodeType === 1 && (n as Element).localName === local && (n as Element).namespaceURI === W_NS) return n as Element;
  }
  return null;
}
