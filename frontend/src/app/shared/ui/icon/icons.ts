/**
 * Stroke icons of the design system: 1.5 to 1.7px, round caps and joins, drawn with currentColor.
 * Each feature adds the icons it uses.
 */
export interface IconDefinition {
  readonly viewBox: string;
  readonly strokeWidth: number;
  readonly paths: readonly string[];
}

export const ICONS = {
  'arrow-right': {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: ['M3 8h10M9 4l4 4-4 4'],
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
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;
