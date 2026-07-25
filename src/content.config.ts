import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const attack = z
  .array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  )
  .default([]);

/** Long-form reverse engineering / analysis write-ups. */
const research = defineCollection({
  loader: glob({ base: './src/content/research', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    summary: z.string(),
    /** Malware family / campaign this covers. */
    malware: z.string().optional(),
    /** Slug of an entry in the `actors` collection. */
    actor: z.string().optional(),
    tags: z.array(z.string()).default([]),
    attack,
    /** Pin to the top of the homepage. Only the newest featured post wins. */
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    /** Multi-part investigations. */
    series: z.string().optional(),
    part: z.number().optional(),
    /** Where this was first published, if it was syndicated elsewhere. */
    original: z
      .object({
        label: z.string(),
        url: z.string().url(),
      })
      .optional(),
  }),
});

/** Individual detection rules, each with its own evidence and caveats. */
const detections = defineCollection({
  loader: glob({ base: './src/content/detections', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    summary: z.string(),
    format: z.enum(['sigma', 'yara', 'suricata', 'zeek', 'splunk', 'kql', 'elastic']),
    surface: z.enum(['endpoint', 'network', 'file', 'memory', 'cloud', 'identity']),
    /** How much trust this rule has earned. Be honest here — it's the point. */
    maturity: z.enum(['production', 'lab-validated', 'sample-validated', 'untested']),
    severity: z.enum(['informational', 'low', 'medium', 'high', 'critical']),
    attack,
    /** Log sources / telemetry the rule needs to fire. */
    telemetry: z.array(z.string()).default([]),
    /** Known false positive conditions. Empty array means "none found yet", not "none exist". */
    falsePositives: z.array(z.string()).default([]),
    /** Slugs from the `research` collection this rule came out of. */
    research: z.array(z.string()).default([]),
    actor: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

/** Tracked adversaries. */
const actors = defineCollection({
  loader: glob({ base: './src/content/actors', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    name: z.string(),
    aliases: z.array(z.string()).default([]),
    nexus: z.string().optional(),
    motivation: z.array(z.string()).default([]),
    firstSeen: z.string().optional(),
    summary: z.string(),
    /** My own confidence in the attribution as stated — not a vendor's. */
    attribution: z.enum(['high', 'moderate', 'low', 'inherited']).default('inherited'),
    status: z.enum(['tracking', 'dormant', 'archived']).default('tracking'),
    attack,
    malware: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

/** Short working notes — lab builds, hunts, things that broke. */
const log = defineCollection({
  loader: glob({ base: './src/content/log', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    /** Course or track this note came out of, e.g. "SEC503". */
    track: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { research, detections, actors, log };
