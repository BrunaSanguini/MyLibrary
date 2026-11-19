import { httpResource } from '@angular/common/http';
import {
  afterRenderEffect,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FieldTree, form, FormField, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { NamedEntry } from '@core/api/catalog-api';
import {
  EditionLookup,
  ImportApi,
  ImportCandidateResponse,
  ImportPreviewResponse,
  isOpenLibraryOutage,
} from '@core/api/import-api';
import { toSearchTerm } from '@core/api/query-params';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Breadcrumbs } from '@shared/ui/breadcrumbs/breadcrumbs';
import { Button } from '@shared/ui/button/button';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { Tag } from '@shared/ui/tag/tag';
import { compactIsbn, isValidIsbn10, isValidIsbn13 } from '@shared/validation/isbn';
import { firstValueFrom } from 'rxjs';

import { EntityPicker } from '../entity-picker/entity-picker';
import { GenreEntry, GenreFields } from '../genre-fields/genre-fields';
import {
  emptyClassification,
  importClassificationSchema,
  importRequestOf,
  importSearchSchema,
} from './import-form';

const EDITION_KEY = /^OL\d{1,20}M$/;
const NOT_FOUND = 'openlibrary.not-found';
const ALREADY_IN_COLLECTION = ['book.edition-duplicated', 'book.isbn-duplicated'];

/** Edition key from the URL, or undefined for anything that is not one. */
function toEditionKey(value: unknown): string | undefined {
  return typeof value === 'string' && EDITION_KEY.test(value) ? value : undefined;
}

/** What went wrong with a search or a preview, and whether registering by hand is the way out. */
interface ImportFailure {
  readonly notFound: boolean;
  readonly outage: boolean;
  readonly message: string;
}

function failureOf(error: unknown): ImportFailure | undefined {
  if (error === undefined) {
    return undefined;
  }
  const apiError = ApiError.from(error);
  return {
    notFound: apiError.code === NOT_FOUND,
    outage: isOpenLibraryOutage(apiError.code),
    message: apiError.detail,
  };
}

/**
 * Imports a book from the Open Library: search, preview, optional classification, confirmation.
 *
 * <p>The search and the chosen edition live in the URL (`q` and `edicao`), so reloading and the
 * back button keep the step the person was on. A text that is a valid ISBN skips the list of
 * results and goes straight to the preview of that edition. Nothing is saved before the
 * confirmation; when the Open Library is out of reach, the page says so and points to the manual
 * form, which never depends on it.
 */
@Component({
  selector: 'ml-book-import-page',
  imports: [
    Breadcrumbs,
    BookCover,
    Button,
    EmptyState,
    EntityPicker,
    GenreFields,
    ErrorState,
    FormField,
    RouterLink,
    Skeleton,
    Tag,
  ],
  templateUrl: './book-import-page.html',
  styleUrls: ['../book-fields.css', './book-import-page.css'],
})
export default class BookImportPage {
  /** What was searched: a title, an author or an ISBN. */
  readonly q = input(undefined, { transform: toSearchTerm });
  /** The edition being previewed, picked from the results. */
  readonly edicao = input(undefined, { transform: toEditionKey });

  private readonly router = inject(Router);
  private readonly importApi = inject(ImportApi);

  private readonly previewTitle = viewChild<ElementRef<HTMLElement>>('previewTitle');
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchField');

  protected readonly searchModel = signal({ query: '' });
  protected readonly searchForm = form(this.searchModel, importSearchSchema);

  protected readonly classificationModel = signal(emptyClassification());
  protected readonly classificationForm = form(
    this.classificationModel,
    importClassificationSchema,
  );

  protected readonly importError = signal<string | undefined>(undefined);

  /** The searched text, when it is a valid ISBN-13 or ISBN-10. */
  private readonly isbn = computed(() => {
    const term = this.q();
    return term !== undefined && (isValidIsbn13(term) || isValidIsbn10(term))
      ? compactIsbn(term)
      : undefined;
  });

  /** The edition on screen: the one picked from the results or the one the ISBN names. */
  protected readonly lookup = computed<EditionLookup | undefined>(() => {
    const editionKey = this.edicao();
    if (editionKey !== undefined) {
      return { editionKey };
    }
    const isbn = this.isbn();
    return isbn === undefined ? undefined : { isbn };
  });

  /** True when the preview was reached through a list of results it can go back to. */
  protected readonly cameFromResults = computed(
    () => this.edicao() !== undefined && this.q() !== undefined && this.isbn() === undefined,
  );

  protected readonly results = httpResource<ImportCandidateResponse[]>(() => {
    const term = this.q();
    return term === undefined || this.lookup() !== undefined
      ? undefined
      : this.importApi.searchRequest(term);
  });

  protected readonly preview = httpResource<ImportPreviewResponse>(() => {
    const lookup = this.lookup();
    return lookup === undefined ? undefined : this.importApi.previewRequest(lookup);
  });

  protected readonly resultsFailure = computed(() => failureOf(this.results.error()));
  protected readonly previewFailure = computed(() => failureOf(this.preview.error()));

  constructor() {
    // The field shows what the URL searched, also after a reload or the back button.
    effect(() => this.searchModel.set({ query: this.q() ?? '' }));

    // Another edition starts from a clean classification and a clean error.
    effect(() => {
      this.lookup();
      this.classificationModel.set(emptyClassification());
      this.importError.set(undefined);
    });

    // Picking a result replaces the list with the preview; the focus follows to its title.
    afterRenderEffect(() => this.previewTitle()?.nativeElement.focus());
  }

  /** First message of a field, once the user has been there or tried to submit. */
  protected errorOf(field: FieldTree<unknown>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  protected authorsOf(book: { readonly authors: readonly string[] }): string {
    return book.authors.join(', ');
  }

  protected async search(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.searchForm, async () => {
      // A new search leaves the previous edition behind.
      await this.router.navigate([], { queryParams: { q: this.searchModel().query.trim() } });
      return undefined;
    });
  }

  /** An ISBN the Open Library does not have: clears the search and leaves the field ready for a title. */
  protected async searchByTitle(): Promise<void> {
    await this.router.navigate([], { queryParams: {} });
    this.searchField()?.nativeElement.focus();
  }

  protected setGenres(genres: GenreEntry[]): void {
    this.classificationForm.genres().value.set(genres);
  }

  /** Leaving a series also clears the position, which means nothing without it. */
  protected setSeries(series: NamedEntry | undefined): void {
    this.classificationForm.seriesId().value.set(series?.id ?? null);
    this.classificationForm.seriesName().value.set(series?.name ?? '');
    if (!series) {
      this.classificationForm.seriesPosition().value.set(null);
    }
  }

  protected async importBook(event: Event, editionKey: string): Promise<void> {
    event.preventDefault();
    this.importError.set(undefined);
    await submit(this.classificationForm, async () => {
      try {
        const imported = await firstValueFrom(
          this.importApi.importEdition(importRequestOf(editionKey, this.classificationModel())),
        );
        await this.router.navigate(['/livro', imported.id]);
      } catch (error) {
        const apiError = ApiError.from(error);
        this.importError.set(apiError.detail);
        if (ALREADY_IN_COLLECTION.includes(apiError.code)) {
          // The preview comes back saying which book of the collection it is.
          this.preview.reload();
        }
      }
      return undefined;
    });
  }
}
