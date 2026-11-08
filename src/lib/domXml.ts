import type { XmlAdapter } from '../core/xml';

/** Browser XML adapter for the conversion core. */
export const domXml: XmlAdapter = {
  parse(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('XML nicht lesbar');
    return doc;
  },
  serialize: (doc) => new XMLSerializer().serializeToString(doc),
};
