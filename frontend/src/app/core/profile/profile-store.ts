import { inject, Injectable, signal } from '@angular/core';
import { ProfileApi, ProfileRequest, ProfileResponse } from '@core/api/profile-api';
import { ThemePreference, ThemeStore } from '@core/theme/theme-store';
import { firstValueFrom } from 'rxjs';

/**
 * The profile shared by the whole app: the header shows the avatar and switches the theme, the
 * Perfil page changes everything.
 *
 * <p>The official theme is the one in the profile. The ThemeStore keeps a copy in the browser so
 * the page opens with the right colors before the profile arrives (docs/arquitetura-front-end.md).
 * The app loads the profile once when it starts (app.config.ts).
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api = inject(ProfileApi);
  private readonly theme = inject(ThemeStore);

  private readonly state = signal<ProfileResponse | undefined>(undefined);

  /** Undefined until the API answers, and while it cannot. */
  readonly profile = this.state.asReadonly();

  async load(): Promise<void> {
    try {
      const profile = await firstValueFrom(this.api.get());
      this.state.set(profile);
      this.theme.setPreference(profile.theme);
    } catch {
      // Without the API the app keeps the theme it remembers; nothing else depends on this.
    }
  }

  /**
   * The colors change at once and the choice is saved next. If saving fails, the colors go back,
   * since the next visit would open with the old theme anyway.
   *
   * @throws the error of the API, after going back
   */
  async changeTheme(preference: ThemePreference): Promise<void> {
    const previous = this.theme.preference();
    this.theme.setPreference(preference);
    try {
      await this.save({ displayName: this.state()?.displayName, theme: preference });
    } catch (error) {
      this.theme.setPreference(previous);
      throw error;
    }
  }

  async save(request: ProfileRequest): Promise<ProfileResponse> {
    const saved = await firstValueFrom(this.api.update(request));
    this.state.set(saved);
    this.theme.setPreference(saved.theme);
    return saved;
  }

  async replaceAvatar(file: File): Promise<void> {
    const { avatarUrl } = await firstValueFrom(this.api.uploadAvatar(file));
    this.state.update((profile) => profile && { ...profile, avatarUrl });
  }

  async removeAvatar(): Promise<void> {
    await firstValueFrom(this.api.removeAvatar());
    this.state.update((profile) => profile && { ...profile, avatarUrl: undefined });
  }
}

/** First letter of the name, for the avatar without a photo. */
export function initialOf(name: string | null | undefined): string | undefined {
  const first = name?.trim().charAt(0);
  return first ? first.toLocaleUpperCase('pt-BR') : undefined;
}
