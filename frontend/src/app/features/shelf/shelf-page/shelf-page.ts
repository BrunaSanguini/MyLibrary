import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import {
  OWNERSHIPS,
  Ownership,
  SHELF_SORTS,
  SHELF_STATUSES,
  ShelfApi,
  ShelfFilter,
  ShelfPage as ShelfPageResponse,
  ShelfSort,
  ShelfStatus,
  toBookCard,
} from '@core/api/shelf-api';
import { toFlag, toId, toManyOf, toOneOf, toPageIndex, toSearchTerm } from '@core/api/query-params';
import { BookCard, BookCardData } from '@shared/ui/book-card/book-card';
import { Button } from '@shared/ui/button/button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Paginator } from '@shared/ui/paginator/paginator';
import { Tag } from '@shared/ui/tag/tag';

import { BookGridSkeleton } from '@shared/ui/book-grid-skeleton/book-grid-skeleton';

const toOwnership = toOneOf(OWNERSHIPS);
const toSort = toOneOf(SHELF_SORTS);
const toStatuses = toManyOf(SHELF_STATUSES);

/**
 * Minha Estante: the whole collection, filtered, sorted and paginated.
 *
 * <p>Every filter lives in the URL and arrives as an input, so reloading and the browser's back
 * button both keep the view, and a filtered shelf can be shared or bookmarked. Each one passes
 * through a conversion that drops invalid values before they reach the request.
 */
@Component({
  selector: 'ml-shelf-page',
  imports: [
    BookCard,
    BookGridSkeleton,
    Button,
    EmptyState,
    ErrorState,
    Icon,
    Paginator,
    RouterLink,
    Tag,
  ],
  templateUrl: './shelf-page.html',
  styleUrl: './shelf-page.css',
})
export default class ShelfPage {
  readonly q = input(undefined, { transform: toSearchTerm });
  /** Repeats in the URL: `?status=READING&status=READ` shows the books in either status. */
  readonly status = input([], { transform: toStatuses });
  readonly ownership = input(undefined, { transform: toOwnership });
  readonly favorite = input(undefined, { transform: toFlag });
  /** Read more than once: where the Releituras card of the Listas page leads. */
  readonly reread = input(undefined, { transform: toFlag });
  readonly genreId = input(undefined, { transform: toId });
  readonly authorId = input(undefined, { transform: toId });
  readonly publisherId = input(undefined, { transform: toId });
  readonly seriesId = input(undefined, { transform: toId });
  readonly sort = input(undefined, { transform: toSort });
  readonly page = input(0, { transform: toPageIndex });

  private readonly router = inject(Router);
  private readonly shelfApi = inject(ShelfApi);

  protected readonly filter = computed<ShelfFilter>(() => ({
    q: this.q(),
    status: this.status(),
    ownership: this.ownership(),
    favorite: this.favorite(),
    reread: this.reread(),
    genreId: this.genreId(),
    authorId: this.authorId(),
    publisherId: this.publisherId(),
    seriesId: this.seriesId(),
    sort: this.sort(),
    page: this.page(),
  }));

  protected readonly books = httpResource<ShelfPageResponse>(() =>
    this.shelfApi.booksRequest(this.filter()),
  );

  protected readonly cards = computed<readonly BookCardData[]>(() =>
    (this.books.value()?.content ?? []).map(toBookCard),
  );

  /** True once any filter narrows the shelf, which changes what the empty state should say. */
  protected readonly filtered = computed(
    () =>
      this.status().length > 0 ||
      Boolean(
        this.q() ??
        this.ownership() ??
        this.favorite() ??
        this.reread() ??
        this.genreId() ??
        this.authorId() ??
        this.publisherId() ??
        this.seriesId(),
      ),
  );

  /** The detail the API wrote, already in Portuguese, or the front-end's own network message. */
  protected readonly errorMessage = computed(() => {
    const error: unknown = this.books.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected readonly sortOptions: readonly { value: ShelfSort; label: string }[] = [
    { value: 'addedAt', label: 'Adicionados por último' },
    { value: 'title', label: 'Título' },
    { value: 'author', label: 'Autor' },
    { value: 'seriesPosition', label: 'Posição na série' },
    { value: 'rating', label: 'Melhor nota' },
    { value: 'finishedAt', label: 'Lidos por último' },
  ];

  protected readonly statusOptions: readonly { value: ShelfStatus; label: string }[] = [
    { value: 'READING', label: 'Lendo' },
    { value: 'WANT_TO_READ', label: 'Quero ler' },
    { value: 'READ', label: 'Lidos' },
    { value: 'ABANDONED', label: 'Abandonados' },
  ];

  /** Each status is a switch of its own: several can be on, and none means all of them. */
  protected toggleStatus(status: ShelfStatus): void {
    const current = this.status();
    const next = current.includes(status)
      ? current.filter((active) => active !== status)
      : [...current, status];
    this.changeFilter({ status: next.length > 0 ? next : null });
  }

  /** Clicking the active state turns the filter off, which is what a pressed toggle should do. */
  protected toggleOwnership(ownership: Ownership): void {
    this.changeFilter({ ownership: this.ownership() === ownership ? null : ownership });
  }

  protected toggleFavorite(): void {
    this.changeFilter({ favorite: this.favorite() === true ? null : 'true' });
  }

  protected toggleReread(): void {
    this.changeFilter({ reread: this.reread() === true ? null : 'true' });
  }

  protected changeSort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    // The default order needs no parameter, which keeps the address bar clean.
    this.changeFilter({ sort: value === 'addedAt' ? null : value });
  }

  protected changePage(page: number): void {
    this.navigate({ page: page === 0 ? null : page });
  }

  /** Changing a filter goes back to the first page: page 4 of the old filter means nothing. */
  protected changeFilter(params: Record<string, string | readonly string[] | null>): void {
    this.navigate({ ...params, page: null });
  }

  protected clearFilters(): void {
    void this.router.navigate([], { queryParams: {} });
  }

  private navigate(queryParams: Record<string, string | number | readonly string[] | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
