export const site = {
  name: 'Ground Truth',
  nameParts: ['Ground', 'Truth'] as const,

  tagline: 'Detection engineering and malware reverse engineering, from the sample up.',

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

  repos: {
    reports: 'https://github.com/anas-sec9/threat-intel-reports',
    detections: 'https://github.com/anas-sec9/detection-library',
  },

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
