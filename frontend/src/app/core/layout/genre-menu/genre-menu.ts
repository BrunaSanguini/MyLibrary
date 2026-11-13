import { httpResource } from '@angular/common/http';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { Icon } from '@shared/ui/icon/icon';

/**
 * Genres and their subgenres, opened from the header.
 *
 * <p>Keyboard only: the trigger says whether the menu is open, the arrow down moves into the first
 * genre, Tab walks the links in reading order, and Escape closes and returns the focus to the
 * trigger. The tree is only fetched the first time the menu opens, since it rarely changes.
 */
@Component({
  selector: 'ml-genre-menu',
  imports: [Icon, RouterLink],
  templateUrl: './genre-menu.html',
  styleUrl: './genre-menu.css',
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:click)': 'closeOnOutsideClick($event)',
  },
})
export class GenreMenu {
  private readonly genresApi = inject(GenresApi);

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly open = signal(false);
  /** Stays true after the first opening, so closing the menu does not throw the tree away. */
  private readonly everOpened = signal(false);

  protected readonly genres = httpResource<GenreTreeResponse[]>(() =>
    this.everOpened() ? this.genresApi.treeRequest() : undefined,
  );

  protected readonly tree = computed(() => this.genres.value() ?? []);
  protected readonly empty = computed(() => this.genres.hasValue() && this.tree().length === 0);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.everOpened.set(true);
      }
    });
  }

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected close(): void {
    if (this.open()) {
      this.open.set(false);
      this.trigger().nativeElement.focus();
    }
  }

  /** From the trigger, the arrow down opens the menu and steps into the first genre. */
  protected openAndEnter(event: Event): void {
    event.preventDefault();
    this.open.set(true);
    queueMicrotask(() => this.panel()?.nativeElement.querySelector('a')?.focus());
  }

  protected closeOnOutsideClick(event: Event): void {
    const target = event.target as Node;
    const inside =
      this.trigger().nativeElement.contains(target) ||
      (this.panel()?.nativeElement.contains(target) ?? false);
    if (this.open() && !inside) {
      this.open.set(false);
    }
  }
}
