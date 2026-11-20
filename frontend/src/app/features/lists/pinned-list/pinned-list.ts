import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BookListResponse, ListsApi, percentOf, readCountOf } from '@core/api/lists-api';
import { BookCardResponse } from '@core/api/shelf-api';
import { Button } from '@shared/ui/button/button';
import { colorOf } from '@shared/ui/list-covers/list-colors';
import { ListCovers } from '@shared/ui/list-covers/list-covers';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';

/** Past this many books the strip stops and says how many more there are. */
const STRIP_LIMIT = 20;

type SpineState = 'read' | 'reading' | 'unread';

/**
 * The list the reader pinned, in large: the fan of covers under a gothic arch, the progress with
 * a star at its end, one spine per book and the two ways in.
 *
 * <p>The strip of spines repeats, in miniature, what the list page says in words, so it is hidden
 * from assistive technology; each spine keeps the title as a tooltip for the mouse.
 */
@Component({
  selector: 'ml-pinned-list',
  imports: [Button, ListCovers, ProgressBar, RouterLink],
  templateUrl: './pinned-list.html',
  styleUrl: './pinned-list.css',
})
export class PinnedList {
  readonly list = input.required<BookListResponse>();

  private readonly listsApi = inject(ListsApi);

  private readonly books = rxResource({
    params: () => this.list().id,
    stream: ({ params }) => this.listsApi.books(params),
  });

  protected readonly percent = computed(() => percentOf(this.list()));
  protected readonly readCount = computed(() => readCountOf(this.list()));
  protected readonly color = computed(() => colorOf(this.list().color));

  protected readonly spines = computed(() =>
    (this.books.hasValue() ? this.books.value() : [])
      .slice(0, STRIP_LIMIT)
      .map((book) => ({ ...book, state: stateOf(book) })),
  );

  protected readonly more = computed(() =>
    this.books.hasValue() ? Math.max(this.books.value().length - STRIP_LIMIT, 0) : 0,
  );
}

function stateOf(book: BookCardResponse): SpineState {
  if (book.status === 'READ') {
    return 'read';
  }
  return book.status === 'READING' ? 'reading' : 'unread';
}
