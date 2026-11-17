import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookDetailResponse, BooksApi } from '@core/api/books-api';
import { BOOK_STATUS_LABELS, ReadingApi, ReviewResponse } from '@core/api/reading-api';
import { BookCardResponse } from '@core/api/shelf-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Icon } from '@shared/ui/icon/icon';

const EXCERPT_LENGTH = 220;

/** The first lines of a review, cut at a word. */
export function excerptOf(content: string | null | undefined): string | undefined {
  const text = content?.replace(/\s+/g, ' ').trim();
  if (!text) {
    return undefined;
  }
  if (text.length <= EXCERPT_LENGTH) {
    return text;
  }
  const cut = text.slice(0, EXCERPT_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '')}…`;
}

/** `4,5`: ratings are written the Brazilian way. */
export function formatRating(rating: number): string {
  return rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * The top of the Home: the favorite books one at a time, over the banner of each when it has one.
 * The rating and the first lines of the review come from what the reader wrote.
 *
 * <p>Without favorites, it welcomes the reader and points to where books are added.
 */
@Component({
  selector: 'ml-home-hero',
  imports: [BookCover, Icon, RouterLink],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.css',
})
export class HomeHero {
  /** The favorites to feature, in order. */
  readonly books = input.required<readonly BookCardResponse[]>();
  /** While the favorites load, the welcome must not flash. */
  readonly loading = input(false);

  private readonly booksApi = inject(BooksApi);
  private readonly readingApi = inject(ReadingApi);

  protected readonly index = linkedSignal({
    source: () => this.books().length,
    computation: () => 0,
  });

  protected readonly current = computed(() => this.books()[this.index()]);

  protected readonly detail = httpResource<BookDetailResponse>(() => {
    const book = this.current();
    return book ? this.booksApi.detailRequest(book.id) : undefined;
  });

  /** A book without review answers 404, which here only means there is nothing to quote. */
  private readonly review = httpResource<ReviewResponse>(() => {
    const book = this.current();
    return book ? this.readingApi.reviewRequest(book.id) : undefined;
  });

  protected readonly excerpt = computed(() =>
    this.review.hasValue() ? excerptOf(this.review.value().content) : undefined,
  );
  protected readonly banner = computed(() => this.detail.value()?.bannerUrl ?? undefined);
  protected readonly genres = computed(() =>
    (this.detail.value()?.genres ?? []).slice(0, 2).map((genre) => genre.name),
  );
  protected readonly status = computed(() => {
    const book = this.current();
    return book && BOOK_STATUS_LABELS[book.status];
  });
  protected readonly rating = computed(() => this.current()?.rating ?? undefined);
  protected readonly stars = computed(() => {
    const rating = this.rating() ?? 0;
    return Array.from({ length: 5 }, (_, star) =>
      rating >= star + 1 ? 'full' : rating >= star + 0.5 ? 'half' : 'empty',
    );
  });

  protected readonly formatRating = formatRating;

  protected readonly position = computed(() => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return { current: pad(this.index() + 1), total: pad(this.books().length) };
  });

  protected step(by: number): void {
    const total = this.books().length;
    this.index.update((index) => (index + by + total) % total);
  }
}
