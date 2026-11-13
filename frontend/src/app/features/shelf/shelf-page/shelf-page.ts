import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import {
  OWNERSHIPS,
  Ownership,
  SHELF_SORTS,
  ShelfApi,
  ShelfFilter,
  ShelfPage as ShelfPageResponse,
  ShelfSort,
} from '@core/api/shelf-api';
import { toOneOf, toPageIndex, toSearchTerm } from '@core/api/query-params';
import { BookCard, BookCardData } from '@shared/ui/book-card/book-card';
import { Button } from '@shared/ui/button/button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Paginator } from '@shared/ui/paginator/paginator';
import { Tag } from '@shared/ui/tag/tag';

import { BookGridSkeleton } from '../book-grid-skeleton/book-grid-skeleton';

const toOwnership = toOneOf(OWNERSHIPS);
const toSort = toOneOf(SHELF_SORTS);

/** Positive integer id from the URL, or undefined; the catalog pages link here with one. */
function toId(value: unknown): number | undefined {
  const page = toPageIndex(value);
  return typeof value === 'string' && page > 0 ? page : undefined;
}

/** Only "true" and "false" count; anything else leaves the filter off. */
function toFlag(value: unknown): boolean | undefined {
  return value === 'true' ? true : value === 'false' ? false : undefined;
}

/**
 * Minha Estante: the whole collection, filtered, sorted and paginated.
 *
 * <p>Every filter lives in the URL and arrives as an input, so reloading and the browser's back
 * button both keep the view, and a filtered shelf can be shared or bookmarked. Each one passes
 * through a conversion that drops invalid values before they reach the request.
 */
@Component({
  selector: 'ml-shelf-page',
  imports: [BookCard, BookGridSkeleton, Button, EmptyState, ErrorState, Paginator, RouterLink, Tag],
  templateUrl: './shelf-page.html',
  styleUrl: './shelf-page.css',
})
export default class ShelfPage {
  readonly q = input(undefined, { transform: toSearchTerm });
  readonly ownership = input(undefined, { transform: toOwnership });
  readonly favorite = input(undefined, { transform: toFlag });
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
    ownership: this.ownership(),
    favorite: this.favorite(),
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
    (this.books.value()?.content ?? []).map((book) => ({
      id: book.id,
      title: book.title,
      authors: book.authors,
      coverUrl: book.coverUrl,
      seriesName: book.series?.name,
      seriesPosition: book.series?.position,
    })),
  );

  /** True once any filter narrows the shelf, which changes what the empty state should say. */
  protected readonly filtered = computed(() =>
    Boolean(
      this.q() ??
      this.ownership() ??
      this.favorite() ??
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
  ];

  /** Clicking the active state turns the filter off, which is what a pressed toggle should do. */
  protected toggleOwnership(ownership: Ownership): void {
    this.changeFilter({ ownership: this.ownership() === ownership ? null : ownership });
  }

  protected toggleFavorite(): void {
    this.changeFilter({ favorite: this.favorite() === true ? null : 'true' });
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
  protected changeFilter(params: Record<string, string | null>): void {
    this.navigate({ ...params, page: null });
  }

  protected clearFilters(): void {
    void this.router.navigate([], { queryParams: {} });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
