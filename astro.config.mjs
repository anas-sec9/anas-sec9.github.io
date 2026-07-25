// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

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
