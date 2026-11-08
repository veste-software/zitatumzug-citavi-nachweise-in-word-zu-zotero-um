import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('privacy guards', () => {
  it('core has no network access', () => {
    for (const f of walk(join(root, 'src/core'))) {
      const s = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(s, f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/);
    }
  });

  it('connect-src is limited to self, api.zotero.org and the analytics endpoint', () => {
    const h = readFileSync(join(root, 'public/_headers'), 'utf8');
    const m = h.match(/^\s*Content-Security-Policy:.*?connect-src ([^;]*)/m);
    expect(m).toBeTruthy();
    const allowed = ["'self'", 'https://api.zotero.org', 'https://cloudflareinsights.com'];
    for (const t of m![1].trim().split(/\s+/)) expect(allowed).toContain(t);
  });

  it('the Zotero key is never persisted', () => {
    const files = [...walk(join(root, 'src')), ...walk(join(root, 'functions'))].filter((f) => /\.(ts|tsx|astro)$/.test(f));
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((l, i) => {
        if (/localStorage|sessionStorage|document\.cookie/.test(l)) expect(l, `${f}:${i + 1}`).not.toMatch(/zotero|apiKey|api_key/i);
      });
    }
  });
});
