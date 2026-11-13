import { httpResource } from '@angular/common/http';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ShelfApi, ShelfPage } from '@core/api/shelf-api';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Icon } from '@shared/ui/icon/icon';
import { debounceTime } from 'rxjs';

/** Waits for a pause in the typing instead of asking the API on every keystroke. */
const TYPING_PAUSE = 250;
const RESULTS = 6;
const MIN_TERM = 2;

/**
 * Search over the collection, opened from the header.
 *
 * <p>Keyboard only, start to finish: the button says whether the panel is open, opening moves the
 * focus to the field, the arrow keys walk the results, Enter opens the highlighted one, and Escape
 * closes and gives the focus back to the button.
 */
@Component({
  selector: 'ml-search-panel',
  imports: [BookCover, Icon, RouterLink],
  templateUrl: './search-panel.html',
  styleUrl: './search-panel.css',
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:click)': 'closeOnOutsideClick($event)',
  },
})
export class SearchPanel {
  private readonly router = inject(Router);
  private readonly shelfApi = inject(ShelfApi);

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly open = signal(false);
  protected readonly term = signal('');
  /** Index of the result the arrow keys are on; -1 means the focus is still in the field. */
  protected readonly highlighted = signal(-1);

  private readonly settledTerm = toSignal(
    toObservable(this.term).pipe(debounceTime(TYPING_PAUSE)),
    {
      initialValue: '',
    },
  );

  /** A term shorter than two characters would match most of the shelf, so it asks nothing. */
  private readonly query = computed(() => {
    const term = this.settledTerm().trim();
    return this.open() && term.length >= MIN_TERM ? term : undefined;
  });

  protected readonly results = httpResource<ShelfPage>(() => {
    const q = this.query();
    return q === undefined ? undefined : this.shelfApi.booksRequest({ q, size: RESULTS });
  });

  protected readonly books = computed(() => this.results.value()?.content ?? []);
  protected readonly searching = computed(
    () => this.query() !== undefined && this.results.isLoading(),
  );
  protected readonly nothingFound = computed(
    () => this.query() !== undefined && this.results.hasValue() && this.books().length === 0,
  );

  constructor() {
    // Opening with the mouse or the keyboard both have to land in the field.
    effect(() => {
      if (this.open()) {
        this.field()?.nativeElement.focus();
      }
    });
  }

  protected toggle(): void {
    this.open.update((open) => !open);
    this.highlighted.set(-1);
  }

  protected close(): void {
    if (this.open()) {
      this.open.set(false);
      this.highlighted.set(-1);
      this.trigger().nativeElement.focus();
    }
  }

  protected onTyping(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
    this.highlighted.set(-1);
  }

  /** Down and up walk the list; from the first item, up returns to the field. */
  protected moveHighlight(step: number, event: Event): void {
    if (this.books().length === 0) {
      return;
    }
    event.preventDefault();
    const next = this.highlighted() + step;
    if (next < 0) {
      this.highlighted.set(-1);
      this.field()?.nativeElement.focus();
      return;
    }
    this.highlighted.set(Math.min(next, this.books().length - 1));
  }

  /** Enter opens the highlighted book, or the full shelf when nothing is highlighted. */
  protected submit(): void {
    const book = this.books()[this.highlighted()];
    const target = book ? ['/livros', book.id] : ['/estante'];
    const queryParams = book ? {} : { q: this.term().trim() || null };
    this.open.set(false);
    void this.router.navigate(target, { queryParams });
  }

  protected closeOnOutsideClick(event: Event): void {
    const target = event.target as Node;
    const insideTrigger = this.trigger().nativeElement.contains(target);
    const insidePanel = this.field()?.nativeElement.closest('.panel')?.contains(target) ?? false;
    if (this.open() && !insideTrigger && !insidePanel) {
      this.open.set(false);
      this.highlighted.set(-1);
    }
  }
}
