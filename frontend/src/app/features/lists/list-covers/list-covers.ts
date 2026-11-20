import { Component, computed, input } from '@angular/core';
import { ListColor } from '@core/api/lists-api';

import { colorOf } from '../list-colors';

/**
 * The fan of three covers on a list card: the first book in front, the second behind it to the
 * right and the third behind it to the left.
 *
 * <p>Only decoration, so it is hidden from assistive technology: the card already says what is
 * in the list. A book without a cover leaves its place in the fan empty (the colour of a raised
 * surface), except the one in front: with no cover at all it shows the name of the list on the
 * colour the list was given.
 */
@Component({
  selector: 'ml-list-covers',
  templateUrl: './list-covers.html',
  styleUrl: './list-covers.css',
  host: { 'aria-hidden': 'true' },
})
export class ListCovers {
  readonly name = input.required<string>();
  readonly color = input.required<ListColor>();
  /** The covers of the first books of the list that have one, at most three. */
  readonly coverUrls = input<readonly string[]>([]);

  protected readonly front = computed(() => this.coverUrls()[0]);
  protected readonly right = computed(() => this.coverUrls()[1]);
  protected readonly left = computed(() => this.coverUrls()[2]);
  protected readonly background = computed(() => colorOf(this.color()));
}
