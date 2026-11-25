/**
 * Stroke icons of the design system: 1.5 to 1.7px, round caps and joins, drawn with currentColor.
 * The ornamental diamond is the only filled shape, which is why `fills` exists.
 */
export interface IconDefinition {
  readonly viewBox: string;
  readonly strokeWidth: number;
  readonly paths: readonly string[];
  /** Shapes painted with currentColor instead of stroked. Only the ornament uses them. */
  readonly fills?: readonly string[];
}

export const ICONS = {
  'arrow-right': {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M3 8h10M9 4l4 4-4 4'],
  },
  'arrow-up': {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M8 13V3M4 7l4-4 4 4'],
  },
  'arrow-down': {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M8 3v10M4 9l4 4 4-4'],
  },
  user: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: [
      'M8 8a2.8 2.8 0 1 0 0-5.6A2.8 2.8 0 0 0 8 8zM2.8 14c.6-2.7 2.7-4.2 5.2-4.2s4.6 1.5 5.2 4.2',
    ],
  },
  camera: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M2 5.5h2.6l1.2-1.8h4.4l1.2 1.8H14v7.3H2zM8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  },
  flame: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: [
      'M8 14.5c2.6 0 4.3-1.8 4.3-4.2 0-2.7-2.2-4.2-2.9-6.8-1 1.2-1.4 2.4-1.3 3.6C7.2 6.3 6.6 5 6.6 3.4 4.7 5 3.7 7.4 3.7 10.3c0 2.4 1.7 4.2 4.3 4.2z',
    ],
  },
  pause: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M5.5 3.5v9M10.5 3.5v9'],
  },
  play: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M5 3.2v9.6L12.5 8z'],
  },
  'chevron-left': {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M10 3.5 5.5 8l4.5 4.5'],
  },
  'chevron-right': {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M6 3.5 10.5 8 6 12.5'],
  },
  'chevron-down': {
    viewBox: '0 0 12 12',
    strokeWidth: 1.3,
    paths: ['M2.5 4.5 6 8l3.5-3.5'],
  },
  moon: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.7,
    paths: ['M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z'],
  },
  sun: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.7,
    paths: [
      'M16.2 12a4.2 4.2 0 1 1-8.4 0 4.2 4.2 0 0 1 8.4 0Z',
      'M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7',
    ],
  },
  gear: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.7,
    paths: [
      'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
      'M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4Z',
    ],
  },
  search: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.7,
    paths: ['M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z', 'm16 16 4.5 4.5'],
  },
  owned: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M3 2.5h10v11l-5-3-5 3z'],
  },
  wishlist: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: [
      'M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 0 1 8 5a2.8 2.8 0 0 1 5.5 1.3C13.5 10.2 8 13.5 8 13.5Z',
    ],
  },
  edit: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M10.5 2.5l3 3L6 13H3v-3z'],
  },
  trash: {
    viewBox: '0 0 18 18',
    strokeWidth: 1.5,
    paths: ['M3 5h12M7 5V3.5h4V5M5 5l.7 9.5h6.6L13 5M7.5 8v4M10.5 8v4'],
  },
  grid: {
    viewBox: '0 0 18 18',
    strokeWidth: 1.5,
    paths: ['M3 3h5v5H3zM10 3h5v5h-5zM3 10h5v5H3zM10 10h5v5h-5z'],
  },
  list: {
    viewBox: '0 0 18 18',
    strokeWidth: 1.5,
    paths: ['M6.5 4.5h9M6.5 9h9M6.5 13.5h9M2.5 4.5h.5M2.5 9h.5M2.5 13.5h.5'],
  },
  plus: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M8 3v10M3 8h10'],
  },
  close: {
    viewBox: '0 0 12 12',
    strokeWidth: 1.5,
    paths: ['M2.5 2.5l7 7M9.5 2.5l-7 7'],
  },
  star: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M8 2.2l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.4l-3.6 1.9.7-4L2.2 6.5l4-.6z'],
  },
  upload: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M8 10.5V3M5 5.5 8 2.5l3 3M2.5 10v3h11v-3'],
  },
  check: {
    viewBox: '0 0 14 14',
    strokeWidth: 1.7,
    paths: ['M3 7.5l2.5 2.5L11 4'],
  },
  series: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M2.5 3h3v10h-3zM6.5 3h3v10h-3zM10.3 3.4l2.8-.8 2.4 9.7-2.8.8z'],
  },
  reading: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: [
      'M2.5 3.5c2-1 3.8-1 5.5 0v9.5c-1.7-1-3.5-1-5.5 0zM8 3.5c1.7-1 3.5-1 5.5 0v9.5c-2-1-3.8-1-5.5 0z',
    ],
  },
  reread: {
    viewBox: '0 0 14 14',
    strokeWidth: 1.5,
    paths: [
      'M2.5 7a4.5 4.5 0 0 1 7.7-3.2M11.5 7a4.5 4.5 0 0 1-7.7 3.2M10.5 1.5v2.6H7.9M3.5 12.5V9.9h2.6',
    ],
  },
  /** Empty and error states: a closed book on a shelf. */
  shelf: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.5,
    paths: ['M4 4.5h5.5v13H4zM10.5 4.5H16v13h-5.5z', 'M3 20.5h18'],
  },
  warning: {
    viewBox: '0 0 24 24',
    strokeWidth: 1.7,
    paths: ['M12 3.5 21.5 20H2.5L12 3.5Z', 'M12 9.5v4.5M12 17h.01'],
  },
  /** The only filled icon, always drawn in gold (design system, Icones). */
  ornament: {
    viewBox: '0 0 22 8',
    strokeWidth: 1,
    paths: ['M0 4h8M14 4h8'],
    fills: ['M11 0.8 14.2 4 11 7.2 7.8 4Z'],
  },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;
