import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { linkLibrary } from '../src/lib/zotero';

const fx = (n: string) => readFileSync(join(__dirname, 'fixtures/zotero', n), 'utf8');
const calls: { url: string; key?: string }[] = [];

const fakeFetch = async (url: string, init?: RequestInit) => {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  calls.push({ url, key: headers['Zotero-API-Key'] });
  if (url.startsWith('https://api.zotero.org/keys/')) return new Response(JSON.stringify({ userID: 42 }), { status: 200 });
  const start = new URL(url).searchParams.get('start');
  const body = start === '0' ? fx('library-page1.json') : fx('library-page2.json');
  return new Response(body, { status: 200, headers: { 'Total-Results': '5' } });
};

const items = [
  { id: 'a', type: 'book', title: 'Ein Testbuch', ISBN: '9783161484100' },
  { id: 'b', type: 'article-journal', title: 'x', DOI: 'https://doi.org/10.1000/xyz123' },
  { id: 'c', type: 'book', title: 'Doppelt vorhanden', issued: { 'date-parts': [[2018]] }, author: [{ family: 'Dupont' }] },
  { id: 'd', type: 'book', title: 'SYNTHETIC: Nur Titel', issued: { 'date-parts': [[2017]] }, author: [{ family: 'Kohler' }] },
  { id: 'e', type: 'book', title: 'Unbekannt' },
];

describe('Zotero linking (synthetic recorded responses)', () => {
  it('matches by DOI, ISBN, title+year+author and only when unique', async () => {
    const map = await linkLibrary(items as any, 'SECRETKEY', fakeFetch as any);
    expect(map.b).toEqual(['http://zotero.org/users/42/items/BBBB2222']);
    expect(map.d).toEqual(['http://zotero.org/users/42/items/EEEE5555']);
    expect(map.c).toBeUndefined(); // ambiguous
    expect(map.e).toBeUndefined();
    expect(map.a).toEqual(['http://zotero.org/users/42/items/AAAA1111']); // by ISBN, titles differ
  });

  it('paginates and talks only to api.zotero.org', async () => {
    calls.length = 0;
    await linkLibrary(items as any, 'SECRETKEY', fakeFetch as any);
    expect(calls.filter((c) => c.url.includes('/items?')).length).toBe(2);
    for (const c of calls) expect(c.url.startsWith('https://api.zotero.org/')).toBe(true);
  });
});
