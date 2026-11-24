import { httpResource } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  afterNextRender,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ApiError } from '@core/api/api-error';
import { FeaturedApi, FeaturedBook, MOST_FEATURED } from '@core/api/featured-api';
import { BookCardResponse, ShelfApi } from '@core/api/shelf-api';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { toRoman } from '@shared/format/roman';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { firstValueFrom } from 'rxjs';

/** The book of a slot, as the row shows it. */
interface SlotBook {
  readonly id: number;
  readonly title: string;
  readonly authors: readonly string[];
  readonly coverUrl?: string | null;
}

/** A slot as it is on the screen, before it is saved. */
interface SlotDraft {
  /** Only to track the row while slots come and go. */
  readonly key: number;
  readonly book: SlotBook;
  /** The slot, as saved, whose image this one still shows; gone once a new image is chosen. */
  readonly imageFrom?: number;
  readonly imageUrl?: string | null;
  /** A new image, sent after the slots are saved. */
  readonly file?: File;
  readonly preview?: string;
}

/** Which slot the picker chooses a book for; `new` adds one. */
type Picking = number | 'new' | undefined;

let nextKey = 0;

/**
 * Destaques da Home: one to three books of the collection for the hero of the Home, each with an
 * image the reader sends. Nothing is saved until "Salvar destaques"; then the slots go first and
 * the new images after them.
 *
 * <p>The image belongs to the slot: changing the book of a slot keeps its image.
 */
@Component({
  selector: 'ml-featured-settings',
  imports: [BookCover, Button, Icon],
  templateUrl: './featured-settings.html',
  styleUrl: './featured-settings.css',
})
export class FeaturedSettings implements HasUnsavedChanges {
  private readonly featuredApi = inject(FeaturedApi);
  private readonly shelfApi = inject(ShelfApi);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly most = MOST_FEATURED;
  protected readonly toRoman = toRoman;

  protected readonly saved = httpResource<FeaturedBook[]>(() => this.featuredApi.listRequest());

  /** Only books the reader has can be featured. */
  private readonly library = rxResource({ stream: () => this.shelfApi.allBooks() });

  private readonly initial = computed<readonly SlotDraft[]>(() =>
    (this.saved.hasValue() ? this.saved.value() : []).map((item) => ({
      key: nextKey++,
      book: {
        id: item.bookId,
        title: item.title,
        authors: item.authors,
        coverUrl: item.coverUrl,
      },
      imageFrom: item.slot,
      imageUrl: item.imageUrl,
    })),
  );

  protected readonly slots = linkedSignal(() => this.initial());
  protected readonly picking = signal<Picking>(undefined);
  protected readonly term = signal('');
  protected readonly tried = signal(false);
  protected readonly saving = signal(false);
  protected readonly flash = signal<string | undefined>(undefined);
  protected readonly warning = signal<string | undefined>(undefined);
  protected readonly failure = signal<string | undefined>(undefined);

  protected readonly missing = computed(
    () => this.slots().filter((slot) => !slot.file && !slot.imageUrl).length,
  );

  protected readonly missingText = computed(() => {
    const missing = this.missing();
    return missing === 1
      ? 'Falta 1 imagem para salvar os destaques.'
      : `Faltam ${missing} imagens para salvar os destaques.`;
  });

  protected readonly arrowsText = computed(() => {
    const count = this.slots().length;
    if (count === 0) {
      return 'Sem destaques, a Home mostra os seus favoritos.';
    }
    return count === 1
      ? '1 destaque: a Home não mostra setas.'
      : `${count} destaques: a Home mostra as setas ‹ › para trocar de livro.`;
  });

  protected readonly dirty = computed(() => {
    const now = this.slots();
    const start = this.initial();
    return (
      now.length !== start.length ||
      now.some(
        (slot, index) =>
          Boolean(slot.file) ||
          slot.book.id !== start[index]?.book.id ||
          slot.imageFrom !== start[index]?.imageFrom,
      )
    );
  });

  /** The books the picker offers: the ones the reader has, not featured in another slot. */
  protected readonly choices = computed(() => {
    const picking = this.picking();
    const taken = new Set(
      this.slots()
        .filter((_, index) => index !== picking)
        .map((slot) => slot.book.id),
    );
    const term = normalize(this.term());
    return (this.library.hasValue() ? this.library.value() : []).filter(
      (book) =>
        book.ownership === 'OWNED' &&
        !taken.has(book.id) &&
        (term === '' || normalize(`${book.title} ${book.authors.join(' ')}`).includes(term)),
    );
  });

  protected readonly pickTitle = computed(() => {
    const picking = this.picking();
    return typeof picking === 'number'
      ? `Trocar o livro do destaque ${toRoman(picking + 1)}`
      : 'Escolher o livro do novo destaque';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.slots().forEach(revoke));
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  discard(): void {
    this.slots().forEach(revoke);
    this.slots.set(this.initial());
    this.tried.set(false);
    this.picking.set(undefined);
  }

  protected pick(picking: Exclude<Picking, undefined>): void {
    this.warning.set(undefined);
    this.term.set('');
    this.picking.set(picking);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLInputElement>('#busca-destaque')?.focus(),
      { injector: this.injector },
    );
  }

  protected closePicker(): void {
    this.picking.set(undefined);
  }

  protected typeTerm(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
  }

  /** A new slot waits for its image; a slot that changes book keeps the one it had. */
  protected choose(book: BookCardResponse): void {
    const picking = this.picking();
    const chosen: SlotBook = {
      id: book.id,
      title: book.title,
      authors: book.authors,
      coverUrl: book.coverUrl,
    };
    if (picking === 'new') {
      this.slots.update((slots) => [...slots, { key: nextKey++, book: chosen }]);
    } else if (picking !== undefined) {
      this.slots.update((slots) =>
        slots.map((slot, index) => (index === picking ? { ...slot, book: chosen } : slot)),
      );
    }
    this.flash.set(undefined);
    this.picking.set(undefined);
  }

  protected chooseImage(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.flash.set(undefined);
    this.slots.update((slots) =>
      slots.map((slot, at) => {
        if (at !== index) {
          return slot;
        }
        revoke(slot);
        return {
          key: slot.key,
          book: slot.book,
          file,
          preview: URL.createObjectURL(file),
        };
      }),
    );
  }

  /** The Home needs one book at least. */
  protected remove(index: number): void {
    if (this.slots().length === 1) {
      this.warning.set(
        'A Home precisa de pelo menos 1 destaque. Use “Trocar livro” para mudar o único destaque.',
      );
      return;
    }
    this.warning.set(undefined);
    this.flash.set(undefined);
    this.slots.update((slots) =>
      slots.filter((slot, at) => {
        if (at === index) {
          revoke(slot);
        }
        return at !== index;
      }),
    );
  }

  protected async save(): Promise<void> {
    this.tried.set(true);
    this.flash.set(undefined);
    this.failure.set(undefined);
    if (this.missing() > 0 || this.slots().length === 0) {
      return;
    }
    const slots = this.slots();
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.featuredApi.replace(
          slots.map((slot) => ({
            bookId: slot.book.id,
            ...(slot.file || slot.imageFrom === undefined ? {} : { imageFrom: slot.imageFrom }),
          })),
        ),
      );
      for (const [index, slot] of slots.entries()) {
        if (slot.file) {
          await firstValueFrom(this.featuredApi.sendImage(index + 1, slot.file));
        }
      }
      this.tried.set(false);
      const books = slots.length === 1 ? '1 livro' : `${slots.length} livros`;
      this.flash.set(
        `Destaques salvos. A Home agora mostra ${books}${slots.length > 1 ? ', com setas para trocar.' : ', sem setas.'}`,
      );
      this.saved.reload();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
      this.saved.reload();
    } finally {
      this.saving.set(false);
    }
  }
}

function revoke(slot: SlotDraft): void {
  if (slot.preview) {
    URL.revokeObjectURL(slot.preview);
  }
}

/** "Anéis" and "aneis" are the same search. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
