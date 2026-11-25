import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/api/api-error';
import { CatalogApi, CatalogKind, NamedEntry } from '@core/api/catalog-api';
import { GenresApi, GenreTreeResponse } from '@core/api/genres-api';
import { debounceTime, firstValueFrom } from 'rxjs';

/**
 * Where the options come from: one of the searchable catalogs, the genres of the tree, or the
 * subgenres of the genres in `parents`.
 */
export type PickerSource = CatalogKind | 'genres' | 'subgenres';

/** What was picked; a subgenre also says which genre it belongs to. */
export interface PickedEntry extends NamedEntry {
  readonly parentId?: number | null;
}

/** An option that creates what was typed (in a given genre, for a subgenre). */
interface CreateOption {
  readonly id: number;
  readonly label: string;
  readonly parentId: number | null;
}

/** The options that create are kept apart from real entries by their negative ids. */
const CREATE_ID = -1;
const TYPING_PAUSE = 200;
/** Clicking the field lists every entry, as the spec asks: the API serves at most 100 a page. */
const OPTIONS = 100;

let nextId = 0;

/**
 * Combobox that picks an author, publisher, series, genre or subgenre, or creates one on the spot.
 *
 * <p>Clicking the field lists every entry; typing filters them. The subgenres of every genre are
 * offered, but a new subgenre is created inside one of the genres in `parents`, and creating one
 * asks in which genre it goes when there is more than one.
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
  /** For `subgenres`: the genres of the book, whose subgenres are offered. */
  readonly parents = input<readonly NamedEntry[]>([]);

  readonly picked = output<PickedEntry>();

  private readonly catalogApi = inject(CatalogApi);
  private readonly genresApi = inject(GenresApi);

  protected readonly inputId = `ml-entity-picker-${nextId++}`;

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

  private readonly fromTree = computed(() => {
    const source = this.source();
    return source === 'genres' || source === 'subgenres';
  });

  private readonly catalog = httpResource<{ content: NamedEntry[] }>(() => {
    const source = this.source();
    return source === 'genres' || source === 'subgenres' || !this.expanded()
      ? undefined
      : this.catalogApi.listRequest(source, this.settledTerm().trim(), 0, OPTIONS);
  });

  /** The genre tree is small and has no search endpoint, so it is filtered here. */
  private readonly genres = httpResource<GenreTreeResponse[]>(() =>
    this.fromTree() && this.expanded() ? this.genresApi.treeRequest() : undefined,
  );

  protected readonly options = computed<readonly PickedEntry[]>(() => {
    const excluded = new Set(this.exclude());
    const entries = this.fromTree()
      ? this.treeEntries().filter((genre) => normalize(genre.name).includes(normalize(this.term())))
      : (this.catalog.value()?.content ?? []);
    return entries.filter((entry) => !excluded.has(entry.id));
  });

  private readonly treeEntries = computed<readonly PickedEntry[]>(() => {
    const tree = this.genres.value() ?? [];
    if (this.source() === 'genres') {
      return tree.map(({ id, name }) => ({ id, name, parentId: null }));
    }
    // Every subgenre, of any genre: the reader classifies freely.
    return tree.flatMap((genre) =>
      genre.subgenres.map(({ id, name }) => ({ id, name, parentId: genre.id })),
    );
  });

  /** Offered when the typed name matches no option exactly: one per genre, for a subgenre. */
  protected readonly createOptions = computed<readonly CreateOption[]>(() => {
    const name = this.term().trim();
    const typed = normalize(name);
    if (typed.length === 0 || this.options().some((entry) => normalize(entry.name) === typed)) {
      return [];
    }
    if (this.source() !== 'subgenres') {
      return [{ id: CREATE_ID, label: `＋ Cadastrar “${name}”`, parentId: null }];
    }
    const parents = this.parents();
    return parents.map((parent, index) => ({
      id: CREATE_ID - index,
      label:
        parents.length > 1 ? `＋ Cadastrar “${name}” em ${parent.name}` : `＋ Cadastrar “${name}”`,
      parentId: parent.id,
    }));
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
    const creating = this.createOptions().find((option) => option.id === id);
    const entry = creating
      ? await this.create(creating.parentId)
      : this.options().find((o) => o.id === id);
    if (entry) {
      this.picked.emit(entry);
      this.term.set('');
      this.expanded.set(false);
    }
  }

  private async create(parentId: number | null): Promise<PickedEntry | undefined> {
    const name = this.term().trim();
    const source = this.source();
    this.creating.set(true);
    try {
      if (source === 'genres' || source === 'subgenres') {
        const created = await firstValueFrom(this.catalogApi.createGenre(name, parentId));
        return { ...created, parentId };
      }
      return await firstValueFrom(this.catalogApi.create(source, name));
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
      return undefined;
    } finally {
      this.creating.set(false);
    }
  }
}

/** Same idea as the back-end's TextNormalizer: no accents, no case, single spaces. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
