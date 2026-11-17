import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { components } from './schema';

type Schemas = components['schemas'];

export type GoalResponse = Schemas['GoalResponse'];
export type GoalRequest = Schemas['GoalRequest'];
export type GoalType = GoalResponse['type'];
export type GoalPeriod = GoalResponse['period'];

export const GOAL_TYPES = ['BOOKS', 'PAGES', 'REREADS'] as const satisfies readonly GoalType[];

/** Reading goals by year or month. The progress comes calculated in every answer. */
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

  /** The target is the only thing that changes in a goal. */
  changeTarget(id: number, target: number): Observable<GoalResponse> {
    return this.http.put<GoalResponse>(`/api/v1/goals/${id}`, { target });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/goals/${id}`);
  }
}
