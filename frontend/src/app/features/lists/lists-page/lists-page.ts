import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import {
  BookListResponse,
  ListsApi,
  ListsPage as ListsPageResponse,
  readCountOf,
} from '@core/api/lists-api';
import { toPageIndex } from '@core/api/query-params';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Paginator } from '@shared/ui/paginator/paginator';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';
import { Skeleton } from '@shared/ui/skeleton/skeleton';

import { ListForm } from '../list-form/list-form';

/**
 * Listas: every list as a card with its covers and how much of it was read, and the form that
 * creates a new one. A list that was just created opens right away, ready to receive books.
 */
@Component({
  selector: 'ml-lists-page',
  imports: [
    BookCover,
    EmptyState,
    ErrorState,
    ListForm,
    Paginator,
    ProgressBar,
    RouterLink,
    Skeleton,
  ],
  templateUrl: './lists-page.html',
  styleUrl: './lists-page.css',
})
export default class ListsPage {
  readonly page = input(0, { transform: toPageIndex });

  private readonly router = inject(Router);
  private readonly listsApi = inject(ListsApi);

  protected readonly lists = httpResource<ListsPageResponse>(() =>
    this.listsApi.listRequest(this.page()),
  );

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.lists.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected readonly placeholders = [0, 1, 2];
  protected readonly readCountOf = readCountOf;

  protected percentOf(list: BookListResponse): number {
    return list.bookCount === 0 ? 0 : (list.readCount * 100) / list.bookCount;
  }

  protected open(list: BookListResponse): void {
    void this.router.navigate(['/listas', list.id]);
  }

  protected changePage(page: number): void {
    void this.router.navigate([], { queryParams: { page: page === 0 ? null : page } });
  }
}
