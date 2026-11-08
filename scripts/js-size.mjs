// Reports the raw and gzip size of every JS file in dist/ (run after `npm run build`).
// Usage: npm run size [-- --max-kb=120]   (fails if total gzip size exceeds the limit)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dist = path.resolve('dist');
if (!fs.existsSync(dist)) {
  console.error('dist/ not found – run `npm run build` first.');
  process.exit(1);
}
const maxArg = process.argv.find((a) => a.startsWith('--max-kb='));
const maxKb = maxArg ? Number(maxArg.split('=')[1]) : Infinity;

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.js')) files.push(full);
  }
})(dist);

let rawTotal = 0;
let gzTotal = 0;
for (const f of files.sort()) {
  const buf = fs.readFileSync(f);
  const gz = zlib.gzipSync(buf, { level: 9 }).length;
  rawTotal += buf.length;
  gzTotal += gz;
  console.log(`${(gz / 1024).toFixed(1).padStart(7)} kB gz  ${(buf.length / 1024).toFixed(1).padStart(7)} kB  ${path.relative(dist, f)}`);
}
console.log(`${(gzTotal / 1024).toFixed(1).padStart(7)} kB gz  ${(rawTotal / 1024).toFixed(1).padStart(7)} kB  TOTAL (${files.length} files)`);
if (gzTotal / 1024 > maxKb) {
  console.error(`Total gzip size exceeds ${maxKb} kB.`);
  process.exit(1);
}
