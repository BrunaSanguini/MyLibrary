import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BookCover } from '../book-cover/book-cover';
import { Icon } from '../icon/icon';
import { ProgressBar } from '../progress-bar/progress-bar';
import { RatingStars } from '../rating-stars/rating-stars';
import { Tag } from '../tag/tag';

/** What the card needs to show a book. Mirrors BookCardResponse, plus the Marco 3 fields. */
export interface BookCardData {
  readonly id: number;
  readonly title: string;
  readonly authors: readonly string[];
  readonly coverUrl?: string;
  readonly pageCount?: number;
  /** 0 to 5, in half points. Absent until the review exists. */
  readonly rating?: number;
  /** 0 to 100. Only a book being read has one, and only then the bar shows. */
  readonly progress?: number;
  readonly seriesName?: string;
  readonly seriesPosition?: number;
}

/**
 * Horizontal book card of every listing: cover, title, authors, rating and pages.
 *
 * <p>The whole card is one link to the book page, so there is a single target and a single
 * accessible name. The progress bar only shows for a book being read, as the design system says.
 */
@Component({
  selector: 'ml-book-card',
  imports: [BookCover, Icon, ProgressBar, RatingStars, RouterLink, Tag],
  templateUrl: './book-card.html',
  styleUrl: './book-card.css',
  host: {
    '[attr.data-compact]': 'compact() ? "" : null',
  },
})
export class BookCard {
  readonly book = input.required<BookCardData>();
  /** The search result version: smaller cover and a thinner bar. */
  readonly compact = input(false);

  protected readonly authors = computed(() => this.book().authors.join(', '));
  protected readonly reading = computed(() => this.book().progress !== undefined);

  protected readonly series = computed(() => {
    const { seriesName, seriesPosition } = this.book();
    return seriesName && seriesPosition !== undefined
      ? `${seriesName} · Livro ${seriesPosition.toLocaleString('pt-BR')}`
      : undefined;
  });

  /** One name for the link, so the reader hears the book once instead of each piece of it. */
  protected readonly label = computed(() => {
    const { title, rating } = this.book();
    const parts = [title, this.authors()];
    if (rating !== undefined) {
      parts.push(`nota ${rating.toLocaleString('pt-BR')}`);
    }
    return parts.filter(Boolean).join(', ');
  });
}
