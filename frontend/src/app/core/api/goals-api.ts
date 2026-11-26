import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { components } from './schema';

type Schemas = components['schemas'];

export type GoalResponse = Schemas['GoalResponse'];
export type GoalRequest = Schemas['GoalRequest'];
export type GoalType = GoalResponse['type'];
export type GoalPeriod = GoalResponse['period'];
export type DeadlineGoalResponse = Schemas['DeadlineGoalResponse'];
export type DeadlineGoalRequest = Schemas['DeadlineGoalRequest'];

export const GOAL_TYPES = ['BOOKS', 'PAGES', 'REREADS'] as const satisfies readonly GoalType[];

/** Reading goals by year, by month or with a deadline. The progress comes calculated in every answer. */
@Injectable({ providedIn: 'root' })
export class GoalsApi {
  private readonly http = inject(HttpClient);

  /** The yearly goals first, then the monthly ones month by month. */
  listRequest(year: number): HttpResourceRequest {
    return { url: '/api/v1/goals', params: { year } };
  }

  create(request: GoalRequest): Observable<GoalResponse> {
    return this.http.post<GoalResponse>('/api/v1/goals', request);
  }

  /** The target is what changes in a goal, and whether it is on; without `enabled` it stays as it was. */
  changeTarget(id: number, target: number, enabled?: boolean): Observable<GoalResponse> {
    return this.http.put<GoalResponse>(`/api/v1/goals/${id}`, {
      target,
      ...(enabled === undefined ? {} : { enabled }),
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/goals/${id}`);
  }

  /** Every goal with a deadline, past, running and future: the one that ends first comes first. */
  deadlinesRequest(): HttpResourceRequest {
    return { url: '/api/v1/goals/deadlines' };
  }

  createDeadline(request: DeadlineGoalRequest): Observable<DeadlineGoalResponse> {
    return this.http.post<DeadlineGoalResponse>('/api/v1/goals/deadlines', request);
  }

  /** Replaces everything in the goal: what it counts, the target, the dates and the genre. */
  updateDeadline(id: number, request: DeadlineGoalRequest): Observable<DeadlineGoalResponse> {
    return this.http.put<DeadlineGoalResponse>(`/api/v1/goals/deadlines/${id}`, request);
  }

  deleteDeadline(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/goals/deadlines/${id}`);
  }
}
