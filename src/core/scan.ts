/** Free scan (SPEC §5.1): count what is in the file, change nothing. */
import { collect, loadDocx, PARTS, type LoadError, type PartName } from './docx';
import { mapEntry } from './csl';
import { wEls, type XmlAdapter } from './xml';
import type { Json } from './payload';

export interface ScannedCitation {
  index: number;
  part: PartName;
  noteId?: string;
  visibleText: string;
  readable: boolean;
  reason?: string;
  entries: Json[];
}

export interface ScanCounts {
  body: number;
  footnotes: number;
  endnotes: number;
  total: number;
  readable: number;
  unreadable: number;
  uniqueReferences: number;
  withLocator: number;
  bibliography: boolean;
  otherFields: { zotero: number; endnote: number; word: number };
  textPlaceholders: number;
}

export type ScanResult = { ok: true; counts: ScanCounts; citations: ScannedCitation[] } | { ok: false; error: LoadError };

const TEXT_PLACEHOLDER = /\{[^{}]{2,80}#\d+\}/g;

export function scanDocx(bytes: Uint8Array, xml: XmlAdapter, fileName = ''): ScanResult {
  const loaded = loadDocx(bytes, xml, fileName);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  const { citations, bibliographies } = collect(loaded);

  const other = { zotero: 0, endnote: 0, word: 0 };
  let textPlaceholders = 0;
  for (const p of PARTS) {
    const doc = loaded.docs[p];
    if (!doc) continue;
    for (const el of wEls(doc, 'instrText')) {
      const t = (el.textContent ?? '').trim();
      if (/^ADDIN\s+ZOTERO_(ITEM|BIBL)/.test(t)) other.zotero++;
      else if (/^ADDIN\s+EN\.(CITE|REFLIST)/.test(t)) other.endnote++;
      else if (/^(CITATION|BIBLIOGRAPHY)\b/.test(t)) other.word++;
    }
    for (const para of wEls(doc, 'p')) {
      const text = wEls(para, 't').map((t) => t.textContent ?? '').join('');
      textPlaceholders += text.match(TEXT_PLACEHOLDER)?.length ?? 0;
    }
  }

  const ids = new Set<string>();
  let withLocator = 0;
  for (const c of citations) {
    if (!c.readable) continue;
    const items = c.entries.map((e) => mapEntry(e));
    items.forEach((i) => ids.add(i.id));
    if (items.some((i) => i.locator)) withLocator++;
  }
  const n = (part: PartName) => citations.filter((c) => c.part === part).length;
  const unreadable = citations.filter((c) => !c.readable).length;
  return {
    ok: true,
    counts: {
      body: n('document'),
      footnotes: n('footnotes'),
      endnotes: n('endnotes'),
      total: citations.length,
      readable: citations.length - unreadable,
      unreadable,
      uniqueReferences: ids.size,
      withLocator,
      bibliography: bibliographies.length > 0,
      otherFields: other,
      textPlaceholders,
    },
    citations: citations.map((c) => ({
      index: c.index,
      part: c.part,
      noteId: c.noteId,
      visibleText: c.visibleText,
      readable: c.readable,
      reason: c.reason,
      entries: c.entries,
    })),
  };
}
