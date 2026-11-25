import { httpResource } from '@angular/common/http';
import { Location } from '@angular/common';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { BooksApi } from '@core/api/books-api';
import { CatalogApi } from '@core/api/catalog-api';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { toId } from '@core/api/query-params';
import { BOOK_STATUS_LABELS, ReadingApi, ReviewResponse } from '@core/api/reading-api';
import { BookCardResponse, ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { RatingStars } from '@shared/ui/rating-stars/rating-stars';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { Tag } from '@shared/ui/tag/tag';
import { firstValueFrom } from 'rxjs';

import { SeriesAddDialog } from '../series-dialogs/series-add-dialog';
import { SeriesEditDialog } from '../series-dialogs/series-edit-dialog';

interface SeriesEntry {
  readonly id: number;
  readonly name: string;
  readonly totalVolumes?: number;
  readonly bookCount: number;
  readonly description?: string;
}

/** Past this many characters the description of the series folds, with Mostrar tudo. */
const FOLD = 320;

/** A genre of the books of the series, with its id to link to and whether it is a subgenre. */
interface SeriesGenre {
  readonly id: number;
  readonly name: string;
  readonly subgenre: boolean;
}

/** All the volumes fit in one page: no series in a personal collection has more. */
const VOLUMES = 100;

/** The review of one volume, fetched only when the tab Minhas resenhas is opened. */
@Component({
  selector: 'ml-series-review',
  imports: [RatingStars],
  template: `
    @if (review.hasValue()) {
      <article class="review">
        <header class="review-head">
          <h3>{{ position() }}. {{ book().title }}</h3>
          @if (review.value().rating) {
            <ml-rating-stars size="sm" [value]="review.value().rating" />
          }
        </header>
        @if (review.value().content; as content) {
          <p class="excerpt">{{ content }}</p>
        }
      </article>
    }
  `,
  styleUrl: './series-review.css',
})
export class SeriesReview {
  readonly book = input.required<BookCardResponse>();
  readonly position = input.required<string>();

  private readonly readingApi = inject(ReadingApi);

  /** A volume without review answers 404, and simply shows nothing. */
  protected readonly review = httpResource<ReviewResponse>(() =>
    this.readingApi.reviewRequest(this.book().id),
  );
}

/**
 * The page of a series: the covers in a fan over a dark hero, what the series is about and how far
 * the reader went in it, and the volumes in reading order.
 */
@Component({
  selector: 'ml-series-page',
  imports: [
    BookCover,
    Button,
    EmptyState,
    ErrorState,
    Icon,
    RatingStars,
    RouterLink,
    SeriesAddDialog,
    SeriesEditDialog,
    SeriesReview,
    Skeleton,
    Tab,
    TabContent,
    TabList,
    TabPanel,
    Tabs,
    Tag,
  ],
  templateUrl: './series-page.html',
  styleUrls: ['./series-hero.css', './series-page.css', './series-volumes.css'],
})
export default class SeriesPage {
  readonly id = input(undefined, { transform: toId });

  private readonly location = inject(Location);
  private readonly catalogApi = inject(CatalogApi);
  private readonly shelfApi = inject(ShelfApi);
  private readonly genresApi = inject(GenresApi);
  private readonly booksApi = inject(BooksApi);
  private readonly router = inject(Router);

  protected readonly series = httpResource<SeriesEntry>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.catalogApi.entryRequest('series', id);
  });

  protected readonly books = httpResource<ShelfPage>(() => {
    const id = this.id();
    return id === undefined
      ? undefined
      : this.shelfApi.booksRequest({ seriesId: id, sort: 'seriesPosition', size: VOLUMES });
  });

  private readonly genreTree = httpResource<GenreTreeResponse[]>(() =>
    this.books.hasValue() ? this.genresApi.treeRequest() : undefined,
  );

  protected readonly tab = signal<string | undefined>('sobre');
  protected readonly lastFirst = signal(false);
  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly notice = signal<string | undefined>(undefined);
  protected readonly unfolded = signal(false);
  /** Favorites changed on this page, before the listing is fetched again. */
  private readonly favorites = signal<ReadonlyMap<number, boolean>>(new Map());

  protected readonly statusLabels = BOOK_STATUS_LABELS;

  protected readonly volumes = computed(() => {
    const books = this.books.value()?.content ?? [];
    return this.lastFirst() ? [...books].reverse() : books;
  });

  /** Up to three covers for the fan: the middle one is the first volume. */
  protected readonly fan = computed(() => (this.books.value()?.content ?? []).slice(0, 3));

  protected readonly authors = computed(() => [
    ...new Set((this.books.value()?.content ?? []).flatMap((book) => book.authors)),
  ]);

  protected readonly readCount = computed(
    () => (this.books.value()?.content ?? []).filter((book) => book.status === 'READ').length,
  );

  /** The volumes of the series: what the series says, or else the books in the collection. */
  protected readonly totalVolumes = computed(() => {
    const series = this.series.value();
    return series?.totalVolumes ?? series?.bookCount ?? 0;
  });

  protected readonly complete = computed(
    () => this.totalVolumes() > 0 && this.readCount() >= this.totalVolumes(),
  );

  /** One bar per volume, filled for each one read. */
  protected readonly progressBars = computed(() =>
    Array.from({ length: this.totalVolumes() }, (_, index) => index < this.readCount()),
  );

  protected readonly averageRating = computed(() => {
    const ratings = (this.books.value()?.content ?? [])
      .map((book) => book.rating)
      .filter((rating): rating is number => typeof rating === 'number');
    if (ratings.length === 0) {
      return undefined;
    }
    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    return average.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  });

  /** The genres of all the volumes, genres first; linked through the genre tree. */
  protected readonly genres = computed<readonly SeriesGenre[]>(() => {
    const names = new Set((this.books.value()?.content ?? []).flatMap((book) => book.genres));
    const found: SeriesGenre[] = [];
    for (const genre of this.genreTree.value() ?? []) {
      if (names.has(genre.name)) {
        found.push({ id: genre.id, name: genre.name, subgenre: false });
      }
      for (const subgenre of genre.subgenres) {
        if (names.has(subgenre.name)) {
          found.push({ id: subgenre.id, name: subgenre.name, subgenre: true });
        }
      }
    }
    return [...found.filter((g) => !g.subgenre), ...found.filter((g) => g.subgenre)];
  });

  /** The volumes the reader still lacks, when the series says how many it has. */
  protected readonly missing = computed(() => {
    const series = this.series.value();
    return series?.totalVolumes ? Math.max(0, series.totalVolumes - series.bookCount) : 0;
  });

  protected readonly folds = computed(() => (this.series.value()?.description?.length ?? 0) > FOLD);

  protected readonly description = computed(() => {
    const text = this.series.value()?.description ?? '';
    return this.folds() && !this.unfolded() ? `${text.slice(0, FOLD).trimEnd()}…` : text;
  });

  protected readonly notFound = computed(
    () =>
      this.id() === undefined ||
      (this.series.error() !== undefined && ApiError.from(this.series.error()).status === 404),
  );

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.series.error() ?? this.books.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected countOf(count: number, one: string, many: string): string {
    return `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`;
  }

  protected positionOf(book: BookCardResponse): string {
    return book.series?.position.toLocaleString('pt-BR') ?? '';
  }

  protected favorite(book: BookCardResponse): boolean {
    return this.favorites().get(book.id) ?? book.favorite;
  }

  protected async toggleFavorite(book: BookCardResponse): Promise<void> {
    const next = !this.favorite(book);
    this.failure.set(undefined);
    this.favorites.update((map) => new Map(map).set(book.id, next));
    try {
      await firstValueFrom(this.booksApi.setFavorite(book.id, next));
    } catch (error) {
      this.favorites.update((map) => new Map(map).set(book.id, !next));
      this.failure.set(ApiError.from(error).detail);
    }
  }

  protected back(): void {
    this.location.back();
  }

  protected added(title: string): void {
    this.notice.set(`${title} entrou na série.`);
    this.retry();
  }

  protected edited(): void {
    this.notice.set('Série salva.');
    this.retry();
  }

  protected async deleted(): Promise<void> {
    await this.router.navigate(['/catalogos', 'series']);
  }

  protected retry(): void {
    this.series.reload();
    this.books.reload();
  }
}
