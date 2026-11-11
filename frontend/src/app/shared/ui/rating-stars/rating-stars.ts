import { Component, computed, input } from '@angular/core';

const MAX = 5;

/**
 * The rating as five stars, filled to any fraction (half points included).
 *
 * <p>Two layers instead of per-star glyphs: the gold row is clipped to the percentage, so 4,5
 * shows as half a star without a glyph for every possible fraction.
 */
@Component({
  selector: 'ml-rating-stars',
  templateUrl: './rating-stars.html',
  styleUrl: './rating-stars.css',
  host: {
    role: 'img',
    '[attr.aria-label]': 'label()',
    '[attr.data-size]': 'size()',
  },
})
export class RatingStars {
  /** 0 to 5, in half points. Null or undefined means the book has no rating yet. */
  readonly value = input<number | undefined>();
  readonly size = input<'sm' | 'md'>('sm');

  protected readonly stars = '★'.repeat(MAX);

  protected readonly percentage = computed(() => {
    const value = this.value();
    if (value === undefined) {
      return 0;
    }
    return (Math.min(Math.max(value, 0), MAX) / MAX) * 100;
  });

  protected readonly label = computed(() => {
    const value = this.value();
    return value === undefined
      ? 'Sem nota ainda'
      : `Nota ${value.toLocaleString('pt-BR')} de ${MAX}`;
  });
}
