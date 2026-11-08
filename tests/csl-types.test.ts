import { describe, expect, it } from 'vitest';
import { mapReference } from '../src/core/csl';

const base = { Id: 'x1', Title: 'Titel', Subtitle: 'Untertitel', Year: '2020', Authors: [{ FirstName: 'Eva', LastName: 'Beispiel' }] };

describe('reference types', () => {
  const cases: [string, string][] = [
    ['Book', 'book'],
    ['BookEdited', 'book'],
    ['JournalArticle', 'article-journal'],
    ['NewspaperArticle', 'article-newspaper'],
    ['Thesis', 'thesis'],
    ['InternetDocument', 'webpage'],
    ['ConferenceProceedings', 'book'],
    ['Report', 'report'],
    ['GreyLiterature', 'report'],
    ['Lecture', 'speech'],
    ['UnpublishedWork', 'manuscript'],
    ['StatuteOrRegulation', 'legislation'],
    ['CourtDecision', 'legal_case'],
    ['Contribution', 'chapter'],
    ['Unbekannt', 'document'],
  ];
  for (const [citavi, csl] of cases) {
    it(`${citavi} -> ${csl}`, () => {
      const item = mapReference({ ...base, ReferenceType: citavi });
      expect(item.type).toBe(csl);
      expect(item.title).toBe('Titel: Untertitel');
      expect(item.author).toEqual([{ family: 'Beispiel', given: 'Eva' }]);
      expect(item.issued).toEqual({ 'date-parts': [[2020]] });
    });
  }

  it('maps identifiers, volume, issue, pages, place, edition', () => {
    const item = mapReference({
      ...base, ReferenceType: 'JournalArticle', Periodical: { Name: 'Journal' }, Volume: '3', Number: '4', PageRange: '10-20',
      Doi: '10.1/x', Issn: '1234-5678', OnlineAddress: 'https://example.org', Edition: '2', PlaceOfPublication: 'Bonn',
    });
    expect(item).toMatchObject({ 'container-title': 'Journal', volume: '3', issue: '4', page: '10–20', DOI: '10.1/x', ISSN: '1234-5678', URL: 'https://example.org', edition: '2', 'publisher-place': 'Bonn' });
  });

  it('a chapter in proceedings becomes paper-conference', () => {
    const item = mapReference({ ...base, ReferenceType: 'Contribution', ParentReference: { ReferenceType: 'ConferenceProceedings', Title: 'Tagungsband' } });
    expect(item.type).toBe('paper-conference');
    expect(item['container-title']).toBe('Tagungsband');
  });
});
