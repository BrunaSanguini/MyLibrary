import { Injectable } from '@angular/core';
import { HttpResourceRequest } from '@angular/common/http';

import { components } from './schema';

export type GenreTreeResponse = components['schemas']['GenreTreeResponse'];

@Injectable({ providedIn: 'root' })
export class GenresApi {
  /** The whole tree in one request: genres with their subgenres, already in alphabetical order. */
  treeRequest(): HttpResourceRequest {
    return { url: '/api/v1/genres' };
  }
}
