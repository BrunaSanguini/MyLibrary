import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FieldTree, form, FormField, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { BookDetailResponse, BooksApi } from '@core/api/books-api';
import { CatalogApi, NamedEntry } from '@core/api/catalog-api';
import {
  ImportApi,
  ImportCandidateResponse,
  ImportPreviewResponse,
  isOpenLibraryOutage,
} from '@core/api/import-api';
import { toId, toSearchTerm } from '@core/api/query-params';
import {
  BOOK_STATUS_LABELS,
  BookReadingStatus,
  bookStatusOf,
  ReadingApi,
  ReadingResponse,
} from '@core/api/reading-api';
import { TODAY } from '@core/time/today';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { toRoman } from '@shared/format/roman';
import { Breadcrumbs } from '@shared/ui/breadcrumbs/breadcrumbs';
import { Button } from '@shared/ui/button/button';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { compactIsbn, isValidIsbn10, isValidIsbn13 } from '@shared/validation/isbn';
import { firstValueFrom, forkJoin, of } from 'rxjs';

import { EntityPicker, PickedEntry } from '../entity-picker/entity-picker';
import { ImageField } from '../image-field/image-field';
import {
  bookFormOf,
  bookFormSchema,
  BookFormModel,
  bookRequestOf,
  emptyBookForm,
  readingOf,
  SERVER_FIELDS,
  withEdition,
} from './book-form';

const NOT_FOUND = 'openlibrary.not-found';

/** Where the search in the Open Library stands. */
type Lookup =
  | { readonly state: 'idle' }
  | { readonly state: 'searching' }
  | { readonly state: 'results'; readonly results: readonly ImportCandidateResponse[] }
  | { readonly state: 'empty'; readonly term: string }
  | { readonly state: 'offline' };

/** What was saved, for the result screen. */
interface Saved {
  readonly id: number;
  readonly title: string;
  readonly authors: string;
  readonly wishlist: boolean;
}

const STATUSES: readonly BookReadingStatus[] = ['WANT_TO_READ', 'READING', 'READ', 'ABANDONED'];
const STATUS_PILLS: Readonly<Record<BookReadingStatus, string>> = {
  WANT_TO_READ: 'Quero ler',
  READING: 'Lendo agora',
  READ: 'Lido',
  ABANDONED: 'Abandonado',
};

/**
 * Cadastro: one form to add a book and to edit one (spec, screen 11).
 *
 * <p>A new book can start from a search in the Open Library, which fills the data of section I
 * and the cover; nothing is saved until "Salvar livro", and the form works the same with no
 * network. Only title and authors are required. Saving a book that came from the Open Library
 * imports that edition (so the collection knows it and keeps its cover) and then applies what the
 * reader changed. Cover, then the reading of section III, are sent after the book exists; if one
 * of them fails, the form stays on the saved book, so trying again never creates a second one.
 */
@Component({
  selector: 'ml-book-form-page',
  imports: [
    Breadcrumbs,
    Button,
    ConfirmDialog,
    EntityPicker,
    ErrorState,
    FormField,
    ImageField,
    Icon,
    RouterLink,
    Skeleton,
  ],
  templateUrl: './book-form-page.html',
  styleUrls: ['../book-fields.css', './book-form-page.css'],
})
export default class BookFormPage implements HasUnsavedChanges {
  /** Route parameter of `/livro/:id/editar`; absent on `/estante/novo`. */
  readonly id = input(undefined, { transform: toId });
  /** A search to start from, as `/estante/importar?q=…` used to open. */
  readonly q = input(undefined, { transform: toSearchTerm });

  private readonly router = inject(Router);
  private readonly booksApi = inject(BooksApi);
  private readonly catalogApi = inject(CatalogApi);
  private readonly importApi = inject(ImportApi);
  private readonly readingApi = inject(ReadingApi);
  private readonly today = inject(TODAY);
  private readonly discardDialog = viewChild(ConfirmDialog);

  protected readonly statuses = STATUSES;
  protected readonly statusPills = STATUS_PILLS;

  /** Set when a new book was saved but its cover or reading was not: the next save updates it. */
  private readonly createdId = signal<number | undefined>(undefined);
  protected readonly editing = computed(() => this.id() !== undefined);

  protected readonly book = httpResource<BookDetailResponse>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.booksApi.detailRequest(id);
  });

  /** The readings of the book being edited, which say its status. */
  protected readonly readings = httpResource<ReadingResponse[]>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.readingApi.readingsRequest(id);
  });

  protected readonly currentStatus = computed(() => {
    const readings = this.readings.value();
    return readings ? BOOK_STATUS_LABELS[bookStatusOf(readings)] : undefined;
  });

  protected readonly model = signal(emptyBookForm());
  protected readonly bookForm = form(this.model, bookFormSchema(this.today));

  protected readonly topError = signal<string | undefined>(undefined);
  protected readonly coverFile = signal<File | undefined>(undefined);
  protected readonly removeCover = signal(false);
  /** Remounts the cover field, which keeps the chosen file inside it, for the next book. */
  protected readonly coverKey = signal(0);

  /** The search in the Open Library. */
  protected readonly searchTerm = signal('');
  protected readonly lookup = signal<Lookup>({ state: 'idle' });
  /** The edition whose data the form is using, with its cover. */
  protected readonly edition = signal<ImportPreviewResponse | undefined>(undefined);
  protected readonly using = signal<string | undefined>(undefined);

  /** After "Salvar livro": the result screen. */
  protected readonly saved = signal<Saved | undefined>(undefined);
  /** After "Salvar e cadastrar outro": the line that says the last one was saved. */
  protected readonly savedAnother = signal<string | undefined>(undefined);
  protected readonly discarded = signal(false);
  /** Set once a save was tried, so the summary of the problems shows. */
  protected readonly tried = signal(false);

  /** Pickers and files change the model from code, which the form does not count as dirty. */
  private readonly changedOutsideFields = signal(false);
  private filled = false;

  protected readonly authorIds = computed(() => this.model().authors.map((author) => author.id));
  protected readonly topGenres = computed(() =>
    this.model().genres.filter((genre) => genre.parentId === null),
  );
  protected readonly subgenres = computed(() =>
    this.model().genres.filter((genre) => genre.parentId !== null),
  );
  protected readonly subgenreIds = computed(() => this.subgenres().map((genre) => genre.id));

  /** The cover on the left: the file chosen, the one from the Open Library or the saved one. */
  protected readonly coverUrl = computed(() =>
    this.editing() ? (this.book.value()?.coverUrl ?? undefined) : this.edition()?.coverUrl,
  );
  protected readonly authorNames = computed(() =>
    this.model()
      .authors.map((author) => author.name)
      .join(', '),
  );

  /** `Livro III da série`, beside the position, once there is one. */
  protected readonly positionHint = computed(() => {
    const { seriesId, seriesPosition } = this.model();
    if (seriesId === null) {
      return 'Escolha uma série antes';
    }
    if (seriesPosition === null || seriesPosition <= 0) {
      return 'Opcional';
    }
    const number = Number.isInteger(seriesPosition)
      ? toRoman(seriesPosition)
      : seriesPosition.toLocaleString('pt-BR');
    return `Livro ${number} da série`;
  });

  /** `Falta 1 ajuste para salvar`, once a save was tried with problems. */
  protected readonly problems = computed(() => {
    if (!this.tried()) {
      return undefined;
    }
    const count = new Set(
      this.bookForm()
        .errorSummary()
        .map((error) => error.fieldTree),
    ).size;
    if (count === 0) {
      return undefined;
    }
    return count === 1 ? 'Falta 1 ajuste para salvar' : `Faltam ${count} ajustes para salvar`;
  });

  protected readonly loadError = computed(() => {
    const error: unknown = this.book.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected readonly crumbs = computed(() =>
    this.editing()
      ? [
          { label: 'Home', link: '/' },
          { label: 'Minha Estante', link: '/estante' },
          { label: this.book.value()?.title ?? 'Livro', link: `/livro/${this.id()}` },
          { label: 'Editar' },
        ]
      : [
          { label: 'Home', link: '/' },
          { label: 'Minha Estante', link: '/estante' },
          { label: 'Adicionar livro' },
        ],
  );

  constructor() {
    // Fills the form once with the book being edited; later reloads must not undo typed changes.
    effect(() => {
      if (this.book.hasValue() && !this.filled) {
        this.filled = true;
        this.model.set(bookFormOf(this.book.value()));
      }
    });
    // A search handed in the address only fills the field: the network is used on a click.
    effect(() => this.searchTerm.set(this.q() ?? ''));
  }

  hasUnsavedChanges(): boolean {
    return (
      this.saved() === undefined &&
      !this.discarded() &&
      (this.bookForm().dirty() || this.changedOutsideFields())
    );
  }

  /** First message of a field, once the user has been there or tried to save. */
  protected errorOf(field: FieldTree<unknown>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  protected typeSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  /** Only on a click or Enter: the network is never used by itself. */
  protected async search(event?: Event): Promise<void> {
    event?.preventDefault();
    const term = this.searchTerm().trim();
    if (term === '') {
      return;
    }
    this.lookup.set({ state: 'searching' });
    try {
      const results = await this.searchFor(term);
      this.lookup.set(
        results.length > 0 ? { state: 'results', results } : { state: 'empty', term },
      );
    } catch (error) {
      const apiError = ApiError.from(error);
      this.lookup.set(
        apiError.code === NOT_FOUND ? { state: 'empty', term } : { state: 'offline' },
      );
    }
  }

  /** A valid ISBN names one edition; anything else is a search by title or author. */
  private async searchFor(term: string): Promise<ImportCandidateResponse[]> {
    if (isValidIsbn13(term) || isValidIsbn10(term)) {
      const preview = await firstValueFrom(this.importApi.preview({ isbn: compactIsbn(term) }));
      return [preview];
    }
    return firstValueFrom(this.importApi.search(term));
  }

  /**
   * Fills section I and the cover with the edition. Authors and publisher are found by name, or
   * created; the fields stay editable and nothing is saved yet.
   */
  protected async use(candidate: ImportCandidateResponse): Promise<void> {
    this.using.set(candidate.editionKey);
    this.topError.set(undefined);
    try {
      const edition = await firstValueFrom(
        this.importApi.preview({ editionKey: candidate.editionKey }),
      );
      const [authors, publishers] = await firstValueFrom(
        forkJoin([
          edition.authors.length > 0
            ? forkJoin(edition.authors.map((name) => this.catalogApi.findOrCreate('authors', name)))
            : of([] as NamedEntry[]),
          edition.publishers[0]
            ? this.catalogApi.findOrCreate('publishers', edition.publishers[0]).pipe()
            : of(undefined),
        ]),
      );
      this.change(() => {
        this.model.update((model) => withEdition(model, edition, authors, publishers));
        this.edition.set(edition);
        this.coverFile.set(undefined);
        this.removeCover.set(false);
        this.coverKey.update((key) => key + 1);
      });
      this.lookup.set({ state: 'idle' });
    } catch (error) {
      const apiError = ApiError.from(error);
      if (isOpenLibraryOutage(apiError.code)) {
        this.lookup.set({ state: 'offline' });
      } else {
        this.topError.set(apiError.detail);
      }
    } finally {
      this.using.set(undefined);
    }
  }

  protected addAuthor(author: NamedEntry): void {
    this.change(() => this.bookForm.authors().value.update((authors) => [...authors, author]));
    this.bookForm.authors().markAsTouched();
  }

  protected removeAuthor(id: number): void {
    this.change(() =>
      this.bookForm.authors().value.update((authors) => authors.filter((a) => a.id !== id)),
    );
    this.bookForm.authors().markAsTouched();
  }

  /** One publisher: picking another replaces it. */
  protected setPublisher(publisher: NamedEntry | undefined): void {
    this.change(() => this.bookForm.publishers().value.set(publisher ? [publisher] : []));
  }

  protected removePublisher(id: number): void {
    this.change(() =>
      this.bookForm
        .publishers()
        .value.update((publishers) => publishers.filter((p) => p.id !== id)),
    );
  }

  /** One genre: picking another replaces it, and the subgenres stay. */
  protected setGenre(genre: PickedEntry | undefined): void {
    this.change(() =>
      this.bookForm
        .genres()
        .value.update((genres) => [
          ...(genre ? [{ id: genre.id, name: genre.name, parentId: null }] : []),
          ...genres.filter((entry) => entry.parentId !== null),
        ]),
    );
  }

  protected removeGenre(id: number): void {
    this.change(() =>
      this.bookForm.genres().value.update((genres) => genres.filter((genre) => genre.id !== id)),
    );
  }

  protected addSubgenre(subgenre: PickedEntry): void {
    this.change(() =>
      this.bookForm
        .genres()
        .value.update((genres) => [
          ...genres,
          { id: subgenre.id, name: subgenre.name, parentId: subgenre.parentId ?? null },
        ]),
    );
  }

  /** Leaving a series also clears the position, which means nothing without it. */
  protected setSeries(series: NamedEntry | undefined): void {
    this.change(() => {
      this.bookForm.seriesId().value.set(series?.id ?? null);
      this.bookForm.seriesName().value.set(series?.name ?? '');
      if (!series) {
        this.bookForm.seriesPosition().value.set(null);
      }
    });
  }

  /** Tenho este livro or Ainda não tenho: one turns the other off. */
  protected setOwnership(ownership: 'OWNED' | 'WISHLIST'): void {
    this.change(() => this.bookForm.ownership().value.set(ownership));
  }

  /** Arrows move between the two cards, as in any group of radios. */
  protected moveOwnership(event: KeyboardEvent): void {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const next = this.model().ownership === 'WISHLIST' ? 'OWNED' : 'WISHLIST';
      this.setOwnership(next);
      const group = (event.currentTarget as HTMLElement).closest('[role="radiogroup"]');
      group?.querySelector<HTMLElement>(`[data-value="${next}"]`)?.focus();
    }
  }

  protected setStatus(status: BookReadingStatus): void {
    this.change(() => this.bookForm.status().value.set(status));
  }

  protected setCover(file: File | undefined): void {
    this.change(() => this.coverFile.set(file));
  }

  protected setCoverRemoval(remove: boolean): void {
    this.change(() => this.removeCover.set(remove));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await this.store(false);
  }

  protected async saveAndAddAnother(): Promise<void> {
    await this.store(true);
  }

  /** Nothing changed: back to where the reader came from. Otherwise, ask first. */
  protected cancel(): void {
    if (this.hasUnsavedChanges()) {
      this.discardDialog()?.open();
      return;
    }
    void this.router.navigate(this.editing() ? ['/livro', this.id()] : ['/estante']);
  }

  protected discard(): void {
    this.discardDialog()?.close();
    this.discarded.set(true);
    if (this.editing()) {
      void this.router.navigate(['/livro', this.id()]);
    }
  }

  /** "Cadastrar outro livro" and "Recomeçar": the form empty again, as if just opened. */
  protected startOver(): void {
    this.model.set(emptyBookForm());
    this.bookForm().reset();
    this.edition.set(undefined);
    this.coverFile.set(undefined);
    this.removeCover.set(false);
    this.coverKey.update((key) => key + 1);
    this.createdId.set(undefined);
    this.changedOutsideFields.set(false);
    this.tried.set(false);
    this.topError.set(undefined);
    this.lookup.set({ state: 'idle' });
    this.searchTerm.set('');
    this.saved.set(undefined);
    this.discarded.set(false);
  }

  private async store(another: boolean): Promise<void> {
    this.topError.set(undefined);
    this.savedAnother.set(undefined);
    this.tried.set(true);
    await submit(this.bookForm, async () => {
      try {
        const model = this.model();
        const saved = await this.saveBook(model);
        this.createdId.set(this.editing() ? undefined : saved.id);
        await this.saveCover(saved.id);
        if (!this.editing()) {
          await this.saveReading(saved.id, model);
        }
        const result: Saved = {
          id: saved.id,
          title: saved.title,
          authors: saved.authors.map((author) => author.name).join(', '),
          wishlist: saved.ownership === 'WISHLIST',
        };
        if (another) {
          this.startOver();
          this.savedAnother.set(`“${result.title}” foi salvo. Pode cadastrar o próximo.`);
        } else {
          this.saved.set(result);
          window.scrollTo?.({ top: 0 });
        }
        return undefined;
      } catch (error) {
        return this.serverErrors(ApiError.from(error));
      }
    });
  }

  /**
   * The book itself. An edition of the Open Library is imported first (the collection then knows
   * it and keeps its cover) and the form, which the reader may have changed, goes over it.
   */
  private async saveBook(model: BookFormModel): Promise<BookDetailResponse> {
    const request = bookRequestOf(model);
    const id = this.id() ?? this.createdId();
    if (id !== undefined) {
      return firstValueFrom(this.booksApi.update(id, request));
    }
    const edition = this.edition();
    if (!edition) {
      return firstValueFrom(this.booksApi.create(request));
    }
    const imported = await firstValueFrom(
      this.importApi.importEdition({
        editionKey: edition.editionKey,
        ownership: request.ownership,
        genreIds: request.genreIds,
        seriesId: request.seriesId,
        seriesPosition: request.seriesPosition,
      }),
    );
    this.createdId.set(imported.id);
    return firstValueFrom(this.booksApi.update(imported.id, request));
  }

  private async saveCover(id: number): Promise<void> {
    const file = this.coverFile();
    if (file) {
      await firstValueFrom(this.booksApi.uploadImage(id, 'cover', file));
      this.coverFile.set(undefined);
    } else if (this.removeCover()) {
      await firstValueFrom(this.booksApi.removeImage(id, 'cover'));
      this.removeCover.set(false);
    }
  }

  /**
   * The reading of section III, for a book the reader has. An abandoned book with the page it
   * stopped at is read up to that page, then abandoned, so the history knows how far it went.
   */
  private async saveReading(id: number, model: BookFormModel): Promise<void> {
    const request = model.ownership === 'WISHLIST' ? undefined : readingOf(model, this.today());
    if (!request) {
      return;
    }
    if (request.status === 'ABANDONED' && model.stoppedAt !== null) {
      const reading = await firstValueFrom(
        this.readingApi.createReading(id, {
          status: 'IN_PROGRESS',
          startDate: request.startDate ?? this.today(),
        }),
      );
      await firstValueFrom(
        this.readingApi.addSession(reading.id, {
          date: this.today(),
          currentPage: model.stoppedAt,
        }),
      );
      await firstValueFrom(this.readingApi.abandonReading(reading.id, this.today()));
      return;
    }
    await firstValueFrom(this.readingApi.createReading(id, request));
  }

  /** Field errors go to their fields; whatever has no field shows above the actions. */
  private serverErrors(error: ApiError) {
    const onFields = error.fieldErrors.flatMap(({ field, message }) => {
      const key = SERVER_FIELDS[field];
      return key
        ? [{ fieldTree: this.bookForm[key] as FieldTree<unknown>, kind: 'server', message }]
        : [];
    });
    if (onFields.length < error.fieldErrors.length || onFields.length === 0) {
      this.topError.set(
        this.createdId() === undefined
          ? error.detail
          : `O livro foi salvo, mas faltou uma parte: ${error.detail} Tente salvar de novo.`,
      );
    }
    return onFields.length > 0 ? onFields : undefined;
  }

  private change(apply: () => void): void {
    apply();
    this.changedOutsideFields.set(true);
  }
}
