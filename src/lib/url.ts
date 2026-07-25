const BASE = import.meta.env.BASE_URL;

/** Build an internal href that respects the configured `base`. */
export function href(path: string): string {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  return (base + clean).replace(/\/+$/, '') || '/';
}

/** Long date: "12 October 2025" */
export function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** Compact date: "2025.10.12" — used in listings and rails. */
export function fmtStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}`;
}

/** Machine date for <time datetime>. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Zero-padded index for the editorial number rail. */
export function idx(n: number): string {
  return String(n).padStart(2, '0');
}

/** Rough reading time from raw markdown. */
export function readingTime(body: string | undefined): string {
  const words = (body ?? '').trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 210))} min`;
}

/** "1 profile" / "2 profiles" — pass an explicit plural for irregular words. */
export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Link an ATT&CK ID to its page on attack.mitre.org. */
export function attackUrl(id: string): string {
  const parts = id.trim().toUpperCase().split('.');
  const base = parts[0];
  const kind = base.startsWith('TA') ? 'tactics' : base.startsWith('S') ? 'software' : base.startsWith('G') ? 'groups' : 'techniques';
  return parts.length > 1
    ? `https://attack.mitre.org/${kind}/${base}/${parts[1]}/`
    : `https://attack.mitre.org/${kind}/${base}/`;
}
