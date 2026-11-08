/** Optional linking with the user's Zotero library (api.zotero.org only). The key lives in the caller's variables, never in storage. */
import type { CslItem } from '../core/csl';

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
const API = 'https://api.zotero.org';

interface ZoteroItem {
  key: string;
  library?: { type: string; id: number };
  data: Record<string, any>;
}

export async function fetchUserId(key: string, f: Fetch): Promise<number> {
  const r = await f(`${API}/keys/${encodeURIComponent(key)}`, { headers: { 'Zotero-API-Version': '3' } });
  if (!r.ok) throw new Error('Zotero-Schlüssel nicht akzeptiert');
  const j = await r.json();
  if (typeof j?.userID !== 'number') throw new Error('Zotero-Schlüssel nicht akzeptiert');
  return j.userID;
}

export async function fetchAllItems(userId: number, key: string, f: Fetch): Promise<ZoteroItem[]> {
  const all: ZoteroItem[] = [];
  let start = 0;
  let total = Infinity;
  while (start < total) {
    const r = await f(`${API}/users/${userId}/items?limit=100&start=${start}&itemType=-attachment%20||%20note`, {
      headers: { 'Zotero-API-Key': key, 'Zotero-API-Version': '3' },
    });
    if (!r.ok) throw new Error('Zotero-Bibliothek nicht lesbar');
    const page = (await r.json()) as ZoteroItem[];
    total = Number(r.headers.get('Total-Results') ?? page.length + start);
    all.push(...page);
    if (!page.length) break;
    start += page.length;
  }
  return all;
}

export const normDoi = (s: unknown) =>
  typeof s === 'string' ? s.trim().toLowerCase().replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/, '') : '';
export const normIsbn = (s: unknown) => (typeof s === 'string' ? s.replace(/[^0-9X]/gi, '').toUpperCase() : '');
export const normText = (s: unknown) =>
  typeof s === 'string' ? s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() : '';

const yearOf = (v: unknown) => String(v ?? '').match(/\d{4}/)?.[0] ?? '';

function unique<T>(list: T[]): T | undefined {
  return list.length === 1 ? list[0] : undefined;
}

/** Returns, per CSL item id, the Zotero item URI when exactly one library item matches (DOI, then ISBN, then title+year+first author). */
export function matchItems(items: CslItem[], library: ZoteroItem[], userId: number): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const uri = (z: ZoteroItem) => `http://zotero.org/users/${userId}/items/${z.key}`;
  const firstFamily = (names: any[]) => normText(names?.find((c) => c.creatorType === 'author' || !c.creatorType)?.lastName ?? names?.[0]?.lastName ?? '');
  for (const it of items) {
    const doi = normDoi(it.DOI);
    const isbn = normIsbn(it.ISBN);
    const title = normText(it.title);
    const year = yearOf((it.issued as any)?.['date-parts']?.[0]?.[0]);
    const fam = normText((it.author as any)?.[0]?.family ?? '');
    let hit: ZoteroItem | undefined;
    if (doi) hit = unique(library.filter((z) => normDoi(z.data.DOI) === doi));
    if (!hit && isbn) hit = unique(library.filter((z) => normIsbn(z.data.ISBN) === isbn));
    if (!hit && title && year && fam)
      hit = unique(library.filter((z) => normText(z.data.title) === title && yearOf(z.data.date) === year && firstFamily(z.data.creators) === fam));
    if (hit) out[it.id] = [uri(hit)];
  }
  return out;
}

export async function linkLibrary(items: CslItem[], key: string, f: Fetch = fetch.bind(globalThis)): Promise<Record<string, string[]>> {
  const userId = await fetchUserId(key, f);
  return matchItems(items, await fetchAllItems(userId, key, f), userId);
}
