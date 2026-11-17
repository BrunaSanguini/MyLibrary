import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { GoalResponse, GoalsApi } from '@core/api/goals-api';
import { TODAY } from '@core/time/today';
import { Button } from '@shared/ui/button/button';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { firstValueFrom } from 'rxjs';

import { GoalCard } from '../goal-card/goal-card';
import { GoalForm } from '../goal-form/goal-form';
import { goalTitle } from '../goal-labels';

const FIRST_YEAR = 1900;
const LAST_YEAR = 2999;

/** `?ano=2025` from the URL; anything else is the current year. */
function toYear(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) {
    return undefined;
  }
  const year = Number(value);
  return year >= FIRST_YEAR && year <= LAST_YEAR ? year : undefined;
}

/**
 * Metas: the goals of one year, the yearly ones first and then month by month, each with its
 * progress. The year is in the address (`?ano=`), so going back and forth keeps it.
 */
@Component({
  selector: 'ml-goals-page',
  imports: [Button, ConfirmDialog, EmptyState, ErrorState, GoalCard, GoalForm, Icon, Skeleton],
  templateUrl: './goals-page.html',
  styleUrl: './goals-page.css',
})
export default class GoalsPage {
  readonly ano = input(undefined, { transform: toYear });

  private readonly router = inject(Router);
  private readonly goalsApi = inject(GoalsApi);
  private readonly today = inject(TODAY);

  private readonly deleteDialog = viewChild.required<ConfirmDialog>('deleteDialog');

  protected readonly currentYear = computed(() => Number(this.today().slice(0, 4)));
  protected readonly currentMonth = computed(() => Number(this.today().slice(5, 7)));
  protected readonly year = computed(() => this.ano() ?? this.currentYear());

  protected readonly goals = httpResource<GoalResponse[]>(() =>
    this.goalsApi.listRequest(this.year()),
  );

  protected readonly yearly = computed(() =>
    (this.goals.value() ?? []).filter((goal) => goal.period === 'YEAR'),
  );
  protected readonly monthly = computed(() =>
    (this.goals.value() ?? []).filter((goal) => goal.period === 'MONTH'),
  );

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.goals.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected readonly toDelete = signal<GoalResponse | undefined>(undefined);
  protected readonly deleteTitle = computed(() => {
    const goal = this.toDelete();
    return goal ? `Excluir a meta de ${goalTitle(goal)}?` : '';
  });
  protected readonly deleting = signal(false);
  protected readonly failure = signal<string | undefined>(undefined);

  protected readonly placeholders = [0, 1];

  protected goToYear(year: number): void {
    void this.router.navigate([], {
      queryParams: { ano: year === this.currentYear() ? null : year },
    });
  }

  protected askToDelete(goal: GoalResponse): void {
    this.toDelete.set(goal);
    this.deleteDialog().open();
  }

  protected async delete(): Promise<void> {
    const goal = this.toDelete();
    if (!goal) {
      return;
    }
    this.failure.set(undefined);
    this.deleting.set(true);
    try {
      await firstValueFrom(this.goalsApi.delete(goal.id));
      this.goals.reload();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.deleting.set(false);
      this.deleteDialog().close();
      this.toDelete.set(undefined);
    }
  }
}
