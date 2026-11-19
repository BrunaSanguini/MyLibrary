import { Component, inject, OnInit, output, signal } from '@angular/core';
import { FieldTree, form, FormField, maxLength, submit } from '@angular/forms/signals';
import { ApiError } from '@core/api/api-error';
import { ProfileStore } from '@core/profile/profile-store';
import { ThemePreference } from '@core/theme/theme-store';
import { Button } from '@shared/ui/button/button';

interface ProfileModel {
  displayName: string;
  theme: ThemePreference;
}

/** Name and theme of the profile. The theme on the page changes only once it is saved. */
@Component({
  selector: 'ml-profile-form',
  imports: [Button, FormField],
  templateUrl: './profile-form.html',
  styleUrl: './profile-form.css',
})
export class ProfileForm implements OnInit {
  readonly saved = output();
  readonly cancelled = output();

  private readonly profiles = inject(ProfileStore);

  protected readonly themes: readonly { value: ThemePreference; label: string }[] = [
    { value: 'LIGHT', label: 'Claro' },
    { value: 'DARK', label: 'Escuro' },
  ];

  protected readonly failure = signal<string | undefined>(undefined);
  protected readonly model = signal<ProfileModel>({ displayName: '', theme: 'DARK' });
  protected readonly profileForm = form(this.model, (profile) => {
    maxLength(profile.displayName, 80, { message: 'O nome tem no máximo 80 caracteres.' });
  });

  ngOnInit(): void {
    const profile = this.profiles.profile();
    // Profiles saved with SYSTEM open as the dark theme, so the form shows it that way.
    this.model.set({
      displayName: profile?.displayName ?? '',
      theme: profile?.theme === 'LIGHT' ? 'LIGHT' : 'DARK',
    });
  }

  protected errorOf(field: FieldTree<unknown>): string | undefined {
    const state = field();
    return state.touched() ? state.errors()[0]?.message : undefined;
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.failure.set(undefined);
    await submit(this.profileForm, async () => {
      const { displayName, theme } = this.model();
      try {
        await this.profiles.save({ displayName: displayName.trim() || undefined, theme });
        this.saved.emit();
      } catch (error) {
        this.failure.set(ApiError.from(error).detail);
      }
      return undefined;
    });
  }
}
