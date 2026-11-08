// A plain-code check for the habits that make a site look AI-generated. It reads the styles and
// markup of a product folder and reports what it finds, each with a weight. It has no imports
// outside node:, because the same file is copied into every product as scripts/design-check.mjs so
// that the Builder can run it too (`node scripts/design-check.mjs`).
//
// It cannot judge taste. It looks for specific, well-known tells: a thick coloured border on one
// side of a box, purple-blue gradients, gradient text, frosted glass, glow shadows, pill buttons
// and lift-on-hover, stock fonts and font CDNs, emoji used as icons, stock UI kits, marketing
// filler. A tell that is plainly a style choice for the machine to dislike (accent border, gradient
// text, glass, gradients in the indigo-violet range, a font CDN) weighs 3, which fails alone;
// the others weigh 1 or 2 and fail together at a score of 3.
import fs from 'node:fs';
import path from 'node:path';

export const FAIL_SCORE = 3;

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', '.git', '.astro', '.next', '.svelte-kit', '.vercel', '.cache', '.turbo',
  'coverage', 'growth', 'data', 'fixtures', 'test', 'tests', '__tests__', 'e2e', 'playwright-report',
]);
const MARKUP = /\.(html|astro|jsx|tsx|vue|svelte)$/i;
const STYLE = /\.(css|scss|sass|less)$/i;
const MAX_BYTES = 400 * 1024;

const OVERUSED_FONTS = ['Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato', 'DM Sans', 'Plus Jakarta Sans', 'Space Grotesk', 'Manrope', 'Nunito'];
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'cursive', 'fantasy', 'inherit', 'initial', 'unset',
  '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'helvetica', 'helvetica neue', 'arial', 'times new roman', 'times', 'georgia', 'courier new', 'courier', 'verdana', 'tahoma', 'oxygen', 'ubuntu', 'cantarell', 'fira sans', 'droid sans', 'emoji']);
const EMOJI_ICONS = ['✨', '🚀', '⚡', '🎯', '💡', '🔥', '🌟', '💎', '🤖', '🧠', '🎉'];
const UI_KITS = ['shadcn', 'class-variance-authority', 'daisyui', 'flowbite', '@mui/material', 'bootstrap', '@chakra-ui/react', 'antd', '@mantine/core', '@nextui-org/react', '@heroui/react', 'lucide-react', 'react-icons', '@heroicons/react', '@iconify/react'];
const FILLER = /\b(unlock(?:s|ing)? (?:the|your)|supercharge|elevate your|seamless(?:ly)?|effortless(?:ly)?|revolutioni[sz]e|game[- ]?changer|cutting[- ]edge|next[- ]level|streamline your)\b/i;

// Indigo, violet, purple, fuchsia: the default accent range of generated pages.
const AI_HEX = new Set(['#6366f1', '#4f46e5', '#4338ca', '#818cf8', '#8b5cf6', '#7c3aed', '#6d28d9', '#a78bfa', '#a855f7', '#9333ea', '#c084fc', '#d946ef', '#ec4899']);

function hexToHsl(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue;
  if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return [hue * 60, s, l];
}
const isIndigoViolet = (hex) => {
  const [h, s, l] = hexToHsl(hex);
  return h >= 235 && h <= 330 && s >= 0.4 && l >= 0.3 && l <= 0.8;
};

function walk(dir, out = [], depth = 0) {
  if (depth > 6) return out;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(full, out, depth + 1);
    } else if ((STYLE.test(e.name) || MARKUP.test(e.name)) && !/\.(test|spec)\./i.test(e.name)) {
      try {
        if (fs.statSync(full).size <= MAX_BYTES) out.push(full);
      } catch { /* unreadable: skip */ }
    }
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

// Each rule: id, weight, what it found, what to do instead.
const RULES = {
  'accent-border': { weight: 3, fix: 'Drop the thick one-sided border on cards, quotes and notices. Mark a note with a rule, a tint, a label or a different type treatment instead.' },
  'gradient-text': { weight: 3, fix: 'Set headings in one solid ink colour. Let the typeface and size carry the emphasis.' },
  'glass': { weight: 3, fix: 'Remove backdrop blur (frosted glass). Use flat surfaces with a clear edge or a rule.' },
  'ai-gradient': { weight: 3, fix: 'Remove purple, indigo and violet gradients. Use flat colours from the palette in DESIGN.md.' },
  'ai-palette': { weight: 3, fix: 'Replace the default indigo, violet or pink accent with a colour taken from the subject (see DESIGN.md).' },
  'font-cdn': { weight: 3, fix: 'Do not load fonts from Google Fonts or any CDN. Install an npm @fontsource package or ship the font file in public, and use @font-face.' },
  'glow-shadow': { weight: 1, fix: 'Replace big soft or glowing shadows with a hard offset shadow, a rule or no shadow.' },
  'pill-or-round': { weight: 1, fix: 'Do not round every box and button alike. Pick square, slightly cut or one deliberate radius and use it for a reason.' },
  'hover-lift': { weight: 1, fix: 'Remove the lift on hover (translateY / scale). Change colour, underline or an inset shadow instead.' },
  'overused-font': { weight: 2, fix: 'Choose a typeface with character for this subject instead of the overused defaults (see DESIGN.md).' },
  'no-type-decision': { weight: 2, fix: 'Declare the typefaces from DESIGN.md with @font-face (self-hosted) and set a type scale with real contrast.' },
  'emoji-icons': { weight: 2, fix: 'Do not use emoji as icons or decoration. Draw a few simple icons in inline SVG in one stroke style, or use none.' },
  'ui-kit': { weight: 2, fix: 'Remove the stock UI kit or icon pack and style the components by hand from DESIGN.md.' },
  'filler-copy': { weight: 1, fix: 'Rewrite stock marketing words ("unlock", "seamless", "supercharge") in a plain, concrete voice for this audience.' },
};

function add(findings, rule, file, line, text) {
  findings.push({ rule, weight: RULES[rule].weight, file, line, text: String(text).replace(/\s+/g, ' ').trim().slice(0, 110), fix: RULES[rule].fix });
}

function scanStyle(findings, file, text, ctx) {
  const css = STYLE.test(file) ? stripComments(text) : text;
  let m;
  // A thick border on one side only: the "accent bar" card or callout.
  const side = /border-(?:left|right|inline-start|inline-end)(?:-width)?\s*:\s*(\d*\.?\d+)(px|rem|em)\b([^;}"'`]*)/gi;
  while ((m = side.exec(css))) {
    const px = Number(m[1]) * (m[2] === 'px' ? 1 : 16);
    if (px >= 2 && !/\b(none|transparent)\b/i.test(m[3])) add(findings, 'accent-border', file, lineOf(css, m.index), m[0]);
  }
  for (const re of [/\bborder-[lsre]-(?:2|4|8)\b/g]) {
    while ((m = re.exec(css))) add(findings, 'accent-border', file, lineOf(css, m.index), m[0]);
  }
  const clip = /(?:-webkit-)?background-clip\s*:\s*text|\bbg-clip-text\b/gi;
  while ((m = clip.exec(css))) add(findings, 'gradient-text', file, lineOf(css, m.index), m[0]);
  const glass = /backdrop-filter\s*:[^;}]*blur|\bbackdrop-blur\b/gi;
  while ((m = glass.exec(css))) add(findings, 'glass', file, lineOf(css, m.index), m[0]);
  const gradient = /(?:linear|radial|conic)-gradient\(([^;{}]*)\)/gi;
  while ((m = gradient.exec(css))) {
    const colours = m[1].match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) || [];
    if (colours.some(isIndigoViolet) || /\b(indigo|violet|purple|fuchsia|magenta)\b/i.test(m[1])) add(findings, 'ai-gradient', file, lineOf(css, m.index), m[0]);
  }
  const tw = /\b(?:from|via|to)-(?:indigo|violet|purple|fuchsia|pink)-\d{2,3}\b/g;
  while ((m = tw.exec(css))) add(findings, 'ai-gradient', file, lineOf(css, m.index), m[0]);
  const hex = /#[0-9a-f]{6}\b/gi;
  while ((m = hex.exec(css))) if (AI_HEX.has(m[0].toLowerCase())) { add(findings, 'ai-palette', file, lineOf(css, m.index), m[0]); break; }
  const twPalette = /\b(?:bg|text|border|ring|fill|stroke)-(?:indigo|violet|purple|fuchsia)-\d{2,3}\b/g;
  while ((m = twPalette.exec(css))) { add(findings, 'ai-palette', file, lineOf(css, m.index), m[0]); break; }
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|cdn\.jsdelivr\.net\/npm\/@fontsource|cdnjs\.cloudflare\.com\/ajax\/libs\/font/i.test(css)) {
    const idx = css.search(/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|cdn\.jsdelivr\.net\/npm\/@fontsource|cdnjs\.cloudflare\.com\/ajax\/libs\/font/i);
    add(findings, 'font-cdn', file, lineOf(css, idx), 'font loaded from a CDN');
  }
  const shadow = /box-shadow\s*:([^;}]*)/gi;
  while ((m = shadow.exec(css))) {
    const blurs = [...m[1].matchAll(/(?:^|\s)-?\d*\.?\d+(?:px)?\s+-?\d*\.?\d+(?:px)?\s+(\d*\.?\d+)px/g)].map((x) => Number(x[1]));
    if (blurs.some((b) => b >= 30)) add(findings, 'glow-shadow', file, lineOf(css, m.index), m[0]);
  }
  if (/\bshadow-(?:xl|2xl)\b/.test(css)) add(findings, 'glow-shadow', file, 1, 'shadow-xl');
  const radii = [...css.matchAll(/border-radius\s*:\s*([^;}]*)/gi)].map((x) => x[1]);
  const big = radii.filter((r) => (r.match(/\d*\.?\d+(?:px|rem|em)|\d+%/g) || []).some((v) => (/%/.test(v) ? parseFloat(v) >= 40 : /px/.test(v) ? parseFloat(v) >= 12 : parseFloat(v) * 16 >= 12)));
  if (big.length >= 4 || /border-radius\s*:\s*(?:9{3,}|5\d{2,})px/i.test(css)) add(findings, 'pill-or-round', file, 1, `${big.length} large radii`);
  const twRound = css.match(/\brounded-(?:xl|2xl|3xl|full)\b/g) || [];
  if (twRound.length >= 6) add(findings, 'pill-or-round', file, 1, `${twRound.length} large rounded classes`);
  if (/:hover[^{]*\{[^}]*transform\s*:[^;}]*(?:translateY\(\s*-|scale\(\s*1\.0\d)/i.test(css) || /\bhover:-translate-y-\d|\bhover:scale-10\d\b/.test(css)) add(findings, 'hover-lift', file, 1, 'lift or grow on hover');
  for (const fam of css.matchAll(/font-family\s*:\s*([^;}]*)/gi)) {
    ctx.families.push(...fam[1].split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean));
    const first = fam[1].split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (OVERUSED_FONTS.some((f) => f.toLowerCase() === first.toLowerCase())) ctx.overused.add(first);
  }
  if (/@font-face|@fontsource/i.test(css)) ctx.fontFace = true;
}

function scanMarkup(findings, file, text, ctx) {
  // styles inside markup are scanned like a stylesheet
  const blocks = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((x) => x[1]);
  scanStyle(findings, file, `${blocks.join('\n')}\n${[...text.matchAll(/\bclass(?:Name)?=["'{`]([^"'}`]*)/g)].map((x) => x[1]).join('\n')}`, ctx);
  for (const link of text.matchAll(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net/i.test(link[1])) add(findings, 'font-cdn', file, lineOf(text, link.index), link[1]);
  }
  if (/@fontsource|@font-face/i.test(text)) ctx.fontFace = true;
  const body = text.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ');
  const hits = EMOJI_ICONS.filter((e) => body.includes(e));
  if (hits.length) add(findings, 'emoji-icons', file, lineOf(text, text.indexOf(hits[0])), hits.join(' '));
  const filler = body.replace(/<[^>]+>/g, ' ').match(FILLER);
  if (filler) add(findings, 'filler-copy', file, lineOf(text, text.toLowerCase().indexOf(filler[0].toLowerCase())), filler[0]);
}

export function checkDesign(dir, { failScore = FAIL_SCORE } = {}) {
  const findings = [];
  const ctx = { families: [], overused: new Set(), fontFace: false };
  const files = walk(dir);
  let sawStyles = false;
  for (const file of files) {
    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const rel = path.relative(dir, file) || file;
    if (STYLE.test(file)) { sawStyles = true; scanStyle(findings, rel, text, ctx); } else scanMarkup(findings, rel, text, ctx);
  }
  // the dependency list
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const kit = UI_KITS.filter((k) => Object.keys(deps).some((d) => d === k || d.startsWith(`${k}/`)));
    if (kit.length) add(findings, 'ui-kit', 'package.json', 1, kit.join(', '));
    for (const d of Object.keys(deps)) {
      const m = /^@fontsource(?:-variable)?\/(.+)$/.exec(d);
      if (m) { ctx.fontFace = true; if (OVERUSED_FONTS.some((f) => f.toLowerCase().replace(/\s+/g, '-') === m[1])) ctx.overused.add(m[1]); }
    }
  } catch { /* no package.json */ }
  for (const f of ctx.overused) add(findings, 'overused-font', 'styles', 1, f);
  const named = ctx.families.filter((f) => !GENERIC_FAMILIES.has(f.toLowerCase()) && !f.startsWith('var('));
  if (sawStyles && !ctx.fontFace && named.length === 0) add(findings, 'no-type-decision', 'styles', 1, 'only system fonts, no @font-face');

  // one finding per rule and file, so a repeated habit is not counted again
  const seen = new Set();
  const unique = findings.filter((f) => {
    const key = `${f.rule}|${f.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const score = unique.reduce((sum, f) => sum + f.weight, 0);
  return { score, fails: score >= failScore, failScore, findings: unique, filesScanned: files.length };
}

// The lines shown to the Builder: one per finding, with what to do instead.
export function designLines(result, max = 12) {
  return result.findings.slice(0, max).map((f) => `${f.rule} in ${f.file}${f.line > 1 ? `:${f.line}` : ''} (${f.text}): ${f.fix}`);
}

// Run as a script inside a product: `node scripts/design-check.mjs [dir]`.
const isMain = process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href;
if (isMain) {
  const result = checkDesign(path.resolve(process.argv[2] || '.'));
  if (!result.findings.length) {
    console.log(`design-check: nothing found in ${result.filesScanned} files.`);
  } else {
    console.log(`design-check: score ${result.score} (fails at ${result.failScore}), ${result.findings.length} finding(s):`);
    for (const line of designLines(result, 50)) console.log(`- ${line}`);
  }
  process.exit(result.fails ? 1 : 0);
}
