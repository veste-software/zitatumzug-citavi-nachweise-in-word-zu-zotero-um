/** Map Citavi references (decoded payload entries) to CSL-JSON. Written from the format facts in SPEC §3. */
import type { Json } from './payload';

export interface CslItem {
  id: string;
  type: string;
  [key: string]: Json;
}

const TYPE_MAP: Record<string, string> = {
  Book: 'book',
  BookEdited: 'book',
  JournalArticle: 'article-journal',
  NewspaperArticle: 'article-newspaper',
  Thesis: 'thesis',
  InternetDocument: 'webpage',
  ConferenceProceedings: 'book',
  Report: 'report',
  GreyLiterature: 'report',
  Lecture: 'speech',
  UnpublishedWork: 'manuscript',
  StatuteOrRegulation: 'legislation',
  CourtDecision: 'legal_case',
  Contribution: 'chapter',
  ContributionInProceedings: 'paper-conference',
};

const str = (v: Json): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const nameOf = (v: Json): string => (typeof v === 'string' ? v.trim() : str(v?.Name) || str(v?.FullName));

function person(p: Json): Json {
  if (typeof p === 'string') return { literal: p.trim() };
  const given = [str(p?.FirstName), str(p?.MiddleName)].filter(Boolean).join(' ');
  const family = str(p?.LastName);
  if (!family && !given) return { literal: nameOf(p) };
  const out: Json = { family };
  if (given) out.given = given;
  if (str(p?.Prefix)) out['non-dropping-particle'] = str(p.Prefix);
  return out;
}

const persons = (list: Json): Json[] => (Array.isArray(list) ? list.map(person).filter((p) => p.family || p.given || p.literal) : []);
const orgs = (list: Json): Json[] =>
  (Array.isArray(list) ? list : []).map((o: Json) => nameOf(o)).filter(Boolean).map((literal: string) => ({ literal }));

/** PageRange arrives as a plain string or a structured object; unknown shapes keep their raw text. */
export function pageText(pr: Json): string {
  if (pr == null) return '';
  if (typeof pr === 'string' || typeof pr === 'number') return String(pr).trim();
  if (typeof pr === 'object') {
    const direct = str(pr.OriginalString) || str(pr.PrettyString) || str(pr.Text);
    if (direct) return direct;
    const a = str(pr.StartPage?.OriginalString ?? pr.StartPage?.Number ?? pr.StartPage);
    const b = str(pr.EndPage?.OriginalString ?? pr.EndPage?.Number ?? pr.EndPage);
    if (a) return b && b !== a ? `${a}–${b}` : a;
    return Object.keys(pr).length ? JSON.stringify(pr) : '';
  }
  return '';
}

function issued(ref: Json): Json | undefined {
  const m = /(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(str(ref.Date) || str(ref.Year));
  if (m) return { 'date-parts': [[m[1], m[2], m[3]].filter(Boolean).map(Number)] };
  const raw = str(ref.Year);
  return raw ? { literal: raw } : undefined;
}

function setIf(o: Json, key: string, v: string) {
  if (v) o[key] = v;
}

export function referenceId(ref: Json, fallback?: string): string {
  const raw = str(ref?.Id) || str(fallback);
  if (raw) return `citavi-${raw}`;
  return `citavi-${str(ref?.Title).toLowerCase().replace(/\W+/g, '-').slice(0, 40)}-${str(ref?.Year)}`;
}

export function mapReference(ref: Json, fallbackId?: string): CslItem {
  const parent = ref.ParentReference && typeof ref.ParentReference === 'object' ? ref.ParentReference : null;
  const rt = str(ref.ReferenceType);
  let type = TYPE_MAP[rt] ?? 'document';
  if (rt === 'Contribution' && parent && /Proceedings/.test(str(parent.ReferenceType))) type = 'paper-conference';
  if (rt === 'Contribution' && !parent) type = 'chapter';

  const item: CslItem = { id: referenceId(ref, fallbackId), type };
  const authors = [...persons(ref.Authors), ...orgs(ref.Organizations)];
  if (authors.length) item.author = authors;
  const eds = persons(ref.Editors);
  if (rt === 'BookEdited' && !authors.length) {
    item.editor = eds;
  } else if (eds.length) {
    item.editor = eds;
  }
  const title = [str(ref.Title), str(ref.Subtitle)].filter(Boolean).join(': ');
  setIf(item, 'title', title || str(ref.ShortTitle));
  const iss = issued(ref);
  if (iss) item.issued = iss;

  const periodical = nameOf(ref.Periodical);
  if (periodical) item['container-title'] = periodical;
  if (parent) {
    const pt = [str(parent.Title), str(parent.Subtitle)].filter(Boolean).join(': ');
    setIf(item, 'container-title', pt);
    const pEds = persons(parent.Editors);
    if (pEds.length) item.editor = pEds;
    const pPub = (Array.isArray(parent.Publishers) ? parent.Publishers : []).map(nameOf).filter(Boolean).join('; ');
    setIf(item, 'publisher', pPub);
    setIf(item, 'publisher-place', str(parent.PlaceOfPublication));
    setIf(item, 'edition', str(parent.Edition));
    setIf(item, 'volume', str(parent.Volume));
    if (!item.issued) {
      const pi = issued(parent);
      if (pi) item.issued = pi;
    }
  }
  const pub = (Array.isArray(ref.Publishers) ? ref.Publishers : []).map(nameOf).filter(Boolean).join('; ');
  setIf(item, 'publisher', pub);
  if (!item.publisher && type === 'thesis') setIf(item, 'publisher', nameOf(ref.Organizations?.[0]) || str(ref.University));
  setIf(item, 'publisher-place', str(ref.PlaceOfPublication));
  setIf(item, 'volume', str(ref.Volume));
  setIf(item, 'issue', str(ref.Number));
  setIf(item, 'edition', str(ref.Edition));
  setIf(item, 'collection-title', nameOf(ref.SeriesTitle));
  const pages = pageText(ref.PageRange);
  if (pages && ['article-journal', 'article-newspaper', 'chapter', 'paper-conference'].includes(type)) {
    item.page = pages.replace(/(\d)\s*[-–]\s*(\d)/, '$1–$2');
  }
  setIf(item, 'DOI', str(ref.Doi));
  setIf(item, 'ISBN', str(ref.Isbn));
  setIf(item, 'ISSN', str(ref.Issn));
  setIf(item, 'URL', str(ref.OnlineAddress));
  setIf(item, 'genre', type === 'thesis' ? str(ref.ThesisType) : '');
  return item;
}

export interface CitationItem {
  id: string;
  itemData: CslItem;
  locator?: string;
  label?: string;
  prefix?: string;
  suffix?: string;
  uris?: string[];
}

export function mapEntry(entry: Json, opts: { standardPrefix?: string } = {}): CitationItem {
  const ref = entry.Reference ?? {};
  const itemData = mapReference(ref, entry.ReferenceId);
  const out: CitationItem = { id: itemData.id, itemData };
  const loc = pageText(entry.PageRange);
  if (loc) {
    out.locator = loc;
    out.label = 'page';
  }
  const prefix = str(entry.Prefix) || (entry.UseStandardPrefix === true ? str(opts.standardPrefix) : '');
  if (prefix) out.prefix = prefix.endsWith(' ') ? prefix : prefix + ' ';
  setIf(out, 'suffix', str(entry.Suffix));
  return out;
}
