import { Component, computed, input } from '@angular/core';

/** Width and height of the drawing (viewBox), so the crest keeps its proportion at any size. */
const WIDTH = 120;
const HEIGHT = 140;

/**
 * The crest of the app: a night-blue shield with a golden edge, a star in orbit and an open book.
 * Always decorative; the link or title that holds it carries the name.
 */
@Component({
  selector: 'ml-crest',
  templateUrl: './crest.html',
  styleUrl: './crest.css',
})
export class Crest {
  /** Width in pixels; the height follows the proportion of the drawing. */
  readonly width = input(28);

  protected readonly height = computed(() => Math.round((this.width() * HEIGHT) / WIDTH));
}
