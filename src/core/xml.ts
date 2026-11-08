/** XML access is injected: the browser passes DOMParser/XMLSerializer, tests pass @xmldom/xmldom. */
export interface XmlAdapter {
  parse(text: string): Document;
  serialize(doc: Document): string;
}

export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

export function serializeXml(xml: XmlAdapter, doc: Document): string {
  return DECL + xml.serialize(doc).replace(/^<\?xml[^>]*\?>\s*/, '');
}

export function wEls(root: Document | Element, name: string): Element[] {
  return Array.from(root.getElementsByTagNameNS(W_NS, name));
}

export function wChild(el: Element, name: string): Element | null {
  for (let c = el.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 1 && (c as Element).localName === name && (c as Element).namespaceURI === W_NS) {
      return c as Element;
    }
  }
  return null;
}

export function wAttr(el: Element, name: string): string {
  return el.getAttributeNS(W_NS, name) ?? el.getAttribute('w:' + name) ?? '';
}
