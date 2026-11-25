import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookDetailResponse } from '@core/api/books-api';
import { RelatedBooksResponse, ShelfApi } from '@core/api/shelf-api';
import { toRoman } from '@shared/format/roman';
import { BookCover } from '@shared/ui/book-cover/book-cover';

/** At most this many books with the same subgenre. */
const SIMILAR = 6;

interface Volume {
  readonly id: number;
  readonly title: string;
  readonly authors: string;
  readonly coverUrl?: string;
  /** `I`, or `2,5` for a volume between two others. */
  readonly number: string;
  readonly current: boolean;
}

/** `I` for whole positions, `2,5` for the ones in between. */
function numberOf(position: number): string {
  return Number.isInteger(position) ? toRoman(position) : position.toLocaleString('pt-BR');
}

/**
 * The end of the book page: the books of its series, this one among them, and up to six books
 * of its first subgenre, the best rated first.
 *
 * <p>It sits behind `@defer`, so it only fetches when the reader gets there. A book with nothing
 * related shows nothing, and a failure here is not worth an error on a page that already showed
 * the book: the blocks just stay out.
 */
@Component({
  selector: 'ml-related-books',
  imports: [BookCover, RouterLink],
  templateUrl: './related-books.html',
  styleUrls: ['../book-section.css', './related-books.css'],
})
export class RelatedBooks {
  readonly bookId = input.required<number>();
  readonly book = input.required<BookDetailResponse>();
  /** The rating of this book, which the cards of the series do not carry for it. */
  readonly rating = input<number | undefined>();

  private readonly shelfApi = inject(ShelfApi);

  protected readonly related = httpResource<RelatedBooksResponse>(() =>
    this.shelfApi.relatedRequest(this.bookId()),
  );

  protected readonly series = computed(() => this.book().series);

  /** The volumes of the series in the collection, this one included, in the order of the series. */
  protected readonly volumes = computed<readonly Volume[]>(() => {
    const book = this.book();
    const series = book.series;
    if (!series || !this.related.hasValue()) {
      return [];
    }
    const others = this.related.value().series.map((card) => ({
      id: card.id,
      title: card.title,
      authors: card.authors.join(', '),
      coverUrl: card.coverUrl ?? undefined,
      position: card.series?.position ?? Number.MAX_SAFE_INTEGER,
      current: false,
    }));
    const self = {
      id: book.id,
      title: book.title,
      authors: book.authors.map((author) => author.name).join(', '),
      coverUrl: book.coverUrl,
      position: series.position ?? Number.MAX_SAFE_INTEGER,
      current: true,
    };
    return [...others, self]
      .sort((a, b) => a.position - b.position)
      .map(({ position, ...volume }) => ({
        ...volume,
        number: position === Number.MAX_SAFE_INTEGER ? '' : numberOf(position),
      }));
  });

  protected readonly volumeCount = computed(() => {
    const count = this.volumes().length;
    return count === 1 ? '1 livro' : `${count} livros`;
  });

  /** The first subgenre of the book names the block and decides what goes in it. */
  protected readonly subgenre = computed(() =>
    this.book().genres.find((genre) => genre.parentId != null),
  );

  protected readonly similar = computed(() => {
    const subgenre = this.subgenre();
    if (!subgenre || !this.related.hasValue()) {
      return [];
    }
    return this.related
      .value()
      .similar.filter((card) => card.genres.includes(subgenre.name))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
      .slice(0, SIMILAR)
      .map((card) => ({ ...card, authorNames: card.authors.join(', ') }));
  });
}
