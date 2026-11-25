import { httpResource } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookDetailResponse, BooksApi } from '@core/api/books-api';
import { BOOK_STATUS_LABELS, ReadingApi, ReviewResponse } from '@core/api/reading-api';
import { BookCardResponse } from '@core/api/shelf-api';
import { toRoman } from '@shared/format/roman';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Icon } from '@shared/ui/icon/icon';

const EXCERPT_LENGTH = 180;

/** How long each featured book stays, as the spec recommends. */
export const HERO_INTERVAL = 8000;

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
 * A book of the hero: the featured ones carry the image chosen for them in Configurações; the
 * favorites, used while nothing is featured, carry their status and rating.
 */
export type HeroBook = Pick<BookCardResponse, 'id' | 'title' | 'authors' | 'coverUrl'> &
  Partial<Pick<BookCardResponse, 'status' | 'rating'>> & { readonly imageUrl?: string | null };

/**
 * The top of the Home: the featured books one at a time, over the image of each (or the banner of
 * the book). The rating and the first lines of the review come from what the reader wrote.
 *
 * <p>With two or three books it moves on by itself every eight seconds, and stops while the mouse
 * or the focus is on it, and always when the system asks for reduced motion. Without books, it
 * welcomes the reader and points to where the featured books are chosen.
 */
@Component({
  selector: 'ml-home-hero',
  imports: [BookCover, Icon, RouterLink],
  templateUrl: './home-hero.html',
  styleUrls: ['./home-hero.css', './home-hero-foot.css'],
})
export class HomeHero {
  /** The books to feature, in order. */
  readonly books = input.required<readonly HeroBook[]>();
  /** While the favorites load, the welcome must not flash. */
  readonly loading = input(false);

  private readonly booksApi = inject(BooksApi);
  private readonly readingApi = inject(ReadingApi);
  private readonly reducedMotion =
    inject(DOCUMENT).defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;

  /** Mouse or focus on the hero: a pause that ends by itself. */
  private readonly resting = signal(false);
  protected readonly moving = computed(
    () => !this.reducedMotion && !this.resting() && this.books().length > 1,
  );

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
  /** The image chosen for the featured book, or else the banner of the book. */
  protected readonly banner = computed(
    () => this.current()?.imageUrl ?? this.detail.value()?.bannerUrl ?? undefined,
  );
  protected readonly genres = computed(() =>
    (this.detail.value()?.genres ?? []).slice(0, 2).map((genre) => genre.name),
  );
  protected readonly status = computed(() => {
    const status = this.current()?.status;
    return status && BOOK_STATUS_LABELS[status];
  });
  /** The card brings the rating of the favorites; a featured book has it in its review. */
  protected readonly rating = computed(
    () =>
      this.current()?.rating ??
      (this.review.hasValue() ? (this.review.value().rating ?? undefined) : undefined),
  );
  protected readonly stars = computed(() => {
    const rating = this.rating() ?? 0;
    return Array.from({ length: 5 }, (_, star) =>
      rating >= star + 1 ? 'full' : rating >= star + 0.5 ? 'half' : 'empty',
    );
  });

  protected readonly formatRating = formatRating;

  /** `I` of `III`. */
  protected readonly position = computed(() => ({
    current: toRoman(this.index() + 1),
    total: toRoman(this.books().length),
  }));

  constructor() {
    effect((onCleanup) => {
      if (this.moving()) {
        const timer = setInterval(() => this.step(1), HERO_INTERVAL);
        onCleanup(() => clearInterval(timer));
      }
    });
  }

  protected rest(resting: boolean): void {
    this.resting.set(resting);
  }

  /** Focus that moves to another control inside the hero is not leaving it. */
  protected blur(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
      this.resting.set(false);
    }
  }

  /** A plain "#favoritos" link would leave the Home because of <base href="/">. */
  protected toFavorites(event: Event): void {
    event.preventDefault();
    document.getElementById('favoritos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected step(by: number): void {
    const total = this.books().length;
    this.index.update((index) => (index + by + total) % total);
  }
}
