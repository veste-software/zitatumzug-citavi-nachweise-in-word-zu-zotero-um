/**
 * Conversion core – pure TS, no DOM, no network. Runs in the browser and in Node (tests).
 * Never add fetch / XMLHttpRequest / sendBeacon to anything under src/core (privacy promise, SPEC §6.15).
 */

export type FileKind = 'docx-zip' | 'ole-doc' | 'odt' | 'unknown';

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b);
}

/**
 * Classify an uploaded file by its first bytes (and name for .odt, which is also a zip).
 * The caller still has to check that a zip contains word/document.xml.
 */
export function detectFileKind(bytes: Uint8Array, fileName = ''): FileKind {
  if (startsWith(bytes, OLE_MAGIC)) return 'ole-doc';
  if (startsWith(bytes, ZIP_MAGIC)) {
    return /\.odt$/i.test(fileName) ? 'odt' : 'docx-zip';
  }
  return 'unknown';
}
