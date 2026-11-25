import { httpResource } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  Injector,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { ApiError } from '@core/api/api-error';
import { BookDetailResponse, BooksApi } from '@core/api/books-api';
import { toId } from '@core/api/query-params';
import { NO_REVIEW, ReadingApi, ReadingResponse, ReviewResponse } from '@core/api/reading-api';
import { Ownership } from '@core/api/shelf-api';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { toRoman } from '@shared/format/roman';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Breadcrumbs } from '@shared/ui/breadcrumbs/breadcrumbs';
import { Button } from '@shared/ui/button/button';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ExLibrisSeal } from '@shared/ui/ex-libris-seal/ex-libris-seal';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { Tag } from '@shared/ui/tag/tag';
import { firstValueFrom, Observable } from 'rxjs';

import { BookNotes } from '../book-notes/book-notes';
import { ReadingHistory } from '../reading-history/reading-history';
import { ReadingSheet } from '../reading-sheet/reading-sheet';
import { RelatedBooks } from '../related-books/related-books';
import { ReviewEditor } from '../review-editor/review-editor';

/**
 * The page of a book: the cover with the ex-libris seal, the ficha (ownership, title, synopsis,
 * reading record, genres, edit and delete), the review and the notes, the history of readings and,
 * at the end, the rest of the series and the books with the same subgenre.
 *
 * <p>The ownership switches update the page first and the server right after, so a click answers
 * at once; if the server refuses, the page goes back to what is really saved and says why. The
 * review section is also the anchor `#minha-resenha`, where "Ler minha resenha" of the Home lands.
 */
@Component({
  selector: 'ml-book-page',
  imports: [
    BookNotes,
    Breadcrumbs,
    BookCover,
    Button,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    ExLibrisSeal,
    Icon,
    ReadingHistory,
    ReadingSheet,
    RelatedBooks,
    ReviewEditor,
    RouterLink,
    Skeleton,
    Tag,
  ],
  templateUrl: './book-page.html',
  styleUrls: ['../book-section.css', './book-page.css'],
})
export default class BookPage implements HasUnsavedChanges {
  readonly id = input(undefined, { transform: toId });

  private readonly router = inject(Router);
  private readonly booksApi = inject(BooksApi);
  private readonly readingApi = inject(ReadingApi);
  private readonly confirmDeletion = viewChild(ConfirmDialog);
  private readonly reviewEditor = viewChild(ReviewEditor);
  private readonly injector = inject(Injector);

  protected readonly book = httpResource<BookDetailResponse>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.booksApi.detailRequest(id);
  });

  protected readonly readings = httpResource<ReadingResponse[]>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.readingApi.readingsRequest(id);
  });

  /** A book without review answers 404, which is an everyday state here and not a failure. */
  protected readonly review = httpResource<ReviewResponse>(() => {
    const id = this.id();
    return id === undefined ? undefined : this.readingApi.reviewRequest(id);
  });

  protected readonly savedReview = computed(() =>
    this.review.hasValue() ? this.review.value() : undefined,
  );
  /** The API sends an absent rating as null. */
  protected readonly rating = computed(() => this.savedReview()?.rating ?? undefined);

  protected readonly reviewFailure = computed(() => {
    const error: unknown = this.review.error();
    if (error === undefined) {
      return undefined;
    }
    const apiError = ApiError.from(error);
    return apiError.code === NO_REVIEW ? undefined : apiError.detail;
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

  /** `I`, or `2,5` for a volume between two others. */
  protected readonly volume = computed(() => {
    const position = this.book.value()?.series?.position;
    if (position === undefined) {
      return undefined;
    }
    return Number.isInteger(position) ? toRoman(position) : position.toLocaleString('pt-BR');
  });

  protected readonly crumbs = computed(() => [
    { label: 'Home', link: '/' },
    { label: 'Minha Estante', link: '/estante' },
    { label: this.book.value()?.title ?? '' },
  ]);

  /** The classification in two rows: the genres, then the subgenres inside them. */
  protected readonly genres = computed(
    () => this.book.value()?.genres.filter((genre) => genre.parentId == null) ?? [],
  );
  protected readonly subgenres = computed(
    () => this.book.value()?.genres.filter((genre) => genre.parentId != null) ?? [],
  );

  protected readonly authorNames = computed(() =>
    (this.book.value()?.authors ?? []).map((author) => author.name).join(', '),
  );

  constructor() {
    // The review is below the fold: a link to #minha-resenha scrolls there once the page has it.
    const scroller = inject(ViewportScroller);
    const router = inject(Router);
    let scrolled = false;
    effect(() => {
      if (this.book.hasValue() && !this.review.isLoading() && !scrolled) {
        scrolled = true;
        const fragment = router.parseUrl(router.url).fragment;
        if (fragment) {
          afterNextRender(() => scroller.scrollToAnchor(fragment), { injector: this.injector });
        }
      }
    });
  }

  /** A review being written is the one thing this page can lose. */
  hasUnsavedChanges(): boolean {
    return this.reviewEditor()?.hasUnsavedChanges() ?? false;
  }

  /** Clicking the active tag turns it off: the book goes back to "not informed". */
  protected toggleOwnership(ownership: Ownership): void {
    const book = this.book.value();
    if (!book) {
      return;
    }
    const next: Ownership = book.ownership === ownership ? 'NONE' : ownership;
    this.apply({ ownership: next }, this.booksApi.setOwnership(book.id, next));
  }

  protected editReview(): void {
    this.reviewEditor()?.edit();
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
