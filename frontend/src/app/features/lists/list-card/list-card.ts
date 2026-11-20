import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookListResponse, readCountOf, statusLabelOf } from '@core/api/lists-api';
import { relativeTimeSince } from '@core/time/relative-time';
import { NOW } from '@core/time/today';
import { Icon } from '@shared/ui/icon/icon';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';

import { ListCovers } from '../list-covers/list-covers';

/**
 * A list on the Listas page: the fan of covers, its name and description, how much of it was read
 * and when it changed last.
 *
 * <p>The whole card opens the list, but the link is the name: the link covers the card with an
 * invisible layer, so a screen reader finds one link with the name of the list and not the whole
 * card read aloud as the link.
 */
@Component({
  selector: 'ml-list-card',
  imports: [Icon, ListCovers, ProgressBar, RouterLink],
  templateUrl: './list-card.html',
  styleUrl: './list-card.css',
})
export class ListCard {
  readonly list = input.required<BookListResponse>();

  private readonly now = inject(NOW);

  protected readonly readCount = computed(() => readCountOf(this.list()));
  protected readonly statusLabel = computed(() => statusLabelOf(this.list().status));
  protected readonly percent = computed(() => {
    const { bookCount, readCount } = this.list();
    return bookCount === 0 ? 0 : (readCount * 100) / bookCount;
  });
  protected readonly updated = computed(() => relativeTimeSince(this.list().updatedAt, this.now()));
}
