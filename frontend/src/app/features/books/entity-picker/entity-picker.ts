import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/api/api-error';
import { CatalogApi, CatalogKind, NamedEntry } from '@core/api/catalog-api';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { debounceTime, firstValueFrom } from 'rxjs';

/** Where the options come from: one of the searchable catalogs, or the genre tree. */
export type PickerSource = CatalogKind | 'genres';

/** The option that creates what was typed, kept apart from real entries by its id. */
const CREATE_ID = -1;
const TYPING_PAUSE = 200;
const OPTIONS = 8;

let nextId = 0;

/**
 * Combobox that picks an author, publisher, series or genre, or creates one on the spot.
 *
 * <p>Behaviour and ARIA come from `@angular/aria`; this component adds the search, the "Criar"
 * option and the look. Picking emits the entry and clears the field, so the same picker serves
 * single fields (publisher, series) and lists (authors, genres): the form decides what to do with
 * what was picked.
 */
@Component({
  selector: 'ml-entity-picker',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option],
  templateUrl: './entity-picker.html',
  styleUrl: './entity-picker.css',
})
export class EntityPicker {
  readonly source = input.required<PickerSource>();
  readonly label = input.required<string>();
  readonly placeholder = input('Digite para buscar');
  /** Ids already chosen, left out of the options. */
  readonly exclude = input<readonly number[]>([]);
  /** Marks the field as invalid for assistive technology; the form shows the message. */
  readonly invalid = input(false);
  readonly describedBy = input<string>();

  readonly picked = output<NamedEntry>();

  private readonly catalogApi = inject(CatalogApi);
  private readonly genresApi = inject(GenresApi);

  protected readonly inputId = `ml-entity-picker-${nextId++}`;
  protected readonly createId = CREATE_ID;

  protected readonly term = signal('');
  protected readonly expanded = signal(false);
  protected readonly selection = signal<number[]>([]);
  protected readonly creating = signal(false);
  protected readonly failure = signal<string | undefined>(undefined);

  private readonly settledTerm = toSignal(
    toObservable(this.term).pipe(debounceTime(TYPING_PAUSE)),
    {
      initialValue: '',
    },
  );

  private readonly catalog = httpResource<{ content: NamedEntry[] }>(() => {
    const source = this.source();
    return source === 'genres' || !this.expanded()
      ? undefined
      : this.catalogApi.listRequest(source, this.settledTerm().trim(), 0, OPTIONS);
  });

  /** The genre tree is small and has no search endpoint, so it is filtered here. */
  private readonly genres = httpResource<GenreTreeResponse[]>(() =>
    this.source() === 'genres' && this.expanded() ? this.genresApi.treeRequest() : undefined,
  );

  protected readonly options = computed<readonly NamedEntry[]>(() => {
    const excluded = new Set(this.exclude());
    const entries =
      this.source() === 'genres'
        ? flatten(this.genres.value() ?? []).filter((genre) =>
            normalize(genre.name).includes(normalize(this.term())),
          )
        : (this.catalog.value()?.content ?? []);
    return entries.filter((entry) => !excluded.has(entry.id)).slice(0, OPTIONS);
  });

  /** Offered when the typed name matches no option exactly. */
  protected readonly canCreate = computed(() => {
    const typed = normalize(this.term());
    return typed.length > 0 && !this.options().some((entry) => normalize(entry.name) === typed);
  });

  constructor() {
    // The listbox reports the pick through its selection; acting on it here keeps the template dumb.
    effect(() => {
      const [id] = this.selection();
      if (id !== undefined) {
        void this.choose(id);
      }
    });
  }

  private async choose(id: number): Promise<void> {
    this.selection.set([]);
    this.failure.set(undefined);
    const entry = id === CREATE_ID ? await this.create() : this.options().find((o) => o.id === id);
    if (entry) {
      this.picked.emit(entry);
      this.term.set('');
      this.expanded.set(false);
    }
  }

  private async create(): Promise<NamedEntry | undefined> {
    const name = this.term().trim();
    const source = this.source();
    this.creating.set(true);
    try {
      return await firstValueFrom(
        source === 'genres'
          ? this.catalogApi.createGenre(name)
          : this.catalogApi.create(source, name),
      );
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
      return undefined;
    } finally {
      this.creating.set(false);
    }
  }
}

function flatten(tree: readonly GenreTreeResponse[]): NamedEntry[] {
  return tree.flatMap((genre) => [
    { id: genre.id, name: genre.name },
    ...genre.subgenres.map((subgenre) => ({ id: subgenre.id, name: subgenre.name })),
  ]);
}

/** Same idea as the back-end's TextNormalizer: no accents, no case, single spaces. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
