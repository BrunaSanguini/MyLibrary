import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookCardResponse } from '@core/api/shelf-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';

/** The label of the card: the wishlist has no reading status, so it says WISHLIST instead. */
const LABELS = {
  READ: 'Lido',
  READING: 'Lendo agora',
  WANT_TO_READ: 'Quero ler',
  ABANDONED: 'Abandonado',
  WISHLIST: 'Wishlist',
} as const;

/**
 * A book of Minha Estante, as a card of the grid or as a row of the list. Either way the whole of
 * it is a link to the book.
 */
@Component({
  selector: 'ml-shelf-card',
  imports: [BookCover, RouterLink],
  templateUrl: './shelf-card.html',
  styleUrl: './shelf-card.css',
  host: { '[attr.data-view]': 'view()' },
})
export class ShelfCard {
  readonly book = input.required<BookCardResponse>();
  readonly view = input<'grade' | 'lista'>('grade');

  protected readonly authors = computed(() => this.book().authors.join(', '));

  /** WISHLIST, LIDO, LENDO AGORA…, which also names the colour of the pill. */
  protected readonly label = computed(() => {
    const book = this.book();
    const key = book.ownership === 'WISHLIST' ? 'WISHLIST' : book.status;
    return { key, text: LABELS[key] };
  });

  /** `J.R.R. Tolkien · 1954`, the line under the title of a row. */
  protected readonly byline = computed(() => {
    const year = this.book().publishedYear;
    return year ? `${this.authors()} · ${year}` : this.authors();
  });

  protected readonly genre = computed(() => this.book().genres[0] ?? 'Sem gênero');
  protected readonly series = computed(() => this.book().series?.name ?? 'Sem série');

  /** `4,5 ★`, or a dash when the book has no rating. */
  protected readonly rating = computed(() => {
    const rating = this.book().rating;
    return rating === undefined || rating === null
      ? '—'
      : `${rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} ★`;
  });
}
