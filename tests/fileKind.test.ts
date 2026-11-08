import { describe, expect, it } from 'vitest';
import { detectFileKind } from '../src/core/fileKind';

describe('detectFileKind', () => {
  it('recognises a zip container as docx', () => {
    expect(detectFileKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0]), 'arbeit.docx')).toBe('docx-zip');
  });
  it('recognises an .odt by name', () => {
    expect(detectFileKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), 'arbeit.odt')).toBe('odt');
  });
  it('recognises an old binary .doc', () => {
    expect(detectFileKind(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), 'alt.doc')).toBe('ole-doc');
  });
  it('rejects anything else', () => {
    expect(detectFileKind(new TextEncoder().encode('hello'), 'x.txt')).toBe('unknown');
  });
});
