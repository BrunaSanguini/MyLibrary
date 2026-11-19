import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FieldTree, form, FormField, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { BookDetailResponse, BookImage, BooksApi } from '@core/api/books-api';
import { NamedEntry } from '@core/api/catalog-api';
import { toId } from '@core/api/query-params';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { Breadcrumbs } from '@shared/ui/breadcrumbs/breadcrumbs';
import { Button } from '@shared/ui/button/button';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { firstValueFrom } from 'rxjs';

import { EntityPicker } from '../entity-picker/entity-picker';
import { GenreEntry, GenreFields } from '../genre-fields/genre-fields';
import { ImageField } from '../image-field/image-field';
import {
  bookFormOf,
  bookFormSchema,
  bookRequestOf,
  emptyBookForm,
  SERVER_FIELDS,
} from './book-form';

/**
 * Registers a book by hand and edits one, on the same form.
 *
 * <p>The validation mirrors the back-end, field errors of a 400 land on their fields, and a 409 or
 * 422 shows at the top with the detail the API wrote. Cover and banner are sent after the book is
 * saved, since they need its id; if only the image fails, the form stays open on the saved book,
 * so trying again never creates a second one.
 */
@Component({
  selector: 'ml-book-form-page',
  imports: [
    Breadcrumbs,
    Button,
    EntityPicker,
    ErrorState,
    FormField,
    GenreFields,
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

  private readonly router = inject(Router);
  private readonly booksApi = inject(BooksApi);

  /** Set when a new book was saved but its image was not: the next save updates it. */
  private readonly createdId = signal<number | undefined>(undefined);
  protected readonly bookId = computed(() => this.id() ?? this.createdId());
  protected readonly editing = computed(() => this.id() !== undefined);

  protected readonly book = httpResource<BookDetailResponse>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.booksApi.detailRequest(id);
  });

  protected readonly model = signal(emptyBookForm());
  protected readonly bookForm = form(this.model, bookFormSchema);

  protected readonly topError = signal<string | undefined>(undefined);
  protected readonly coverFile = signal<File | undefined>(undefined);
  protected readonly bannerFile = signal<File | undefined>(undefined);
  protected readonly removeCover = signal(false);
  protected readonly removeBanner = signal(false);

  /** Pickers and files change the model from code, which the form does not count as dirty. */
  private readonly changedOutsideFields = signal(false);
  private readonly saved = signal(false);
  private filled = false;

  protected readonly authorIds = computed(() => this.model().authors.map((author) => author.id));
  protected readonly publisherIds = computed(() =>
    this.model().publishers.map((publisher) => publisher.id),
  );

  protected readonly loadError = computed(() => {
    const error: unknown = this.book.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  constructor() {
    // Fills the form once with the book being edited; later reloads must not undo typed changes.
    effect(() => {
      if (this.book.hasValue() && !this.filled) {
        this.filled = true;
        this.model.set(bookFormOf(this.book.value()));
      }
    });
  }

  hasUnsavedChanges(): boolean {
    return !this.saved() && (this.bookForm().dirty() || this.changedOutsideFields());
  }

  /** First message of a field, once the user has been there or tried to save. */
  protected errorOf(field: FieldTree<unknown>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
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

  protected setGenres(genres: GenreEntry[]): void {
    this.change(() => this.bookForm.genres().value.set(genres));
  }

  protected addPublisher(publisher: NamedEntry): void {
    this.change(() =>
      this.bookForm.publishers().value.update((publishers) => [...publishers, publisher]),
    );
  }

  protected removePublisher(id: number): void {
    this.change(() =>
      this.bookForm
        .publishers()
        .value.update((publishers) => publishers.filter((p) => p.id !== id)),
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

  protected setImage(image: BookImage, file: File | undefined): void {
    this.change(() => (image === 'cover' ? this.coverFile : this.bannerFile).set(file));
  }

  protected setRemoval(image: BookImage, remove: boolean): void {
    this.change(() => (image === 'cover' ? this.removeCover : this.removeBanner).set(remove));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.topError.set(undefined);
    await submit(this.bookForm, async () => {
      try {
        const request = bookRequestOf(this.model());
        const id = this.bookId();
        const saved = await firstValueFrom(
          id === undefined ? this.booksApi.create(request) : this.booksApi.update(id, request),
        );
        this.createdId.set(this.id() === undefined ? saved.id : undefined);
        await this.saveImages(saved.id);
        this.saved.set(true);
        await this.router.navigate(['/livro', saved.id]);
        return undefined;
      } catch (error) {
        return this.serverErrors(ApiError.from(error));
      }
    });
  }

  private async saveImages(id: number): Promise<void> {
    for (const image of ['cover', 'banner'] as const) {
      const file = (image === 'cover' ? this.coverFile : this.bannerFile)();
      const remove = (image === 'cover' ? this.removeCover : this.removeBanner)();
      if (file) {
        await firstValueFrom(this.booksApi.uploadImage(id, image, file));
      } else if (remove) {
        await firstValueFrom(this.booksApi.removeImage(id, image));
      }
    }
  }

  /** Field errors go to their fields; whatever has no field shows at the top. */
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
          : `O livro foi salvo, mas a imagem não foi enviada: ${error.detail}`,
      );
    }
    return onFields.length > 0 ? onFields : undefined;
  }

  private change(apply: () => void): void {
    apply();
    this.changedOutsideFields.set(true);
  }
}
