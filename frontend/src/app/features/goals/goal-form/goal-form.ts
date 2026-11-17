import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FieldTree, form, FormField, submit, validate } from '@angular/forms/signals';
import { ApiError } from '@core/api/api-error';
import { GOAL_TYPES, GoalPeriod, GoalsApi, GoalType } from '@core/api/goals-api';
import { Button } from '@shared/ui/button/button';
import { firstValueFrom } from 'rxjs';

import { GOAL_TYPE_LABELS, MONTHS } from '../goal-labels';

interface GoalModel {
  type: GoalType;
  period: GoalPeriod;
  /** The select hands its value as text. */
  month: string;
  target: number | null;
}

const LARGEST_TARGET = 1_000_000;

/**
 * Creates a goal for the year the page is showing: what it counts, whether it is for the whole
 * year or for one month, and how much.
 *
 * <p>Rereads are only counted by year, so that type hides the choice of period instead of
 * offering one the server would refuse. A second goal of the same type and period comes back as
 * a conflict and shows at the top with the detail the server wrote.
 */
@Component({
  selector: 'ml-goal-form',
  imports: [Button, FormField],
  templateUrl: './goal-form.html',
  styleUrl: './goal-form.css',
})
export class GoalForm {
  readonly year = input.required<number>();
  /** The month a monthly goal starts on, 1 to 12. */
  readonly currentMonth = input.required<number>();

  readonly saved = output();

  private readonly goalsApi = inject(GoalsApi);

  protected readonly types = GOAL_TYPES.map((value) => ({ value, label: GOAL_TYPE_LABELS[value] }));
  protected readonly months = MONTHS;
  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly confirmation = signal<string | undefined>(undefined);

  protected readonly model = signal<GoalModel>({
    type: 'BOOKS',
    period: 'YEAR',
    month: '',
    target: null,
  });

  protected readonly goalForm = form(this.model, (goal) => {
    validate(goal.target, ({ value }) => {
      const target = value();
      if (target === null) {
        return { kind: 'required', message: 'Informe o número da meta.' };
      }
      if (!Number.isInteger(target) || target <= 0) {
        return { kind: 'positive', message: 'Use um número inteiro maior que zero.' };
      }
      return target > LARGEST_TARGET
        ? { kind: 'max', message: 'A meta vai até 1.000.000.' }
        : undefined;
    });
  });

  /** Rereads have no monthly goal. */
  protected readonly yearlyOnly = computed(() => this.model().type === 'REREADS');
  protected readonly monthly = computed(
    () => !this.yearlyOnly() && this.model().period === 'MONTH',
  );

  protected readonly targetLabel = computed(() => {
    switch (this.model().type) {
      case 'BOOKS':
        return 'Quantos livros?';
      case 'PAGES':
        return 'Quantas páginas?';
      case 'REREADS':
        return 'Quantas releituras?';
    }
  });

  constructor() {
    // The month starts as the current one, and only while the person has not picked another.
    effect(() => {
      const month = String(this.currentMonth());
      if (this.model().month === '') {
        this.goalForm.month().value.set(month);
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
    this.confirmation.set(undefined);
    await submit(this.goalForm, async () => {
      const { type, month, target } = this.model();
      const monthly = this.monthly();
      try {
        await firstValueFrom(
          this.goalsApi.create({
            type,
            period: monthly ? 'MONTH' : 'YEAR',
            year: this.year(),
            month: monthly ? Number(month) : undefined,
            target: target ?? 0,
          }),
        );
        this.goalForm.target().value.set(null);
        this.goalForm().reset();
        this.confirmation.set('Meta criada.');
        this.saved.emit();
      } catch (error) {
        this.failure.set(ApiError.from(error).detail);
      }
      return undefined;
    });
  }
}
