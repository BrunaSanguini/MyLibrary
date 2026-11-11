import { Component, computed, input } from '@angular/core';

/** `xs` is the search result, `sm` the listing card, `md` the carousel and `lg` the book page. */
export type BookCoverSize = 'xs' | 'sm' | 'md' | 'lg';

/** The placeholder palette, in the order the hash picks from. */
const PLACEHOLDER_COLORS = ['emerald', 'red', 'navy', 'rust', 'plum', 'moss', 'sand'] as const;

/**
 * Cover of a book in 2:3, either the stored image or a typographic placeholder.
 *
 * <p>The placeholder colour comes from the title, so the same book always gets the same colour,
 * here and after a reload, without the back-end having to store one.
 */
@Component({
  selector: 'ml-book-cover',
  templateUrl: './book-cover.html',
  styleUrl: './book-cover.css',
  host: {
    '[attr.data-size]': 'size()',
  },
})
export class BookCover {
  readonly title = input.required<string>();
  readonly author = input<string>();
  readonly coverUrl = input<string>();
  readonly size = input<BookCoverSize>('md');

  protected readonly placeholderColor = computed(
    () => `var(--ml-color-book-${PLACEHOLDER_COLORS[hashOf(this.title())]})`,
  );

  /** "sand" is a light cover, so its text has to be dark to stay readable. */
  protected readonly placeholderInk = computed(() =>
    PLACEHOLDER_COLORS[hashOf(this.title())] === 'sand'
      ? 'var(--ml-color-gold-ink)'
      : 'var(--ml-color-hero-ink)',
  );
}

/** Small, stable string hash: the same title always lands on the same colour. */
function hashOf(title: string): number {
  let hash = 0;
  for (const character of title) {
    hash = (hash * 31 + character.codePointAt(0)!) % 100_000;
  }
  return hash % PLACEHOLDER_COLORS.length;
}
