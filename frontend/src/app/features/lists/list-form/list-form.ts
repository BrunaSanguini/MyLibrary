import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FieldTree, form, FormField, submit, validate } from '@angular/forms/signals';
import { ApiError } from '@core/api/api-error';
import { BookListResponse, ListColor, ListsApi } from '@core/api/lists-api';
import { Button } from '@shared/ui/button/button';
import { firstValueFrom } from 'rxjs';

import { DEFAULT_LIST_COLOR, LIST_COLORS } from '../list-colors';

interface ListModel {
  name: string;
  description: string;
}

const EMPTY: ListModel = { name: '', description: '' };

const MAX_NAME = 60;
const MAX_DESCRIPTION = 140;

/** How the arrows move through the swatches: right and down go forward, left and up back. */
const ARROW_STEPS: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Name, description and cover colour of a list, to create one or to change the one given in `list`.
 *
 * <p>A blank name, a name or a description that is too long and what the server refuses, such as a
 * name another list already has, share one message at the end of the colour row. Escape and
 * "Cancelar" close the form without saving.
 */
@Component({
  selector: 'ml-list-form',
  imports: [Button, FormField],
  templateUrl: './list-form.html',
  styleUrl: './list-form.css',
})
export class ListForm {
  /** The list being changed; without it the form creates one. */
  readonly list = input<BookListResponse>();

  readonly saved = output<BookListResponse>();
  readonly cancelled = output();

  private readonly listsApi = inject(ListsApi);
  private readonly nameField = viewChild.required<ElementRef<HTMLInputElement>>('nameField');

  protected readonly colors = LIST_COLORS;
  protected readonly color = signal<ListColor>(DEFAULT_LIST_COLOR);
  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly model = signal<ListModel>(EMPTY);

  protected readonly listForm = form(this.model, (list) => {
    validate(list.name, ({ value }) => {
      const length = value().trim().length;
      if (length === 0) {
        return { kind: 'required', message: 'Dê um nome à lista.' };
      }
      return length > MAX_NAME
        ? { kind: 'maxLength', message: `O nome tem no máximo ${MAX_NAME} caracteres.` }
        : undefined;
    });
    validate(list.description, ({ value }) =>
      value().trim().length > MAX_DESCRIPTION
        ? {
            kind: 'maxLength',
            message: `A descrição tem no máximo ${MAX_DESCRIPTION} caracteres.`,
          }
        : undefined,
    );
  });

  protected readonly nameError = computed(() => this.errorOf(this.listForm.name));
  protected readonly descriptionError = computed(() => this.errorOf(this.listForm.description));
  /** One message at a time, the server's first: it is the one that came from the last try. */
  protected readonly message = computed(
    () => this.failure() ?? this.nameError() ?? this.descriptionError(),
  );

  constructor() {
    effect(() => {
      const list = this.list();
      if (list) {
        this.model.set({ name: list.name, description: list.description ?? '' });
        this.color.set(list.color);
      }
    });
    // The form opens on demand, so the person starts typing at once.
    afterNextRender(() => this.nameField().nativeElement.focus());
  }

  protected errorOf(field: FieldTree<unknown>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  protected pick(color: ListColor): void {
    this.color.set(color);
  }

  /** A group of radio buttons has one stop; the arrows choose within it and carry the focus. */
  protected moveColor(event: KeyboardEvent): void {
    const step = ARROW_STEPS[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const current = this.colors.findIndex((option) => option.id === this.color());
    const next = (current + step + this.colors.length) % this.colors.length;
    this.color.set(this.colors[next]!.id);
    const group = (event.currentTarget as HTMLElement).closest('[role="radiogroup"]');
    group?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.failure.set(undefined);
    await submit(this.listForm, async () => {
      const { name, description } = this.model();
      const request = {
        name: name.trim(),
        description: description.trim() || undefined,
        color: this.color(),
      };
      const current = this.list();
      try {
        const saved = await firstValueFrom(
          current ? this.listsApi.update(current.id, request) : this.listsApi.create(request),
        );
        if (!current) {
          this.model.set(EMPTY);
          this.color.set(DEFAULT_LIST_COLOR);
          this.listForm().reset();
        }
        this.saved.emit(saved);
      } catch (error) {
        this.failure.set(ApiError.from(error).detail);
      }
      return undefined;
    });
  }
}
