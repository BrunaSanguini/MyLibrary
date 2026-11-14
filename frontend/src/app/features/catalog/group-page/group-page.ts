import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { CatalogApi, NamedEntry } from '@core/api/catalog-api';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { toId, toPageIndex } from '@core/api/query-params';
import { ShelfApi, ShelfPage, toBookCard } from '@core/api/shelf-api';
import { BookGridSkeleton } from '@shared/ui/book-grid-skeleton/book-grid-skeleton';
import { BookCard } from '@shared/ui/book-card/book-card';
import { Button } from '@shared/ui/button/button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Paginator } from '@shared/ui/paginator/paginator';

import { GroupKind, GROUPS, isListed } from '../catalog-kinds';

/**
 * The books of one author, series, publisher or genre.
 *
 * <p>One page for the four: what changes is the filter sent to the shelf listing and where the
 * name comes from. A series shows its books in reading order; the others, newest first. The kind
 * arrives from the route data, and the id from the address.
 */
@Component({
  selector: 'ml-group-page',
  imports: [BookCard, BookGridSkeleton, Button, EmptyState, ErrorState, Paginator, RouterLink],
  templateUrl: './group-page.html',
  styleUrl: './group-page.css',
})
export default class GroupPage {
  readonly kind = input.required<GroupKind>();
  readonly id = input(undefined, { transform: toId });
  readonly page = input(0, { transform: toPageIndex });

  private readonly router = inject(Router);
  private readonly shelfApi = inject(ShelfApi);
  private readonly catalogApi = inject(CatalogApi);
  private readonly genresApi = inject(GenresApi);

  protected readonly group = computed(() => GROUPS[this.kind()]);

  private readonly entry = httpResource<NamedEntry>(() => {
    const kind = this.kind();
    const id = this.id();
    return id !== undefined && isListed(kind) ? this.catalogApi.entryRequest(kind, id) : undefined;
  });

  /** A genre has no endpoint of its own: its name is in the tree the menu already uses. */
  private readonly genres = httpResource<GenreTreeResponse[]>(() =>
    this.kind() === 'genres' && this.id() !== undefined ? this.genresApi.treeRequest() : undefined,
  );

  protected readonly books = httpResource<ShelfPage>(() => {
    const id = this.id();
    if (id === undefined) {
      return undefined;
    }
    return this.shelfApi.booksRequest({
      [this.group().filter]: id,
      sort: this.kind() === 'series' ? 'seriesPosition' : undefined,
      page: this.page(),
    });
  });

  protected readonly name = computed(() => {
    if (this.kind() !== 'genres') {
      return this.entry.value()?.name;
    }
    const id = this.id();
    for (const genre of this.genres.value() ?? []) {
      const found = genre.id === id ? genre : genre.subgenres.find((sub) => sub.id === id);
      if (found) {
        return found.name;
      }
    }
    return undefined;
  });

  protected readonly cards = computed(() => (this.books.value()?.content ?? []).map(toBookCard));

  private readonly nameError = computed(() => {
    const error: unknown = this.entry.error() ?? this.genres.error();
    return error === undefined ? undefined : ApiError.from(error);
  });

  /** A mistyped id, an entry that is gone, or a genre id that is not in the tree. */
  protected readonly notFound = computed(() => {
    if (this.id() === undefined || this.nameError()?.status === 404) {
      return true;
    }
    return this.kind() === 'genres' && this.genres.hasValue() && this.name() === undefined;
  });

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.books.error();
    return (error === undefined ? this.nameError() : ApiError.from(error))?.detail;
  });

  protected readonly failed = computed(
    () => this.books.error() !== undefined || this.nameError() !== undefined,
  );

  protected retry(): void {
    this.books.reload();
    this.entry.reload();
    this.genres.reload();
  }

  protected changePage(page: number): void {
    void this.router.navigate([], {
      queryParams: { page: page === 0 ? null : page },
      queryParamsHandling: 'merge',
    });
  }
}
