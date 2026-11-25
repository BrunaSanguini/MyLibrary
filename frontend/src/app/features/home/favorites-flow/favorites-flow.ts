import { DOCUMENT } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookDetailResponse, BooksApi } from '@core/api/books-api';
import { BookCardResponse } from '@core/api/shelf-api';
import { toRoman } from '@shared/format/roman';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Icon } from '@shared/ui/icon/icon';

import { formatRating } from '../home-hero/home-hero';

/** Time each book stays in the middle, as in the design. */
export const FLOW_INTERVAL = 4500;

/** Books further than this from the middle are out of view. */
const VISIBLE_SIDE = 2;

interface FlowItem {
  readonly book: BookCardResponse;
  readonly offset: number;
  readonly hidden: boolean;
}

/**
 * The favorites in a coverflow: one book in the middle, bigger and outlined in gold, the others
 * smaller at its sides. It moves on by itself, and stops while the mouse or the focus is on it,
 * when the reader presses Pausar, and always when the system asks for reduced motion.
 */
@Component({
  selector: 'ml-favorites-flow',
  imports: [BookCover, Icon, RouterLink],
  templateUrl: './favorites-flow.html',
  styleUrls: ['../home-section.css', './favorites-flow.css'],
})
export class FavoritesFlow {
  readonly books = input.required<readonly BookCardResponse[]>();

  private readonly booksApi = inject(BooksApi);
  private readonly reducedMotion =
    inject(DOCUMENT).defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;

  protected readonly index = linkedSignal({
    source: () => this.books().length,
    computation: () => 0,
  });
  /** Pressed by the reader. */
  protected readonly paused = signal(this.reducedMotion);
  /** Mouse or focus inside: a pause that ends by itself. */
  private readonly resting = signal(false);

  protected readonly moving = computed(
    () => !this.paused() && !this.resting() && this.books().length > 1,
  );

  protected readonly current = computed(() => this.books()[this.index()]);

  protected readonly detail = httpResource<BookDetailResponse>(() => {
    const book = this.current();
    return book ? this.booksApi.detailRequest(book.id) : undefined;
  });

  protected readonly items = computed<FlowItem[]>(() => {
    const total = this.books().length;
    return this.books().map((book, at) => {
      let offset = at - this.index();
      if (offset > total / 2) {
        offset -= total;
      }
      if (offset < -total / 2) {
        offset += total;
      }
      return { book, offset, hidden: Math.abs(offset) > VISIBLE_SIDE };
    });
  });

  /** `I / VIII`. */
  protected readonly position = computed(
    () => `${toRoman(this.index() + 1)} / ${toRoman(this.books().length)}`,
  );

  protected readonly formatRating = formatRating;

  constructor() {
    effect((onCleanup) => {
      if (this.moving()) {
        const timer = setInterval(() => this.step(1), FLOW_INTERVAL);
        onCleanup(() => clearInterval(timer));
      }
    });
  }

  protected step(by: number): void {
    const total = this.books().length;
    this.index.update((index) => (index + by + total) % total);
  }

  /** Left and right move the book in the middle while the focus is on the flow. */
  protected moveWithKeys(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    this.step(event.key === 'ArrowRight' ? 1 : -1);
  }

  protected pick(item: FlowItem): void {
    this.step(item.offset);
  }

  protected rest(resting: boolean): void {
    this.resting.set(resting);
  }

  /** Focus that moves to another book inside the flow is not leaving it. */
  protected blur(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
      this.resting.set(false);
    }
  }

  /**
   * The name of each cover, read instead of what is printed on it. The covers themselves are
   * hidden from screen readers, so the name never disagrees with a visible text.
   */
  protected labelOf(item: FlowItem): string {
    const author = item.book.authors[0];
    const name = author ? `${item.book.title}, de ${author}` : item.book.title;
    if (item.offset !== 0) {
      return `Trazer ${name} para o centro`;
    }
    const rating = item.book.rating ? `, nota ${formatRating(item.book.rating)}` : '';
    return `${name}${rating} (no centro)`;
  }
}
