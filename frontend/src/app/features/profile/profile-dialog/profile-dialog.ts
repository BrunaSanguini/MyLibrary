import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ApiError } from '@core/api/api-error';
import { initialOf, ProfileStore } from '@core/profile/profile-store';
import { TODAY } from '@core/time/today';
import { toRoman } from '@shared/format/roman';
import { Button } from '@shared/ui/button/button';
import { Icon } from '@shared/ui/icon/icon';

const NAME_MAX = 40;
const FIRST_YEAR = 1900;

/**
 * Editar perfil e foto (spec C.14): the photo, which changes at once, and the name and the year
 * the reader started, which change on Salvar perfil. The theme stays on the header.
 */
@Component({
  selector: 'ml-profile-dialog',
  imports: [Button, Icon],
  templateUrl: './profile-dialog.html',
  styleUrl: './profile-dialog.css',
})
export class ProfileDialog {
  private readonly profiles = inject(ProfileStore);
  private readonly todayOf = inject(TODAY);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('file');

  protected readonly nameMax = NAME_MAX;
  protected readonly firstYear = FIRST_YEAR;
  protected readonly thisYear = computed(() => Number(this.todayOf().slice(0, 4)));

  protected readonly profile = this.profiles.profile;
  protected readonly name = signal('');
  protected readonly since = signal('');
  protected readonly busy = signal(false);
  protected readonly photoBusy = signal(false);
  protected readonly savedNotice = signal(false);
  protected readonly failure = signal<string | undefined>(undefined);

  protected readonly initial = computed(
    () => initialOf(this.name()) ?? initialOf(this.profile()?.displayName),
  );

  protected readonly nameProblem = computed(() =>
    this.name().trim() ? undefined : 'O nome não pode ficar vazio.',
  );

  protected readonly sinceProblem = computed(() => {
    const text = this.since().trim();
    if (!text) {
      return undefined;
    }
    const year = Number(text);
    return Number.isInteger(year) && year >= FIRST_YEAR && year <= this.thisYear()
      ? undefined
      : `Use um ano de ${FIRST_YEAR} até ${this.thisYear()}.`;
  });

  /** `Aparece como MMXIX`. */
  protected readonly sinceHint = computed(() => {
    const year = Number(this.since().trim());
    return this.since().trim() && !this.sinceProblem()
      ? `Aparece como ${toRoman(year)}`
      : 'Em branco: o ano da primeira leitura registrada.';
  });

  show(): void {
    const profile = this.profile();
    this.name.set(profile?.displayName ?? '');
    this.since.set(profile?.readerSince ? String(profile.readerSince) : '');
    this.savedNotice.set(false);
    this.failure.set(undefined);
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected edit(field: 'name' | 'since', event: Event): void {
    (field === 'name' ? this.name : this.since).set(this.value(event));
    this.savedNotice.set(false);
  }

  protected choosePhoto(): void {
    this.fileInput().nativeElement.click();
  }

  protected async sendPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      await this.changePhoto(() => this.profiles.replaceAvatar(file));
    }
  }

  protected async removePhoto(): Promise<void> {
    await this.changePhoto(() => this.profiles.removeAvatar());
  }

  private async changePhoto(change: () => Promise<void>): Promise<void> {
    this.failure.set(undefined);
    this.photoBusy.set(true);
    try {
      await change();
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.photoBusy.set(false);
    }
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.nameProblem() || this.sinceProblem()) {
      return;
    }
    this.busy.set(true);
    this.failure.set(undefined);
    try {
      const since = this.since().trim();
      await this.profiles.save({
        displayName: this.name().trim(),
        theme: this.profile()?.theme ?? 'DARK',
        readerSince: since ? Number(since) : undefined,
      });
      this.savedNotice.set(true);
    } catch (error) {
      this.failure.set(ApiError.from(error).detail);
    } finally {
      this.busy.set(false);
    }
  }
}
