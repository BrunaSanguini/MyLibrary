import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiError } from '@core/api/api-error';
import { GoalResponse, GoalsApi } from '@core/api/goals-api';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';
import { ProgressBar } from '@shared/ui/progress-bar/progress-bar';
import { firstValueFrom } from 'rxjs';

import { goalProgress, goalTitle } from '@core/api/goal-labels';

const LARGEST_TARGET = 1_000_000;

/**
 * One goal and how far it is. The target is the only thing that can be changed, right on the
 * card; a goal of the wrong type or period is deleted and created again.
 */
@Component({
  selector: 'ml-goal-card',
  imports: [Button, Icon, ProgressBar],
  templateUrl: './goal-card.html',
  styleUrl: './goal-card.css',
})
export class GoalCard {
  readonly goal = input.required<GoalResponse>();

  /** The target was saved; the page fetches the goals again. */
  readonly changed = output();
  /** The page confirms before deleting. */
  readonly deleteRequested = output();

  private readonly goalsApi = inject(GoalsApi);

  protected readonly title = computed(() => goalTitle(this.goal()));
  protected readonly progress = computed(() => goalProgress(this.goal()));
  protected readonly reached = computed(() => this.goal().current >= this.goal().target);

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly draft = signal('');
  protected readonly error = signal<string | undefined>(undefined);

  protected edit(): void {
    this.draft.set(String(this.goal().target));
    this.error.set(undefined);
    this.editing.set(true);
  }

  protected type(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const target = Number(this.draft());
    if (this.draft().trim() === '' || !Number.isInteger(target) || target <= 0) {
      this.error.set('Use um número inteiro maior que zero.');
      return;
    }
    if (target > LARGEST_TARGET) {
      this.error.set('A meta vai até 1.000.000.');
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.goalsApi.changeTarget(this.goal().id, target));
      this.editing.set(false);
      this.changed.emit();
    } catch (failure) {
      this.error.set(ApiError.from(failure).detail);
    } finally {
      this.saving.set(false);
    }
  }
}
