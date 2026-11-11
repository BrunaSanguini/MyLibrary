import { Component, computed, input, output } from '@angular/core';

import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Pagination of a listing. Pages are zero-based on the wire, as the API sends them, and shown
 * one-based, as people count.
 */
@Component({
  selector: 'ml-paginator',
  imports: [Button, Icon],
  templateUrl: './paginator.html',
  styleUrl: './paginator.css',
})
export class Paginator {
  /** Zero-based, like the API. */
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();

  protected readonly current = computed(() => this.page() + 1);
  protected readonly first = computed(() => this.page() <= 0);
  protected readonly last = computed(() => this.current() >= this.totalPages());

  protected go(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.pageChange.emit(page);
    }
  }
}
