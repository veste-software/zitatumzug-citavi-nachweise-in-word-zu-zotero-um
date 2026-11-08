/** Decode the payload of a Citavi citation field (SPEC §3). Pure: no DOM, no network. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export type PayloadResult = { ok: true; entries: Json[] } | { ok: false; reason: string };

function fromBase64(s: string): string {
  const bin = atob(s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
}

/** Resolve JSON.NET `$id` / `$ref` / `$values`. Returns a tree where refs point at the shared objects. */
export function resolveRefs(root: Json): Json {
  const ids = new Map<string, Json>();
  const build = (node: Json): Json => {
    if (Array.isArray(node)) return node.map(build);
    if (node && typeof node === 'object') {
      if (Array.isArray(node.$values)) {
        const arr = node.$values.map(build);
        if (node.$id !== undefined) ids.set(String(node.$id), arr);
        return arr;
      }
      const out: Json = {};
      if (node.$id !== undefined) ids.set(String(node.$id), out);
      for (const [k, v] of Object.entries(node)) if (k !== '$id') out[k] = build(v);
      return out;
    }
    return node;
  };
  const tree = build(root);
  const seen = new Set<Json>();
  const fix = (node: Json): Json => {
    if (node && typeof node === 'object') {
      if (typeof node.$ref === 'string') return ids.get(node.$ref) ?? node;
      if (seen.has(node)) return node;
      seen.add(node);
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) node[i] = fix(node[i]);
      } else {
        for (const k of Object.keys(node)) node[k] = fix(node[k]);
      }
    }
    return node;
  };
  return fix(tree);
}

export function decodePayload(instrText: string): PayloadResult {
  const s = instrText
    .trim()
    .replace(/^ADDIN\s+CitaviPlaceholder\s*/i, '')
    .replace(/^CitaviPlaceholder\s*/i, '')
    .trim();
  if (!s) return { ok: false, reason: 'leer' };
  let text: string;
  try {
    text = s.startsWith('{') || s.startsWith('[') ? s : fromBase64(s);
  } catch {
    return { ok: false, reason: 'nicht base64-dekodierbar' };
  }
  let json: Json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'kein gültiges JSON' };
  }
  json = resolveRefs(json);
  const entries = Array.isArray(json) ? json : json?.Entries;
  if (!Array.isArray(entries) || entries.length === 0) return { ok: false, reason: 'keine Einträge' };
  if (!entries.every((e: Json) => e && typeof e === 'object')) return { ok: false, reason: 'ungültige Einträge' };
  return { ok: true, entries };
}
