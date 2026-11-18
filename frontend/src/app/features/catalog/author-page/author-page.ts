import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { CatalogApi, NamedEntry } from '@core/api/catalog-api';
import { toId } from '@core/api/query-params';
import { BookCardResponse, ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Breadcrumbs } from '@shared/ui/breadcrumbs/breadcrumbs';
import { Button } from '@shared/ui/button/button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';
import { RatingStars } from '@shared/ui/rating-stars/rating-stars';
import { Skeleton } from '@shared/ui/skeleton/skeleton';

type StatusFilter = 'all' | 'READ' | 'READING' | 'WANT_TO_READ';

const FILTERS: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'READ', label: 'Lidos' },
  { id: 'READING', label: 'Lendo' },
  { id: 'WANT_TO_READ', label: 'Quero ler' },
];

/** All the books of an author fit in one page: the filters and the order run here. */
const BOOKS = 100;

/** "J. R. R. Tolkien" becomes "JT": the first and the last word. */
function monogramOf(name: string): string {
  const words = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  const first = words.at(0)?.charAt(0) ?? '?';
  const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * The page of an author: a card with the monogram, the numbers of the collection, the series and
 * the covers in a fan, then the books, filtered by status and in publication order.
 */
@Component({
  selector: 'ml-author-page',
  imports: [
    BookCover,
    Breadcrumbs,
    Button,
    EmptyState,
    ErrorState,
    Icon,
    ProgressBar,
    RatingStars,
    RouterLink,
    Skeleton,
  ],
  templateUrl: './author-page.html',
  styleUrls: ['./author-head.css', './author-page.css'],
})
export default class AuthorPage {
  readonly id = input(undefined, { transform: toId });

  private readonly catalogApi = inject(CatalogApi);
  private readonly shelfApi = inject(ShelfApi);

  protected readonly author = httpResource<NamedEntry>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.catalogApi.entryRequest('authors', id);
  });

  protected readonly books = httpResource<ShelfPage>(() => {
    const id = this.id();
    return id === undefined
      ? undefined
      : this.shelfApi.booksRequest({ authorId: id, sort: 'title', size: BOOKS });
  });

  protected readonly filter = signal<StatusFilter>('all');
  protected readonly newestFirst = signal(false);

  private readonly all = computed(() => this.books.value()?.content ?? []);

  protected readonly monogram = computed(() => monogramOf(this.author.value()?.name ?? ''));

  protected readonly filters = computed(() =>
    FILTERS.map((option) => ({
      ...option,
      count:
        option.id === 'all'
          ? this.all().length
          : this.all().filter((book) => book.status === option.id).length,
    })),
  );

  protected readonly kpis = computed(() => {
    const books = this.all();
    const ratings = books
      .map((book) => book.rating)
      .filter((rating): rating is number => typeof rating === 'number');
    const kpis = [
      { value: String(books.length), label: 'na estante' },
      { value: String(books.filter((book) => book.status === 'READ').length), label: 'lidos' },
      { value: String(books.filter((book) => book.status === 'READING').length), label: 'lendo' },
    ];
    if (ratings.length > 0) {
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      kpis.push({
        value: average.toLocaleString('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
        label: 'nota média',
      });
    }
    return kpis;
  });

  /** The series the author has in the collection, with how many of its books are there. */
  protected readonly series = computed(() => {
    const found = new Map<number, { id: number; name: string; count: number }>();
    for (const book of this.all()) {
      if (book.series) {
        const entry = found.get(book.series.id) ?? { ...book.series, count: 0 };
        found.set(book.series.id, { id: entry.id, name: entry.name, count: entry.count + 1 });
      }
    }
    return [...found.values()];
  });

  /** Three covers for the fan, the ones with a cover image first. */
  protected readonly fan = computed(() =>
    [...this.all()].sort((a, b) => Number(!!b.coverUrl) - Number(!!a.coverUrl)).slice(0, 3),
  );

  /** Publication order, books without a year at the end; or the newest first. */
  protected readonly visible = computed(() => {
    const filter = this.filter();
    const books = this.all().filter((book) => filter === 'all' || book.status === filter);
    const year = (book: BookCardResponse) => book.publishedYear ?? Number.MAX_SAFE_INTEGER;
    const sorted = [...books].sort((a, b) => year(a) - year(b) || a.title.localeCompare(b.title));
    return this.newestFirst() ? sorted.reverse() : sorted;
  });

  protected readonly crumbs = computed(() => [
    { label: 'Início', link: '/' },
    { label: 'Autores', link: '/catalogos', queryParams: { tipo: 'autores' } },
    { label: this.author.value()?.name ?? '' },
  ]);

  protected readonly notFound = computed(
    () =>
      this.id() === undefined ||
      (this.author.error() !== undefined && ApiError.from(this.author.error()).status === 404),
  );

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.author.error() ?? this.books.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected metaOf(book: BookCardResponse): string {
    const authors = book.authors.join(', ');
    return book.publishedYear ? `${authors} · ${book.publishedYear}` : authors;
  }

  protected sealOf(book: BookCardResponse): string | undefined {
    switch (book.status) {
      case 'READ':
        return 'Lido';
      case 'WANT_TO_READ':
        return 'Quero ler';
      case 'ABANDONED':
        return 'Abandonado';
      default:
        return undefined;
    }
  }

  protected ratingText(rating: number): string {
    return rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  protected retry(): void {
    this.author.reload();
    this.books.reload();
  }
}
