// After `astro build`: replace 'unsafe-inline' in script-src of dist/_headers by sha256 hashes of all inline scripts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dist = 'dist';
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
}
const hashes = new Set();
for (const f of walk(dist).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type="(?!module")/.test(m[1])) continue;
    if (!m[2].trim()) continue;
    hashes.add(`'sha256-${crypto.createHash('sha256').update(m[2]).digest('base64')}'`);
  }
}
const file = path.join(dist, '_headers');
if (!fs.existsSync(file)) {
  console.log('csp-hashes: no dist/_headers, skipped');
  process.exit(0);
}
const out = fs
  .readFileSync(file, 'utf8')
  .replace(/(?<=Content-Security-Policy:.*?)script-src([^;]*)/, (_, v) => 'script-src' + v.replace(/\s*'unsafe-inline'/, '') + (hashes.size ? ' ' + [...hashes].join(' ') : ''));
fs.writeFileSync(file, out);
console.log(`csp-hashes: ${hashes.size} inline script hash(es) written`);
