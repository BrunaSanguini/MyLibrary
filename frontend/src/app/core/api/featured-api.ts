import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { components } from './schema';

type Schemas = components['schemas'];

export type FeaturedBook = Schemas['FeaturedBookResponse'];
export type FeaturedSlot = Schemas['FeaturedSlotRequest'];

/** The Home features one to three books. */
export const MOST_FEATURED = 3;

/**
 * The books featured on the Home, each with the image the reader sent for its slot. Chosen in
 * Configurações → Destaques da Home.
 */
@Injectable({ providedIn: 'root' })
export class FeaturedApi {
  private readonly http = inject(HttpClient);

  /** In the order of the Home; empty until the reader chooses them. */
  listRequest(): HttpResourceRequest {
    return { url: '/api/v1/featured' };
  }

  /**
   * Replaces every slot. `imageFrom` says which slot, before the change, a slot keeps the image
   * of; without it the slot waits for an image.
   */
  replace(slots: readonly FeaturedSlot[]): Observable<FeaturedBook[]> {
    return this.http.put<FeaturedBook[]>('/api/v1/featured', { slots });
  }

  sendImage(slot: number, file: Blob): Observable<FeaturedBook> {
    const body = new FormData();
    body.append('file', file);
    return this.http.put<FeaturedBook>(`/api/v1/featured/${slot}/image`, body);
  }
}
