import { HttpResourceRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IsoDate } from '@core/time/today';

import { components } from './schema';

type Schemas = components['schemas'];

export type StatsOverview = Schemas['StatsOverviewResponse'];
export type DailyPages = Schemas['DailyPagesResponse'];
export type BookTime = Schemas['BookTimeResponse'];

/** The API answers 400 for a longer period. */
export const LONGEST_STATS_PERIOD = 366;

/** Reading statistics of the profile, calculated by the API on every request. */
@Injectable({ providedIn: 'root' })
export class StatsApi {
  overviewRequest(year: number, month: number): HttpResourceRequest {
    return { url: '/api/v1/stats/overview', params: { year, month } };
  }

  /** Only the days with reading come back. */
  dailyPagesRequest(from: IsoDate, to: IsoDate): HttpResourceRequest {
    return { url: '/api/v1/stats/daily-pages', params: { from, to } };
  }

  /** The books with more days first. */
  booksTimeRequest(from: IsoDate, to: IsoDate): HttpResourceRequest {
    return { url: '/api/v1/stats/books-time', params: { from, to } };
  }
}
