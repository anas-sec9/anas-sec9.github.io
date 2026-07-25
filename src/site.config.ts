// ─────────────────────────────────────────────────────────────
// Everything you'd want to change about the site's identity
// lives in this one file.
// ─────────────────────────────────────────────────────────────

export const site = {
  /** Wordmark. Rendered as two weights: "GROUND" light, "TRUTH" heavy. */
  name: 'Ground Truth',
  nameParts: ['Ground', 'Truth'] as const,

  /** Sits under the wordmark on the homepage. Keep it a claim, not a slogan. */
  tagline: 'Detection engineering and malware reverse engineering, from the sample up.',

  /** One line, used in <meta description> and RSS. */
  description:
    'Reverse-engineering malware and building detections that survive a recompile. Notes, rules and evidence by Anas Abdulalieem.',

  author: {
    name: 'Anas Abdulalieem',
    role: 'Detection Engineer · Threat Researcher',
    email: 'anasabdulalieem@gmail.com',
    github: 'https://github.com/anas-sec9',
    linkedin: 'https://www.linkedin.com/in/anas-abdulalieem',
    x: '',
  },

  /** Where the raw artifacts live, so posts can deep-link to rules and tools. */
  repos: {
    reports: 'https://github.com/anas-sec9/threat-intel-reports',
    detections: 'https://github.com/anas-sec9/detection-library',
  },

  /** Shown in the footer. */
  disclaimer:
    'All analysis is performed on isolated lab infrastructure. Samples are handled offline; C2 traffic is sinkholed. Published for defensive research only.',
} as const;

export const nav = [
  { label: 'Research', href: '/research' },
  { label: 'Detections', href: '/detections' },
  { label: 'Actors', href: '/actors' },
  { label: 'Log', href: '/log' },
  { label: 'About', href: '/about' },
] as const;
