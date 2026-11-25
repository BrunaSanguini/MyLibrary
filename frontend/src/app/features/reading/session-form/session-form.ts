import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FieldTree,
  form,
  FormField,
  maxLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { ApiError } from '@core/api/api-error';
import { ReadingApi, SessionRequest } from '@core/api/reading-api';
import { formatDayMonth, formatWeekday, IsoDate } from '@core/time/today';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { firstValueFrom } from 'rxjs';

/** The two ways of saying how much was read, which are the two fields of the API. */
type PagesMode = 'pagesRead' | 'currentPage';

interface SessionModel {
  date: string;
  mode: PagesMode;
  amount: number | null;
  note: string;
}

const SHORTCUTS = [10, 25, 50] as const;

/**
 * Registers what was read on one day: the pages of the day or the page the reader stopped at,
 * with shortcuts for the usual amounts and an optional note.
 *
 * <p>The validation mirrors the back-end with what the page already knows (the pages read so far,
 * the size of the book, the start of the reading), so the usual mistakes are caught before the
 * request. What the server still refuses shows at the top with the detail it wrote.
 */
@Component({
  selector: 'ml-session-form',
  imports: [Button, FormField, Icon],
  templateUrl: './session-form.html',
  styleUrls: ['../reading-fields.css', './session-form.css'],
})
export class SessionForm {
  readonly readingId = input.required<number>();
  /** Pages of the reading so far, which "current page" has to be ahead of. */
  readonly pagesRead = input.required<number>();
  readonly pageCount = input.required<number>();
  readonly startDate = input<IsoDate | undefined>();
  readonly today = input.required<IsoDate>();
  /** The day picked in the week strip, which the field follows. */
  readonly day = input<IsoDate | undefined>();
  /** The reading was abandoned: saving a session takes it up again first. */
  readonly resumeFirst = input(false);

  /** A session was saved; the page fetches the reading again. */
  readonly saved = output();
  /** The reader picked another day in the field, which the week strip follows. */
  readonly dayChange = output<IsoDate>();

  private readonly readingApi = inject(ReadingApi);

  protected readonly shortcuts = SHORTCUTS;
  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly confirmation = signal<string | undefined>(undefined);

  protected readonly model = signal<SessionModel>({
    date: '',
    mode: 'pagesRead',
    amount: null,
    note: '',
  });

  protected readonly sessionForm = form(this.model, (session) => {
    required(session.date, { message: 'Informe o dia da leitura.' });
    validate(session.date, ({ value }) => {
      const start = this.startDate();
      if (value() !== '' && start && value() < start) {
        return { kind: 'period', message: 'A leitura começou depois desse dia.' };
      }
      return value() > this.today()
        ? { kind: 'future', message: 'O dia da leitura não pode ser no futuro.' }
        : undefined;
    });
    validate(session.amount, ({ value, valueOf }) =>
      this.amountError(valueOf(session.mode), value()),
    );
    maxLength(session.note, 2000, { message: 'A anotação tem no máximo 2.000 caracteres.' });
  });

  protected readonly amountLabel = computed(() =>
    this.model().mode === 'pagesRead' ? 'Páginas lidas neste dia' : 'Em que página você parou?',
  );

  protected readonly pagesLeft = computed(() => Math.max(0, this.pageCount() - this.pagesRead()));

  constructor() {
    // The day follows the strip of the week, and starts as today.
    effect(() => {
      const day = this.day() ?? this.today();
      untracked(() => this.sessionForm.date().value.set(day));
    });
  }

  /** The other mode starts from where the reader is: 0 pages, or the page already reached. */
  protected setMode(mode: PagesMode): void {
    this.model.update((model) => ({ ...model, mode, amount: null }));
  }

  /** − and +: one page at a time, inside the limits of the book. */
  protected stepAmount(delta: number): void {
    const { mode, amount } = this.model();
    const base = amount ?? (mode === 'currentPage' ? this.pagesRead() : 0);
    const limit = mode === 'currentPage' ? this.pageCount() : this.pagesLeft();
    const amountField = this.sessionForm.amount();
    amountField.value.set(Math.max(0, Math.min(base + delta, limit)));
    amountField.markAsDirty();
    amountField.markAsTouched();
  }

  protected pickDay(): void {
    const date = this.model().date;
    if (date !== '') {
      this.dayChange.emit(date);
    }
  }

  /**
   * Only what the person typed can be lost: the pages and the note. The day starts filled in and
   * the mode is a choice of how to type, so neither of them alone is worth asking about. The
   * form's own dirty flag is not used because the browser touches the date and radio fields while
   * they are first drawn, which made the page ask before leaving a reading just started.
   */
  hasUnsavedChanges(): boolean {
    const { amount, note } = this.model();
    return amount !== null || note.trim() !== '';
  }

  /** First message of a field, once the user has been there or tried to save. */
  protected errorOf(field: FieldTree<unknown>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  /**
   * Adds to what is typed. In "current page" an empty field starts from the page the reader is
   * on, so +25 means "25 pages ahead of where I was".
   */
  protected add(pages: number): void {
    const { mode, amount } = this.model();
    const base = amount ?? (mode === 'currentPage' ? this.pagesRead() : 0);
    const limit = mode === 'currentPage' ? this.pageCount() : this.pagesLeft();
    const amountField = this.sessionForm.amount();
    amountField.value.set(Math.min(base + pages, limit));
    amountField.markAsDirty();
    amountField.markAsTouched();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.failure.set(undefined);
    this.confirmation.set(undefined);
    await submit(this.sessionForm, async () => {
      const { date, mode, amount, note } = this.model();
      const request: SessionRequest = {
        date,
        [mode]: amount ?? undefined,
        note: note.trim() || undefined,
      };
      try {
        if (this.resumeFirst()) {
          await firstValueFrom(this.readingApi.resumeReading(this.readingId()));
        }
        const session = await firstValueFrom(this.readingApi.addSession(this.readingId(), request));
        this.model.set({ date, mode, amount: null, note: '' });
        this.sessionForm().reset();
        this.confirmation.set(
          `✦ +${session.pagesRead} ${session.pagesRead === 1 ? 'página' : 'páginas'} em ${formatWeekday(
            date,
          )}, ${formatDayMonth(date)}`,
        );
        this.saved.emit();
      } catch (error) {
        this.failure.set(ApiError.from(error).detail);
      }
      return undefined;
    });
  }

  private amountError(
    mode: PagesMode,
    amount: number | null,
  ): { kind: string; message: string } | undefined {
    if (amount === null) {
      return {
        kind: 'required',
        message:
          mode === 'pagesRead'
            ? 'Informe quantas páginas você leu.'
            : 'Informe em que página você está.',
      };
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return { kind: 'positive', message: 'Use um número inteiro maior que zero.' };
    }
    if (mode === 'pagesRead' && amount > this.pagesLeft()) {
      return {
        kind: 'exceeds',
        message: `Faltam ${this.pagesLeft()} páginas para o fim do livro.`,
      };
    }
    if (mode === 'currentPage' && amount > this.pageCount()) {
      return { kind: 'exceeds', message: `O livro tem ${this.pageCount()} páginas.` };
    }
    if (mode === 'currentPage' && amount <= this.pagesRead()) {
      return {
        kind: 'notAhead',
        message: `Você já registrou até a página ${this.pagesRead()}.`,
      };
    }
    return undefined;
  }
}
