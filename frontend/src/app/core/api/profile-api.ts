import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { components } from './schema';

type Schemas = components['schemas'];

export type ProfileResponse = Schemas['ProfileResponse'];
export type ProfileRequest = Schemas['ProfileRequest'];
export type AvatarResponse = Schemas['AvatarResponse'];

/** The single profile of the library: name, avatar and theme. */
@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);

  get(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>('/api/v1/profile');
  }

  update(request: ProfileRequest): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>('/api/v1/profile', request);
  }

  /** JPEG, PNG or WebP up to 5 MB, the same rules as the covers. */
  uploadAvatar(file: File): Observable<AvatarResponse> {
    const body = new FormData();
    body.append('file', file);
    return this.http.put<AvatarResponse>('/api/v1/profile/avatar', body);
  }

  removeAvatar(): Observable<void> {
    return this.http.delete<void>('/api/v1/profile/avatar');
  }
}
