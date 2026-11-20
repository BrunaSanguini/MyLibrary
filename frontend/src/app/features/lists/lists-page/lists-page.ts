import { httpResource } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import {
  BookListResponse,
  ListsApi,
  ListsPage as ListsPageResponse,
  ListStatus,
} from '@core/api/lists-api';
import { toOneOf, toPageIndex } from '@core/api/query-params';
import { Button } from '@shared/ui/button/button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Paginator } from '@shared/ui/paginator/paginator';
import { Skeleton } from '@shared/ui/skeleton/skeleton';

import { ListCard } from '../list-card/list-card';
import { ListForm } from '../list-form/list-form';

/** The tabs over the grid, and what each one asks the API for (`todas` asks for nothing). */
export const LIST_FILTERS = [
  { id: 'todas', label: 'Todas', status: undefined },
  { id: 'andamento', label: 'Em andamento', status: 'IN_PROGRESS' },
  { id: 'concluida', label: 'Concluídas', status: 'COMPLETED' },
  { id: 'nao', label: 'Não iniciadas', status: 'NOT_STARTED' },
] as const satisfies readonly { id: string; label: string; status: ListStatus | undefined }[];

export type ListFilterId = (typeof LIST_FILTERS)[number]['id'];

const toListFilter = toOneOf(LIST_FILTERS.map((filter) => filter.id));

/** How long the confirmation of a new list stays under the title. */
const FLASH_MILLISECONDS = 5000;

/**
 * Listas: a button that opens the form of a new list and every list as a card, newest change
 * first, under tabs that narrow them by how far their reading is.
 *
 * <p>The tabs count with the API, one request each, so the numbers are right even when the lists
 * do not fit in one page. The filter and the page live in the URL (`?filtro=andamento&page=1`),
 * so going back from a list finds the cards as they were left. The pinned list and the special
 * ones have their own place on the page and never count in the tabs.
 */
@Component({
  selector: 'ml-lists-page',
  imports: [Button, EmptyState, ErrorState, Icon, ListCard, ListForm, Paginator, Skeleton],
  templateUrl: './lists-page.html',
  styleUrl: './lists-page.css',
})
export default class ListsPage {
  readonly filtro = input<ListFilterId, unknown>('todas', {
    transform: (value) => toListFilter(value) ?? 'todas',
  });
  readonly page = input(0, { transform: toPageIndex });

  private readonly router = inject(Router);
  private readonly listsApi = inject(ListsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly newButton = viewChild<ElementRef<HTMLButtonElement>>('newButton');

  protected readonly filters = LIST_FILTERS;
  protected readonly showForm = signal(false);
  /** The name of the list that was just created, for the confirmation under the title. */
  protected readonly created = signal<string | undefined>(undefined);
  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly cards = httpResource<ListsPageResponse>(() =>
    this.listsApi.cardsRequest({
      status: LIST_FILTERS.find((filter) => filter.id === this.filtro())?.status,
      page: this.page(),
    }),
  );

  /** One count per tab, whatever tab is open. */
  private readonly counts = Object.fromEntries(
    LIST_FILTERS.map((filter) => [
      filter.id,
      httpResource<ListsPageResponse>(() => this.listsApi.countRequest(filter.status)),
    ]),
  ) as Record<ListFilterId, ReturnType<typeof httpResource<ListsPageResponse>>>;

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.cards.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  /** Until the count of all lists arrives the tabs show, so they do not blink in and out. */
  protected readonly hasLists = computed(() => {
    const all = this.counts.todas;
    return !all.hasValue() || all.value().totalElements > 0;
  });

  protected readonly placeholders = [0, 1, 2];

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.flashTimer));
  }

  protected countOf(id: ListFilterId): number | undefined {
    const count = this.counts[id];
    return count.hasValue() ? count.value().totalElements : undefined;
  }

  protected toggleForm(): void {
    this.showForm.update((open) => !open);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.newButton()?.nativeElement.focus();
  }

  /**
   * The new list is the newest change, so it shows at the top of all the lists, whatever tab was
   * open, and the tabs count it.
   */
  protected onCreated(list: BookListResponse): void {
    this.showForm.set(false);
    this.announce(list.name);
    this.reloadCounts();
    if (this.filtro() === 'todas' && this.page() === 0) {
      this.cards.reload();
    } else {
      void this.router.navigate([], { queryParams: {} });
    }
  }

  protected select(filter: ListFilterId): void {
    void this.router.navigate([], { queryParams: { filtro: filter === 'todas' ? null : filter } });
  }

  /** Left and right move between the tabs, and Home and End go to the first and the last. */
  protected moveTab(event: KeyboardEvent): void {
    const last = this.filters.length - 1;
    const current = this.filters.findIndex((filter) => filter.id === this.filtro());
    const target =
      event.key === 'ArrowRight'
        ? (current + 1) % this.filters.length
        : event.key === 'ArrowLeft'
          ? (current + last) % this.filters.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined;
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    this.select(this.filters[target]!.id);
    const tablist = (event.currentTarget as HTMLElement).closest('[role="tablist"]');
    tablist?.querySelectorAll<HTMLElement>('[role="tab"]')[target]?.focus();
  }

  protected changePage(page: number): void {
    void this.router.navigate([], {
      queryParams: {
        filtro: this.filtro() === 'todas' ? null : this.filtro(),
        page: page === 0 ? null : page,
      },
    });
  }

  protected retry(): void {
    this.cards.reload();
    this.reloadCounts();
  }

  private reloadCounts(): void {
    for (const count of Object.values(this.counts)) {
      count.reload();
    }
  }

  private announce(name: string): void {
    clearTimeout(this.flashTimer);
    this.created.set(name);
    this.flashTimer = setTimeout(() => this.created.set(undefined), FLASH_MILLISECONDS);
  }
}
