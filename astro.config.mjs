// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Previews live under https://<owner>.github.io/<repo>/, so the workflow sets SITE_URL and SITE_BASE.
// A local build without them uses base "/". Production sets SITE_URL to the real domain.
const site = process.env.SITE_URL || 'https://zitatumzug.de';
const base = process.env.SITE_BASE || '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [preact(), sitemap()],
});
