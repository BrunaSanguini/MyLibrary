import { httpResource } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import {
  AuthorResponse,
  CatalogApi,
  PublisherResponse,
  SeriesResponse,
} from '@core/api/catalog-api';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { toOneOf } from '@core/api/query-params';
import { BookCardResponse, ShelfApi, ShelfSummary } from '@core/api/shelf-api';
import { toRoman } from '@shared/format/roman';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';

import {
  authorRows,
  CATALOG_TABS,
  CatalogTab,
  GenreRow,
  genreRows,
  MASCOT_GOAL,
  mascotText,
  normalize,
  publisherRows,
  seriesRows,
} from '../catalog-model';

const TAB_LABELS: Readonly<Record<CatalogTab, string>> = {
  generos: 'Gêneros',
  autores: 'Autores',
  series: 'Séries',
  editoras: 'Editoras',
};

const PLACEHOLDERS: Readonly<Record<CatalogTab, string>> = {
  generos: 'Buscar gênero ou subgênero',
  autores: 'Buscar autor',
  series: 'Buscar série ou autor',
  editoras: 'Buscar editora',
};

const STATUS_LABELS: Readonly<Record<BookCardResponse['status'], string>> = {
  READ: 'Lido',
  READING: 'Lendo agora',
  WANT_TO_READ: 'Quero ler',
  ABANDONED: 'Abandonado',
};

/** How long the typing pauses before the search filters. */
const TYPING_PAUSE = 150;

const toTab = toOneOf(CATALOG_TABS);

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Catálogos (spec, screen 9): the shelf by genre, author, series and publisher, one tab each,
 * with the totals on top and a search that changes with the tab.
 *
 * <p>Everything is counted here from the books of the shelf (the wishlist stays out) and the
 * lists of Configurações, so the four tabs share one load. The tab is in the address
 * (`/catalogos/autores`), so the back button and a bookmark keep it.
 */
@Component({
  selector: 'ml-catalog-page',
  imports: [BookCover, ErrorState, Icon, RouterLink, Skeleton],
  templateUrl: './catalog-page.html',
  styleUrls: ['./catalog-page.css', './catalog-genres.css', './catalog-tabs.css'],
})
export default class CatalogPage {
  readonly aba = input<CatalogTab, unknown>('generos', {
    transform: (value: unknown) => toTab(value) ?? 'generos',
  });

  private readonly router = inject(Router);
  private readonly shelfApi = inject(ShelfApi);
  private readonly catalogApi = inject(CatalogApi);
  private readonly genresApi = inject(GenresApi);

  protected readonly tabs = CATALOG_TABS;
  protected readonly tabLabels = TAB_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly mascotGoal = MASCOT_GOAL;

  protected readonly cards = rxResource({
    stream: () => this.shelfApi.allBooks({ wishlist: false }),
  });
  protected readonly tree = httpResource<GenreTreeResponse[]>(() => this.genresApi.treeRequest());
  protected readonly authors = rxResource({ stream: () => this.catalogApi.all('authors') });
  protected readonly seriesList = rxResource({ stream: () => this.catalogApi.all('series') });
  protected readonly publishers = rxResource({ stream: () => this.catalogApi.all('publishers') });
  protected readonly summary = httpResource<ShelfSummary>(() => this.shelfApi.summaryRequest());

  /** What is typed, and what the lists filter by after a short pause. */
  protected readonly term = signal('');
  private readonly search = signal('');
  private typing: ReturnType<typeof setTimeout> | undefined;

  /** The genre whose books the panel shows, and the subgenre that narrows it. */
  protected readonly genreId = signal<number | undefined>(undefined);
  protected readonly subgenreId = signal<number | undefined>(undefined);

  protected readonly loading = computed(
    () =>
      !this.cards.hasValue() ||
      !this.tree.hasValue() ||
      !this.authors.hasValue() ||
      !this.seriesList.hasValue() ||
      !this.publishers.hasValue(),
  );

  protected readonly errorMessage = computed(() => {
    const error: unknown =
      this.cards.error() ??
      this.tree.error() ??
      this.authors.error() ??
      this.seriesList.error() ??
      this.publishers.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  private readonly allCards = computed(() => this.cards.value() ?? []);

  private readonly genres = computed(() => genreRows(this.tree.value() ?? [], this.allCards()));

  private readonly topGenreNames = computed(
    () => new Set((this.tree.value() ?? []).map((genre) => genre.name)),
  );

  /** The four totals in roman numerals: they do not change with the tab or the search. */
  protected readonly totals = computed(() => {
    const summary = this.summary.value();
    const books = summary ? summary.shelf + summary.wishlist : this.allCards().length;
    return [
      { label: 'Livros', value: toRoman(books) },
      {
        label: 'Gêneros',
        value: toRoman((this.tree.value() ?? []).filter((genre) => genre.bookCount > 0).length),
      },
      {
        label: 'Autores',
        value: toRoman(
          (this.authors.value() ?? []).filter((author: AuthorResponse) => author.bookCount > 0)
            .length,
        ),
      },
      {
        label: 'Séries',
        value: toRoman(
          (this.seriesList.value() ?? []).filter((one: SeriesResponse) => one.bookCount > 0).length,
        ),
      },
    ];
  });

  protected readonly counts = computed<Readonly<Record<CatalogTab, number>>>(() => ({
    generos: (this.tree.value() ?? []).length,
    autores: (this.authors.value() ?? []).length,
    series: (this.seriesList.value() ?? []).length,
    editoras: (this.publishers.value() ?? []).length,
  }));

  protected readonly placeholder = computed(() => PLACEHOLDERS[this.aba()]);

  private readonly matches = (text: string) => normalize(text).includes(normalize(this.search()));

  protected readonly genreList = computed(() =>
    this.genres().filter(
      (genre) =>
        this.matches(genre.name) || genre.subgenres.some((subgenre) => this.matches(subgenre.name)),
    ),
  );

  protected readonly authorList = computed(() =>
    authorRows(
      (this.authors.value() ?? []) as AuthorResponse[],
      this.allCards(),
      this.topGenreNames(),
    ).filter((author) => this.matches(author.name)),
  );

  protected readonly seriesRowsList = computed(() =>
    seriesRows((this.seriesList.value() ?? []) as SeriesResponse[], this.allCards()).filter(
      (one) => this.matches(one.name) || this.matches(one.author),
    ),
  );

  protected readonly publisherList = computed(() => {
    const summary = this.summary.value();
    const total = summary ? summary.shelf + summary.wishlist : this.allCards().length;
    return publisherRows((this.publishers.value() ?? []) as PublisherResponse[], total).filter(
      (publisher) => this.matches(publisher.name),
    );
  });

  /** Nothing matches in the tab shown. */
  protected readonly empty = computed(() => {
    switch (this.aba()) {
      case 'generos':
        return this.genreList().length === 0;
      case 'autores':
        return this.authorList().length === 0;
      case 'series':
        return this.seriesRowsList().length === 0;
      default:
        return this.publisherList().length === 0;
    }
  });

  /** The genre of the panel: the one picked, or the first. */
  protected readonly selectedGenre = computed<GenreRow | undefined>(() => {
    const genres = this.genres();
    return genres.find((genre) => genre.id === this.genreId()) ?? genres[0];
  });

  protected readonly selectedSubgenre = computed(() =>
    this.selectedGenre()?.subgenres.find((subgenre) => subgenre.id === this.subgenreId()),
  );

  protected readonly panelBooks = computed(() => {
    const genre = this.selectedGenre();
    const subgenre = this.selectedSubgenre();
    if (!genre) {
      return [];
    }
    return subgenre
      ? genre.books.filter((card) => card.genres.includes(subgenre.name))
      : genre.books;
  });

  /** `10 livros · 6 lidos`. */
  protected readonly panelCount = computed(() => {
    const books = this.panelBooks();
    const read = books.filter((card) => card.status === 'READ').length;
    return `${plural(books.length, 'livro', 'livros')} · ${plural(read, 'lido', 'lidos')}`;
  });

  constructor() {
    // Changing tab clears the search.
    effect(() => {
      this.aba();
      clearTimeout(this.typing);
      this.term.set('');
      this.search.set('');
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.typing));
  }

  protected countText(genre: GenreRow): string {
    return `${plural(genre.books.length, 'livro', 'livros')} · ${plural(genre.read, 'lido', 'lidos')}`;
  }

  protected mascot(genre: GenreRow): string {
    return mascotText(genre.read, toRoman);
  }

  protected mascotFill(genre: GenreRow): number {
    return Math.min(100, genre.read * 10);
  }

  protected roman(index: number): string {
    return toRoman(index + 1);
  }

  protected authorsOf(card: BookCardResponse): string {
    return card.authors.join(', ');
  }

  protected subgenreOf(card: BookCardResponse, genre: GenreRow): string | undefined {
    return genre.subgenres.find((subgenre) => card.genres.includes(subgenre.name))?.name;
  }

  protected pickGenre(id: number): void {
    this.genreId.set(id);
    this.subgenreId.set(undefined);
  }

  /** A chip picks its genre and narrows the panel; the same chip again takes the filter off. */
  protected pickSubgenre(genreId: number, subgenreId: number): void {
    const same = this.genreId() === genreId && this.subgenreId() === subgenreId;
    this.genreId.set(genreId);
    this.subgenreId.set(same ? undefined : subgenreId);
  }

  protected type(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
    clearTimeout(this.typing);
    this.typing = setTimeout(() => this.search.set(this.term()), TYPING_PAUSE);
  }

  protected clear(field: HTMLInputElement): void {
    clearTimeout(this.typing);
    this.term.set('');
    this.search.set('');
    field.focus();
  }

  protected escape(event: Event, field: HTMLInputElement): void {
    if (this.term() !== '') {
      event.preventDefault();
      this.clear(field);
    }
  }

  /** Left and right move between the tabs, which are links to their addresses. */
  protected moveTab(event: KeyboardEvent): void {
    const index = CATALOG_TABS.indexOf(this.aba());
    const last = CATALOG_TABS.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % CATALOG_TABS.length
        : event.key === 'ArrowLeft'
          ? (index + last) % CATALOG_TABS.length
          : undefined;
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    const tab = CATALOG_TABS[target]!;
    void this.router.navigate(['/catalogos', tab]).then(() => {
      const tablist = (event.target as HTMLElement).closest('[role="tablist"]');
      tablist?.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.focus();
    });
  }

  protected retry(): void {
    this.cards.reload();
    this.tree.reload();
    this.authors.reload();
    this.seriesList.reload();
    this.publishers.reload();
  }
}
