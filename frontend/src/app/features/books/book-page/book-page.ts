import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { BookDetailResponse, BooksApi } from '@core/api/books-api';
import { toId } from '@core/api/query-params';
import { Ownership } from '@core/api/shelf-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { Tag } from '@shared/ui/tag/tag';
import { firstValueFrom, Observable } from 'rxjs';

const LANGUAGES: Readonly<Record<string, string>> = {
  por: 'Português',
  eng: 'Inglês',
  spa: 'Espanhol',
  fra: 'Francês',
  ita: 'Italiano',
  deu: 'Alemão',
  jpn: 'Japonês',
};

/**
 * The page of a book: its data, where it sits in the catalog, and the three quick switches
 * (Tenho, Wishlist and favorite).
 *
 * <p>The switches update the page first and the server right after, so a click answers at once;
 * if the server refuses, the page goes back to what is really saved and says why.
 */
@Component({
  selector: 'ml-book-page',
  imports: [
    BookCover,
    Button,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Icon,
    RouterLink,
    Skeleton,
    Tag,
  ],
  templateUrl: './book-page.html',
  styleUrl: './book-page.css',
})
export default class BookPage {
  readonly id = input(undefined, { transform: toId });

  private readonly router = inject(Router);
  private readonly booksApi = inject(BooksApi);
  private readonly confirmDeletion = viewChild(ConfirmDialog);

  protected readonly book = httpResource<BookDetailResponse>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.booksApi.detailRequest(id);
  });

  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly deleting = signal(false);

  private readonly error = computed(() => {
    const error: unknown = this.book.error();
    return error === undefined ? undefined : ApiError.from(error);
  });

  /** An id that is not a number can only be a mistyped address, the same as a book that is gone. */
  protected readonly notFound = computed(
    () => this.id() === undefined || this.error()?.code === 'book.not-found',
  );
  protected readonly errorMessage = computed(() => this.error()?.detail);

  protected readonly authorNames = computed(() =>
    (this.book.value()?.authors ?? []).map((author) => author.name).join(', '),
  );

  protected readonly details = computed(() => {
    const book = this.book.value();
    if (!book) {
      return [];
    }
    const language = book.languageCode
      ? (LANGUAGES[book.languageCode] ?? book.languageCode)
      : undefined;
    return [
      { label: 'Ano de publicação', value: book.publishedYear?.toString() },
      { label: 'Páginas', value: book.pageCount?.toLocaleString('pt-BR') },
      { label: 'Idioma', value: language },
      { label: 'ISBN-13', value: book.isbn13 },
      { label: 'ISBN-10', value: book.isbn10 },
    ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));
  });

  protected readonly seriesPlace = computed(() => {
    const series = this.book.value()?.series;
    if (!series) {
      return undefined;
    }
    const position = series.position.toLocaleString('pt-BR');
    return series.totalVolumes
      ? `Livro ${position} de ${series.totalVolumes}`
      : `Livro ${position}`;
  });

  /** Clicking the active tag turns it off: the book goes back to "not informed". */
  protected toggleOwnership(ownership: Ownership): void {
    const book = this.book.value();
    if (!book) {
      return;
    }
    const next: Ownership = book.ownership === ownership ? 'NONE' : ownership;
    this.apply({ ownership: next }, this.booksApi.setOwnership(book.id, next));
  }

  protected toggleFavorite(): void {
    const book = this.book.value();
    if (book) {
      this.apply({ favorite: !book.favorite }, this.booksApi.setFavorite(book.id, !book.favorite));
    }
  }

  protected askToDelete(): void {
    this.confirmDeletion()?.open();
  }

  protected async delete(): Promise<void> {
    const book = this.book.value();
    if (!book) {
      return;
    }
    this.deleting.set(true);
    try {
      await firstValueFrom(this.booksApi.delete(book.id));
      await this.router.navigate(['/estante']);
    } catch (error) {
      this.confirmDeletion()?.close();
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.deleting.set(false);
    }
  }

  private apply(change: Partial<BookDetailResponse>, request: Observable<void>): void {
    this.failure.set(undefined);
    this.book.update((book) => (book ? { ...book, ...change } : book));
    request.subscribe({
      error: (error: unknown) => {
        this.failure.set(ApiError.from(error).detail);
        this.book.reload();
      },
    });
  }
}
