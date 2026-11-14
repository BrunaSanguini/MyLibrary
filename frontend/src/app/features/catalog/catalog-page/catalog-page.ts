import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { AuthorResponse, CatalogApi } from '@core/api/catalog-api';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { toPageIndex } from '@core/api/query-params';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Paginator } from '@shared/ui/paginator/paginator';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { Tag } from '@shared/ui/tag/tag';

import { GROUP_KINDS, GROUPS, isListed, toGroupKind } from '../catalog-kinds';

/** A page of authors, publishers or series: the three share name, count and covers. */
interface EntryPage {
  readonly content: readonly AuthorResponse[];
  readonly page: number;
  readonly totalPages: number;
}

/**
 * Catálogos: the collection by genre, author, publisher and series.
 *
 * <p>The open tab lives in the URL (`?tipo=autores`), like the filters of the shelf, so it
 * survives a reload and can be linked to. The tabs are plain links with `aria-current`, which
 * makes them work with the keyboard and the browser history without any script.
 */
@Component({
  selector: 'ml-catalog-page',
  imports: [BookCover, EmptyState, ErrorState, Paginator, RouterLink, Skeleton, Tag],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.css',
})
export default class CatalogPage {
  readonly tipo = input('genres', { transform: toGroupKind });
  readonly page = input(0, { transform: toPageIndex });

  private readonly router = inject(Router);
  private readonly catalogApi = inject(CatalogApi);
  private readonly genresApi = inject(GenresApi);

  protected readonly tabs = GROUP_KINDS.map((kind) => ({ kind, ...GROUPS[kind] }));
  protected readonly group = computed(() => GROUPS[this.tipo()]);

  protected readonly genres = httpResource<GenreTreeResponse[]>(() =>
    this.tipo() === 'genres' ? this.genresApi.treeRequest() : undefined,
  );

  protected readonly entries = httpResource<EntryPage>(() => {
    const kind = this.tipo();
    return isListed(kind) ? this.catalogApi.listRequest(kind, undefined, this.page()) : undefined;
  });

  protected readonly loading = computed(() =>
    this.tipo() === 'genres' ? !this.genres.hasValue() : !this.entries.hasValue(),
  );

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.tipo() === 'genres' ? this.genres.error() : this.entries.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected readonly placeholders = [0, 1, 2, 3, 4, 5];

  protected countOf(bookCount: number): string {
    return bookCount === 1 ? '1 livro' : `${bookCount} livros`;
  }

  protected retry(): void {
    this.genres.reload();
    this.entries.reload();
  }

  protected changePage(page: number): void {
    void this.router.navigate([], {
      queryParams: { page: page === 0 ? null : page },
      queryParamsHandling: 'merge',
    });
  }
}
