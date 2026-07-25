# Ground Truth

Personal threat-research site — reverse engineering write-ups, a filterable detection library,
tracked-adversary profiles, and a build log.

Built with [Astro](https://astro.build). No theme, no framework, no CSS library — the design system
is in `src/styles/` and is yours to change.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve the built site
```

Node 20+ required.

---

## Changing the identity

Almost everything about "who this site is" lives in **`src/site.config.ts`** — the name, the
wordmark, the tagline, your links, the repo URLs, and the nav order. Change it there, not in the
components.

The **visual identity** lives in **`src/styles/tokens.css`**. The three things worth knowing:

| What | Token | Currently |
| --- | --- | --- |
| Accent colour | `--accent` | Ember amber `#e0a458` |
| Display face | `--font-display` | Newsreader (serif) |
| Body face | `--font-sans` | Inter |

Changing `--accent` recolours the whole site — every badge, link, rule and hover state derives from
it. To swap a font, install the corresponding `@fontsource-variable/*` package, import it in
`src/components/Head.astro`, and update the token.

---

## Adding content

Four collections, all in `src/content/`. Schemas are enforced at build time in
`src/content.config.ts` — if you get a field wrong, the build tells you which file and which field
rather than silently rendering nothing.

### A research write-up

Create `src/content/research/your-slug.mdx`:

```yaml
---
title: Phoenix, Unmasked
subtitle: One line of context, rendered in italic serif under the title
date: 2026-07-09
summary: >-
  Two or three sentences. Used on the homepage, in listings, in RSS and in the
  social card, so write it as a pitch rather than a description.
malware: Phoenix          # optional
actor: muddywater         # optional — must match an actors/ filename
series: Phoenix           # optional — groups multi-part investigations
part: 1
featured: true            # optional — pins to the homepage lead
tags: [muddywater, yara]
attack:
  - { id: 'T1566.001', name: 'Spearphishing Attachment' }
original:                 # optional — for syndicated posts
  label: Medium
  url: https://medium.com/@you/slug
draft: false
---
```

Use `.mdx` (not `.md`) if you want the custom components:

```mdx
import KeyFacts from '../../components/KeyFacts.astro';
import Callout from '../../components/Callout.astro';
import IOCs from '../../components/IOCs.astro';
import Shot from '../../components/Shot.astro';
```

**`<KeyFacts>`** — the "at a glance" table that opens a report.

**`<Callout type="finding|correction|bench|caveat|note">`** — the editorial callouts. `finding` for a
proven conclusion, `correction` for where you were wrong, `bench` for what isn't tested yet,
`caveat` for scope limits. These carry the site's whole editorial position, so use them.

**`<IOCs items={[...]}/>`** — the indicator table. Every entry needs a `confidence` of
`high | medium | low`; that's deliberate.

**`<Shot caption="..." src="/shots/foo.png" wide />`** — a figure. **Without `src` it renders a
visible placeholder** describing what belongs there, so an unfinished post looks unfinished. Drop
images in `public/shots/` and add the `src` when you have them.

### A detection

Create `src/content/detections/your-slug.md`. The frontmatter is the useful part:

```yaml
---
title: Phoenix core backdoor — cross-sample code anchors
date: 2026-07-10
summary: One sentence on what it catches and why it's built that way.
format: yara               # sigma | yara | suricata | zeek | splunk | kql | elastic
surface: file              # endpoint | network | file | memory | cloud | identity
maturity: sample-validated # production | lab-validated | sample-validated | untested
severity: critical         # informational | low | medium | high | critical
telemetry:
  - What log source this needs to fire
falsePositives:
  - What you actually hit. An empty list renders as "none found yet, which is not the
    same as none existing" — so leaving it empty is honest, not lazy.
research: [hunting-phoenix]   # slugs from research/ — renders a cross-link both ways
actor: muddywater
attack:
  - { id: 'T1027.009', name: 'Embedded Payloads' }
---
```

The `format`, `surface` and `maturity` values become the filter chips on `/detections`
automatically — no config to update when you add a new one.

`maturity` is load-bearing. What each level means is written up in
`src/content/log/what-untested-means.md`; keep that page honest and the labels mean something.

### An actor and a log entry

`src/content/actors/*.md` and `src/content/log/*.md`. Same idea — see the existing files. Actor
pages automatically list any research and detections whose `actor:` field matches the filename.

### Hiding a draft

`draft: true` on any entry keeps it out of every listing, the RSS feed, and the build.

---

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main`. Two things to set first.

**1. Set the URL in `astro.config.mjs`.**

```js
// User site — https://<user>.github.io
site: 'https://anas-sec9.github.io',
base: '/',

// Project repo — https://<user>.github.io/<repo>
site: 'https://anas-sec9.github.io',
base: '/repo-name',

// Custom domain
site: 'https://yourdomain.tld',
base: '/',        // and add public/CNAME containing yourdomain.tld
```

Getting `base` wrong is the usual cause of a deployed site with no CSS. Every internal link in the
codebase goes through the `href()` helper in `src/lib/url.ts`, so it respects `base` — use it for
any new link rather than hardcoding paths.

**2. In the repo: Settings → Pages → Source → GitHub Actions.**

Then push. First deploy takes a couple of minutes.

---

## Structure

```
src/
  site.config.ts        identity, nav, links — start here
  content.config.ts     collection schemas
  styles/
    tokens.css          colour, type, spacing — the design system
    base.css            reset, layout primitives, badges
    prose.css           article body styling
  components/           Callout, IOCs, KeyFacts, Shot, cards, nav, footer
  layouts/              Base (shell), Article (prose + TOC)
  pages/                routes
  content/              your writing
public/
  favicon.svg
  shots/                screenshots referenced by <Shot src="..." />
```

---

Everything published here should be reproducible by the reader. That's the point of the name.
