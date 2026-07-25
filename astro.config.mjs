// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// ─────────────────────────────────────────────────────────────
// DEPLOY TARGET
//
// User site  (https://anas-sec9.github.io)          -> site: 'https://anas-sec9.github.io',  base: '/'
// Project repo (https://anas-sec9.github.io/gt)     -> site: 'https://anas-sec9.github.io',  base: '/gt'
//
// Custom domain -> site: 'https://yourdomain.tld', base: '/', and add public/CNAME
// ─────────────────────────────────────────────────────────────

export default defineConfig({
  site: 'https://anas-sec9.github.io',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'vesper',
      wrap: false,
    },
  },
  build: {
    format: 'directory',
  },
});
