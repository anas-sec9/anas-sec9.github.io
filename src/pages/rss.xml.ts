import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '../site.config';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const research = (await getCollection('research')).filter((e) => !e.data.draft);
  const log = (await getCollection('log')).filter((e) => !e.data.draft);

  const items = [
    ...research.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      description: e.data.summary,
      link: `/research/${e.id}/`,
      categories: ['Research', ...e.data.tags],
    })),
    ...log.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      description: e.data.summary,
      link: `/log/${e.id}/`,
      categories: ['Log', ...e.data.tags],
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: `${site.name} — ${site.author.name}`,
    description: site.description,
    site: context.site ?? 'https://example.com',
    items,
    customData: '<language>en</language>',
  });
}
