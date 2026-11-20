import { ListColor } from '@core/api/lists-api';

export interface ListColorOption {
  readonly id: ListColor;
  /** What a screen reader says for the swatch. */
  readonly label: string;
  /** The colour as a token, the same in both themes: a cover does not change with the theme. */
  readonly color: string;
}

/** The six covers of the design system, in the order the form offers them. */
export const LIST_COLORS: readonly ListColorOption[] = [
  { id: 'FOREST', label: 'Verde floresta', color: 'var(--ml-color-book-emerald)' },
  { id: 'PLUM', label: 'Ameixa', color: 'var(--ml-color-book-plum)' },
  { id: 'NIGHT', label: 'Azul noite', color: 'var(--ml-color-book-navy)' },
  { id: 'RUST', label: 'Ferrugem', color: 'var(--ml-color-book-rust)' },
  { id: 'SEAL', label: 'Lacre', color: 'var(--ml-color-book-red)' },
  { id: 'MOSS', label: 'Musgo', color: 'var(--ml-color-book-moss)' },
];

/** The colour of a list created without choosing one. */
export const DEFAULT_LIST_COLOR: ListColor = 'PLUM';

export function colorOf(id: ListColor): string {
  return (LIST_COLORS.find((option) => option.id === id) ?? LIST_COLORS[1]!).color;
}
