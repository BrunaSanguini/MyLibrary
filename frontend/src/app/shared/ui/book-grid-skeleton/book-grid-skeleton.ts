import { Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/** Placeholder of the shelf while the page loads, with one card outline per book. */
@Component({
  selector: 'ml-book-grid-skeleton',
  imports: [Skeleton],
  templateUrl: './book-grid-skeleton.html',
  styleUrl: './book-grid-skeleton.css',
})
export class BookGridSkeleton {
  readonly count = input(6);

  protected readonly cards = Array.from({ length: 24 }, (_, index) => index);
}
