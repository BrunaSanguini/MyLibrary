import { Directive, input } from '@angular/core';

/**
 * `state` is a toggle ("Tenho este livro"), `genre` and `subgenre` link to the catalog, and
 * `seal` is a read-only badge ("Relido · 2 leituras").
 */
export type TagVariant = 'state' | 'genre' | 'subgenre' | 'seal';

/**
 * Pill for the state of a book and for its classification, on a native button, link or span.
 *
 * <p>A `state` tag belongs on a `<button>` and the caller sets `aria-pressed`; `pressed` only
 * paints it as active. Never more than one accent colour in the same row of chips. The stylesheet
 * is global (tag.css, imported by styles.css), as a directive has no view to scope styles to.
 */
@Directive({
  selector: 'button[mlTag], a[mlTag], span[mlTag]',
  host: {
    class: 'ml-tag',
    '[attr.data-variant]': 'mlTag()',
    '[attr.data-pressed]': 'pressed() ? "" : null',
  },
})
export class Tag {
  /** Bare `mlTag` carries an empty string, which means a genre chip. */
  readonly mlTag = input<TagVariant, TagVariant | ''>('genre', {
    transform: (variant) => variant || 'genre',
  });

  readonly pressed = input(false);
}
