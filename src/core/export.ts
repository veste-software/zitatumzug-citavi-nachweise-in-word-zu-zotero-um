/** Free reference export: every unique cited reference as RIS and CSL-JSON (SPEC §5.6). */
import { mapEntry, type CslItem } from './csl';
import type { Json } from './payload';

const TY: Record<string, string> = {
  book: 'BOOK',
  'article-journal': 'JOUR',
  'article-newspaper': 'NEWS',
  chapter: 'CHAP',
  thesis: 'THES',
  webpage: 'ELEC',
  report: 'RPRT',
  'paper-conference': 'CPAPER',
  manuscript: 'UNPB',
  legislation: 'STAT',
  legal_case: 'CASE',
  speech: 'GEN',
};

/** Unique references in order of first citation. */
export function uniqueItems(entryLists: Json[][]): CslItem[] {
  const seen = new Map<string, CslItem>();
  for (const list of entryLists) {
    for (const e of list) {
      const item = mapEntry(e).itemData;
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
  }
  return [...seen.values()];
}

const name = (p: Json): string => (p.literal ? p.literal : [p.family, p.given].filter(Boolean).join(', '));

export function toRis(items: CslItem[]): string {
  const out: string[] = [];
  for (const it of items) {
    const l = (tag: string, v: unknown) => {
      if (v !== undefined && v !== null && String(v) !== '') out.push(`${tag}  - ${String(v).replace(/\r?\n/g, ' ')}`);
    };
    l('TY', TY[it.type] ?? 'GEN');
    for (const a of it.author ?? []) l('AU', name(a));
    for (const e of it.editor ?? []) l('A2', name(e));
    l('TI', it.title);
    l('PY', it.issued?.['date-parts']?.[0]?.[0] ?? it.issued?.literal);
    const container = it['container-title'];
    if (container) l(it.type === 'article-journal' ? 'JO' : 'T2', container);
    l('VL', it.volume);
    l('IS', it.issue);
    if (it.page) {
      const [sp, ep] = String(it.page).split(/\s*[-–]\s*/);
      l('SP', sp);
      l('EP', ep);
    }
    l('PB', it.publisher);
    l('CY', it['publisher-place']);
    l('ET', it.edition);
    l('DO', it.DOI);
    l('SN', it.ISBN || it.ISSN);
    l('UR', it.URL);
    out.push('ER  - ', '');
  }
  return out.join('\r\n');
}

export function toCslJson(items: CslItem[]): string {
  return JSON.stringify(items, null, 2);
}
