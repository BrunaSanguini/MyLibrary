import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FieldTree, form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { ApiError } from '@core/api/api-error';
import { BookListResponse, ListsApi } from '@core/api/lists-api';
import { Button } from '@shared/ui/button/button';
import { firstValueFrom } from 'rxjs';

interface ListModel {
  name: string;
  description: string;
}

const EMPTY: ListModel = { name: '', description: '' };

/**
 * Name and description of a list, to create one or to change the one given in `list`.
 *
 * <p>What the server refuses, such as a name another list already has, shows at the top with the
 * detail it wrote.
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
  /** Only offered when changing a list, where the form opens over the page. */
  readonly cancelled = output();

  private readonly listsApi = inject(ListsApi);

  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly model = signal<ListModel>(EMPTY);

  protected readonly listForm = form(this.model, (list) => {
    required(list.name, { message: 'Dê um nome à lista.' });
    maxLength(list.name, 120, { message: 'O nome tem no máximo 120 caracteres.' });
    maxLength(list.description, 1000, { message: 'A descrição tem no máximo 1.000 caracteres.' });
  });

  constructor() {
    effect(() => {
      const list = this.list();
      if (list) {
        this.model.set({ name: list.name, description: list.description ?? '' });
      }
    });
  }

  protected errorOf(field: FieldTree<unknown>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.failure.set(undefined);
    await submit(this.listForm, async () => {
      const { name, description } = this.model();
      const request = { name: name.trim(), description: description.trim() || undefined };
      const current = this.list();
      try {
        const saved = await firstValueFrom(
          current ? this.listsApi.update(current.id, request) : this.listsApi.create(request),
        );
        if (!current) {
          this.model.set(EMPTY);
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
