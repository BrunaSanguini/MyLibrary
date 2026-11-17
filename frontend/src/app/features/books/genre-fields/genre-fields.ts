import { Component, computed, input, output } from '@angular/core';
import { Icon } from '@shared/ui/icon/icon';

import { EntityPicker, PickedEntry } from '../entity-picker/entity-picker';

/** A genre of the book; a subgenre points to its genre. */
export interface GenreEntry {
  readonly id: number;
  readonly name: string;
  readonly parentId: number | null;
}

/**
 * The classification of a book in two fields: the genres, then the subgenres of those genres.
 *
 * <p>The book keeps both in one list (the API takes `genreIds`); this component splits it for the
 * reader and gives back the whole list on every change. Taking a genre away takes its subgenres
 * with it, as they only make sense inside it.
 */
@Component({
  selector: 'ml-genre-fields',
  imports: [EntityPicker, Icon],
  templateUrl: './genre-fields.html',
  styleUrls: ['../book-fields.css', './genre-fields.css'],
})
export class GenreFields {
  readonly genres = input.required<readonly GenreEntry[]>();
  readonly changed = output<GenreEntry[]>();

  protected readonly topLevel = computed(() =>
    this.genres().filter((genre) => genre.parentId === null),
  );
  protected readonly subgenres = computed(() =>
    this.genres().filter((genre) => genre.parentId !== null),
  );
  protected readonly ids = computed(() => this.genres().map((genre) => genre.id));

  protected add(entry: PickedEntry): void {
    this.changed.emit([
      ...this.genres(),
      { id: entry.id, name: entry.name, parentId: entry.parentId ?? null },
    ]);
  }

  protected remove(id: number): void {
    this.changed.emit(this.genres().filter((genre) => genre.id !== id && genre.parentId !== id));
  }
}
