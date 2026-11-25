import { httpResource } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { CatalogApi, NamedEntry } from '@core/api/catalog-api';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { toId, toOneOf, toPageIndex, toSearchTerm } from '@core/api/query-params';
import { ShelfApi, ShelfPage as ShelfPageResponse, ShelfSummary } from '@core/api/shelf-api';
import { Breadcrumbs } from '@shared/ui/breadcrumbs/breadcrumbs';
import { Button } from '@shared/ui/button/button';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';

import { ShelfCard } from '../shelf-card/shelf-card';
import {
  filterOf,
  ORDER_INFO,
  SHELF_ORDERS,
  SHELF_TABS,
  ShelfOrder,
  ShelfTab,
  TAB_INFO,
  toOn,
  toTab,
} from '../shelf-tabs';

/** Two rows of six. */
const PAGE_SIZE = 12;
/** How long the typing pauses before the search reaches the address bar and the API. */
const TYPING_PAUSE = 250;

const toOrder = toOneOf(SHELF_ORDERS);

/** The four selects, by the name each one has in the address bar. */
type SelectName = 'genero' | 'autor' | 'serie' | 'editora';

/**
 * Minha Estante: every book of the collection, with a search, tabs by status, the Favoritos and
 * Releituras chips, four selects, the order and the grid or the list.
 *
 * <p>Everything but the view lives in the address bar and arrives as an input, so reloading, the
 * back button and a bookmark keep the shelf as it was. The view (grid or list) only lasts while
 * the page is open, as the spec asks. The wishlist stays out of every tab but its own: those are
 * books the reader does not have yet.
 */
@Component({
  selector: 'ml-shelf-page',
  imports: [Breadcrumbs, Button, ErrorState, Icon, RouterLink, ShelfCard, Skeleton],
  templateUrl: './shelf-page.html',
  styleUrl: './shelf-page.css',
})
export default class ShelfPage {
  readonly q = input(undefined, { transform: toSearchTerm });
  readonly status = input<ShelfTab, unknown>('todos', { transform: toTab });
  readonly favoritos = input(false, { transform: toOn });
  readonly releituras = input(false, { transform: toOn });
  readonly genero = input(undefined, { transform: toId });
  readonly autor = input(undefined, { transform: toId });
  readonly serie = input(undefined, { transform: toId });
  readonly editora = input(undefined, { transform: toId });
  readonly ordem = input(undefined, { transform: toOrder });
  readonly page = input(0, { transform: toPageIndex });

  private readonly router = inject(Router);
  private readonly shelfApi = inject(ShelfApi);
  private readonly catalogApi = inject(CatalogApi);
  private readonly genresApi = inject(GenresApi);
  private readonly results = viewChild<ElementRef<HTMLElement>>('results');

  protected readonly tabs = SHELF_TABS;
  protected readonly tabInfo = TAB_INFO;
  protected readonly orders = SHELF_ORDERS;
  protected readonly orderInfo = ORDER_INFO;

  /** Grid or list: only while the page is open. */
  protected readonly view = signal<'grade' | 'lista'>('grade');

  /** What is in the search field, ahead of the address bar while the reader types. */
  protected readonly term = signal('');
  private typing: ReturnType<typeof setTimeout> | undefined;

  protected readonly filter = computed(() =>
    filterOf(this.status(), {
      q: this.q(),
      favorite: this.favoritos() || undefined,
      reread: this.releituras() || undefined,
      genreId: this.genero(),
      authorId: this.autor(),
      seriesId: this.serie(),
      publisherId: this.editora(),
      sort: ORDER_INFO[this.ordem() ?? 'recentes'].sort,
      page: this.page(),
      size: PAGE_SIZE,
    }),
  );

  protected readonly books = httpResource<ShelfPageResponse>(() =>
    this.shelfApi.booksRequest(this.filter()),
  );

  protected readonly summary = httpResource<ShelfSummary>(() => this.shelfApi.summaryRequest());

  /** The options of the selects: what is registered in Configurações. */
  protected readonly genres = httpResource<GenreTreeResponse[]>(() => this.genresApi.treeRequest());
  protected readonly authors = rxResource({ stream: () => this.catalogApi.all('authors') });
  protected readonly seriesList = rxResource({ stream: () => this.catalogApi.all('series') });
  protected readonly publishers = rxResource({ stream: () => this.catalogApi.all('publishers') });

  protected readonly selects = computed<
    readonly {
      name: SelectName;
      label: string;
      all: string;
      value: number | undefined;
      options: readonly NamedEntry[];
    }[]
  >(() => [
    {
      name: 'genero',
      label: 'Gênero',
      all: 'Todos os gêneros',
      value: this.genero(),
      options: this.genres.value() ?? [],
    },
    {
      name: 'autor',
      label: 'Autor',
      all: 'Todos os autores',
      value: this.autor(),
      options: this.authors.value() ?? [],
    },
    {
      name: 'serie',
      label: 'Série',
      all: 'Todas as séries',
      value: this.serie(),
      options: this.seriesList.value() ?? [],
    },
    {
      name: 'editora',
      label: 'Editora',
      all: 'Todas as editoras',
      value: this.editora(),
      options: this.publishers.value() ?? [],
    },
  ]);

  /** `26 livros que moram neste computador · 15 lidos`, or the size of the wishlist. */
  protected readonly lead = computed(() => {
    const summary = this.summary.value();
    if (!summary) {
      return undefined;
    }
    if (this.status() === 'wishlist') {
      return summary.wishlist === 1
        ? '1 livro que você quer ter'
        : `${summary.wishlist} livros que você quer ter`;
    }
    const books = summary.shelf === 1 ? '1 livro que mora' : `${summary.shelf} livros que moram`;
    const read = summary.read === 1 ? '1 lido' : `${summary.read} lidos`;
    return `${books} neste computador · ${read}`;
  });

  /** `Mostrando 13–24 de 26 livros`, or `0 livros`. */
  protected readonly showing = computed(() => {
    const page = this.books.value();
    if (!page) {
      return undefined;
    }
    const total = page.totalElements;
    if (total === 0) {
      return '0 livros';
    }
    const first = page.page * page.size + 1;
    const last = Math.min(total, first + page.content.length - 1);
    return `Mostrando ${first}–${last} de ${total} ${total === 1 ? 'livro' : 'livros'}`;
  });

  /** The page buttons: every page, since a personal shelf has a handful of them. */
  protected readonly pages = computed(() =>
    Array.from({ length: this.books.value()?.totalPages ?? 0 }, (_, index) => index),
  );

  /** Something narrows the shelf, so "Limpar filtros" has something to clear. */
  protected readonly filtered = computed(
    () =>
      this.status() !== 'todos' ||
      this.favoritos() ||
      this.releituras() ||
      this.q() !== undefined ||
      this.genero() !== undefined ||
      this.autor() !== undefined ||
      this.serie() !== undefined ||
      this.editora() !== undefined,
  );

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.books.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected readonly crumbs = [{ label: 'Home', link: '/' }, { label: 'Minha Estante' }];
  protected readonly skeletons = Array.from({ length: PAGE_SIZE }, (_, index) => index);

  constructor() {
    // The field shows what the address bar searched, also after a reload or the back button.
    effect(() => this.term.set(this.q() ?? ''));
    inject(DestroyRef).onDestroy(() => clearTimeout(this.typing));
  }

  protected countOf(tab: ShelfTab): number | undefined {
    const summary = this.summary.value();
    return summary ? TAB_INFO[tab].count(summary) : undefined;
  }

  protected type(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
    clearTimeout(this.typing);
    this.typing = setTimeout(() => this.search(), TYPING_PAUSE);
  }

  protected clearSearch(field: HTMLInputElement): void {
    this.term.set('');
    clearTimeout(this.typing);
    this.changeFilter({ q: null });
    field.focus();
  }

  protected selectTab(tab: ShelfTab): void {
    this.changeFilter({ status: tab === 'todos' ? null : tab });
  }

  /** Left and right move between the tabs, and Home and End go to the first and the last. */
  protected moveTab(event: KeyboardEvent): void {
    const last = SHELF_TABS.length - 1;
    const current = SHELF_TABS.indexOf(this.status());
    const target =
      event.key === 'ArrowRight'
        ? (current + 1) % SHELF_TABS.length
        : event.key === 'ArrowLeft'
          ? (current + last) % SHELF_TABS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined;
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    this.selectTab(SHELF_TABS[target]!);
    const tablist = (event.currentTarget as HTMLElement).closest('[role="tablist"]');
    tablist?.querySelectorAll<HTMLElement>('[role="tab"]')[target]?.focus();
  }

  protected toggleFavorites(): void {
    this.changeFilter({ favoritos: this.favoritos() ? null : '1' });
  }

  protected toggleRereads(): void {
    this.changeFilter({ releituras: this.releituras() ? null : '1' });
  }

  protected choose(name: SelectName, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.changeFilter({ [name]: value === '' ? null : value });
  }

  protected changeOrder(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ShelfOrder;
    // The default order needs no parameter, which keeps the address bar clean.
    this.changeFilter({ ordem: value === 'recentes' ? null : value });
  }

  /** Back to the defaults: tab Todos, no chips, no search, no selects. The order stays. */
  protected clearFilters(): void {
    clearTimeout(this.typing);
    this.term.set('');
    void this.router.navigate([], { queryParams: { ordem: this.ordem() ?? null } });
  }

  /** Changing page goes back to the top of the grid. */
  protected async changePage(page: number): Promise<void> {
    await this.navigate({ page: page === 0 ? null : page });
    this.results()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private search(): void {
    const term = this.term().trim();
    if (term !== (this.q() ?? '')) {
      this.changeFilter({ q: term === '' ? null : term });
    }
  }

  /** Any change of filter goes back to page 1: page 3 of the old filter means nothing. */
  private changeFilter(params: Record<string, string | null>): void {
    void this.navigate({ ...params, page: null });
  }

  private navigate(queryParams: Record<string, string | number | null>): Promise<boolean> {
    return this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
