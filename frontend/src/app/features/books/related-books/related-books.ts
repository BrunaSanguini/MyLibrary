import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookDetailResponse } from '@core/api/books-api';
import { RelatedBooksResponse, ShelfApi, toBookCard } from '@core/api/shelf-api';
import { BookCard } from '@shared/ui/book-card/book-card';
import { Icon } from '@shared/ui/icon/icon';

/**
 * The books related to one book: the rest of its series and the ones with subgenres in common.
 *
 * <p>It sits at the end of the book page behind `@defer`, so it only fetches when the reader gets
 * there. A book with nothing related shows nothing, and a failure here is not worth an error on a
 * page that already showed the book: the block just stays out.
 */
@Component({
  selector: 'ml-related-books',
  imports: [BookCard, Icon, RouterLink],
  templateUrl: './related-books.html',
  styleUrl: './related-books.css',
})
export class RelatedBooks {
  readonly bookId = input.required<number>();
  /** The series of the book, which names the block and links to its page. */
  readonly series = input<BookDetailResponse['series']>();

  private readonly shelfApi = inject(ShelfApi);

  protected readonly related = httpResource<RelatedBooksResponse>(() =>
    this.shelfApi.relatedRequest(this.bookId()),
  );

  protected readonly seriesBooks = computed(() =>
    this.related.hasValue() ? this.related.value().series.map(toBookCard) : [],
  );
  /** The books of the series in the collection: the others plus this one. */
  protected readonly seriesCount = computed(() => {
    const count = this.seriesBooks().length + 1;
    return count === 1 ? '1 livro' : `${count} livros`;
  });
  protected readonly similar = computed(() =>
    this.related.hasValue() ? this.related.value().similar.map(toBookCard) : [],
  );
}
