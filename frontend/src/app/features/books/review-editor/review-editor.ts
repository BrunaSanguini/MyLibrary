import {
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
import { FieldTree, form, FormField, maxLength, submit, validate } from '@angular/forms/signals';
import { ApiError } from '@core/api/api-error';
import { ReadingApi, ReviewResponse } from '@core/api/reading-api';
import { formatNumericDate } from '@core/time/today';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { RatingInput } from '@shared/ui/rating-input/rating-input';
import { firstValueFrom } from 'rxjs';

const MAX_LENGTH = 20_000;

interface ReviewModel {
  /** 1 to 5 in half points; null is "no rating". */
  rating: number | null;
  content: string;
}

/**
 * The review of a book: the card with the text, and the editor in a modal over the page.
 *
 * <p>A book without review is the normal start, so the card is an invitation to write one, never
 * an error. The page owns the review (the ficha shows its rating); this component saves or deletes
 * and tells the page with {@link changed}, which fetches it again. The text keeps its line breaks:
 * each one starts a paragraph, the first with a drop cap.
 *
 * <p>The form mirrors the back-end: the text has a maximum size and a review needs a rating, a
 * text or both (review.empty). The half points of the rating are what the rating input offers.
 */
@Component({
  selector: 'ml-review-editor',
  imports: [Button, FormField, Icon, RatingInput],
  templateUrl: './review-editor.html',
  styleUrl: './review-editor.css',
})
export class ReviewEditor {
  readonly bookId = input.required<number>();
  /** The saved review, or undefined while the book has none. */
  readonly review = input<ReviewResponse | undefined>();

  /** The review was saved or deleted. */
  readonly changed = output();

  private readonly readingApi = inject(ReadingApi);

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly failure = signal<string | undefined>(undefined);

  protected readonly model = signal<ReviewModel>({ rating: null, content: '' });
  protected readonly reviewForm = form(this.model, (review) => {
    maxLength(review.content, MAX_LENGTH, {
      message: 'A resenha tem no máximo 20.000 caracteres.',
    });
    validate(review.content, ({ value, valueOf }) =>
      valueOf(review.rating) === null && value().trim() === ''
        ? { kind: 'empty', message: 'Dê uma nota, escreva um texto ou os dois.' }
        : undefined,
    );
  });

  /** The stars change the model from code, which the form does not count as dirty. */
  private readonly ratingChanged = signal(false);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  /** `16/04/2026`, the day the review was last saved. */
  protected readonly writtenOn = computed(() => {
    const review = this.review();
    return review ? formatNumericDate(review.updatedAt.slice(0, 10)) : '';
  });

  /** One paragraph per line break of the text. */
  protected readonly paragraphs = computed(() =>
    (this.review()?.content ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== ''),
  );

  /** The API sends an absent rating as null. */
  protected readonly savedRating = computed(() => this.review()?.rating ?? undefined);
  protected readonly rating = computed(() => this.model().rating ?? undefined);

  constructor() {
    // Another book, or the review coming back from the server, leaves the edit mode behind.
    effect(() => {
      this.bookId();
      this.review();
      this.editing.set(false);
      this.failure.set(undefined);
      const dialog = this.dialog()?.nativeElement;
      if (dialog?.open) {
        dialog.close();
      }
    });
  }

  /** True while there is a review being written that was not saved. */
  hasUnsavedChanges(): boolean {
    return this.editing() && (this.reviewForm().dirty() || this.ratingChanged());
  }

  /** First message of a field, once the user has been there or tried to save. */
  protected errorOf(field: FieldTree<unknown>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  /** Opens the editor with the saved review, or empty for the first one. */
  edit(): void {
    this.model.set({
      rating: this.savedRating() ?? null,
      content: this.review()?.content ?? '',
    });
    this.reviewForm().reset();
    this.ratingChanged.set(false);
    this.failure.set(undefined);
    this.editing.set(true);
    this.dialog()?.nativeElement.showModal();
  }

  protected cancel(): void {
    this.dialog()?.nativeElement.close();
  }

  /** Escape, Cancelar or a save: the editor is gone, whatever closed it. */
  protected closed(): void {
    this.editing.set(false);
    this.failure.set(undefined);
  }

  protected rate(rating: number | undefined): void {
    this.reviewForm.rating().value.set(rating ?? null);
    this.ratingChanged.set(true);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.reviewForm, async () => {
      const { rating, content } = this.model();
      await this.send(() =>
        firstValueFrom(
          this.readingApi.saveReview(this.bookId(), {
            rating: rating ?? undefined,
            content: content.trim() || undefined,
          }),
        ),
      );
      return undefined;
    });
  }

  protected async delete(): Promise<void> {
    await this.send(() => firstValueFrom(this.readingApi.deleteReview(this.bookId())));
  }

  private async send(request: () => Promise<unknown>): Promise<void> {
    this.saving.set(true);
    this.failure.set(undefined);
    try {
      await request();
      this.dialog()?.nativeElement.close();
      this.changed.emit();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.saving.set(false);
    }
  }
}
