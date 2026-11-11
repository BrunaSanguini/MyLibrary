import { Component, input } from '@angular/core';

/** `text` is one line, `cover` a 2:3 cover and `card` the whole horizontal book card. */
export type SkeletonVariant = 'text' | 'cover' | 'card';

/**
 * Placeholder shown while the data loads.
 *
 * <p>Hidden from assistive technology: the screen announces the loading itself, and a reader
 * gains nothing from a list of empty boxes.
 */
@Component({
  selector: 'ml-skeleton',
  template: '',
  styleUrl: './skeleton.css',
  host: {
    'aria-hidden': 'true',
    '[attr.data-variant]': 'variant()',
    '[style.width]': 'width()',
  },
})
export class Skeleton {
  readonly variant = input<SkeletonVariant>('text');
  /** Any CSS width, to vary the lines of a paragraph. */
  readonly width = input<string>();
}
