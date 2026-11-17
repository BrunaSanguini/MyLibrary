import { httpResource } from '@angular/common/http';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '@core/api/api-error';
import { ReadingApi, ReviewsPage } from '@core/api/reading-api';
import { BookTime, DailyPages, StatsApi, StatsOverview } from '@core/api/stats-api';
import { initialOf, ProfileStore } from '@core/profile/profile-store';
import { CURRENT_HOUR, TODAY } from '@core/time/today';
import { BookCover } from '@shared/ui/book-cover/book-cover';
import { Button } from '@shared/ui/button/button';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { Icon } from '@shared/ui/icon/icon';
import { Skeleton } from '@shared/ui/skeleton/skeleton';

import { ProfileForm } from '../profile-form/profile-form';
import {
  formatNumber,
  greetingFor,
  heatStart,
  monthTitle,
  paceOf,
  plural,
  timeBars,
} from '../profile-stats';
import { ReadingHeatmap } from '../reading-heatmap/reading-heatmap';
import { WeekStrip } from '../week-strip/week-strip';

const REVIEWS = 4;

/**
 * Perfil: who reads, how much this month and this year, the latest reviews and how the reading
 * went in the last six months. Every number comes from what was registered on this computer.
 */
@Component({
  selector: 'ml-profile-page',
  imports: [
    BookCover,
    Button,
    ErrorState,
    Icon,
    ProfileForm,
    ReadingHeatmap,
    RouterLink,
    Skeleton,
    WeekStrip,
  ],
  templateUrl: './profile-page.html',
  styleUrls: ['./profile-page.css', './profile-sections.css'],
})
export default class ProfilePage {
  private readonly statsApi = inject(StatsApi);
  private readonly readingApi = inject(ReadingApi);
  private readonly profiles = inject(ProfileStore);
  private readonly hour = inject(CURRENT_HOUR);
  private readonly todayOf = inject(TODAY);

  private readonly avatarInput = viewChild<ElementRef<HTMLInputElement>>('avatarInput');

  protected readonly today = computed(() => this.todayOf());
  protected readonly year = computed(() => Number(this.today().slice(0, 4)));
  private readonly month = computed(() => Number(this.today().slice(5, 7)));
  private readonly from = computed(() => heatStart(this.today()));

  protected readonly profile = this.profiles.profile;
  protected readonly greeting = greetingFor(this.hour());
  protected readonly name = computed(() => this.profile()?.displayName ?? undefined);
  protected readonly initial = computed(() => initialOf(this.name()));

  protected readonly overview = httpResource<StatsOverview>(() =>
    this.statsApi.overviewRequest(this.year(), this.month()),
  );
  protected readonly daily = httpResource<DailyPages[]>(() =>
    this.statsApi.dailyPagesRequest(this.from(), this.today()),
  );
  private readonly booksTime = httpResource<BookTime[]>(() =>
    this.statsApi.booksTimeRequest(this.from(), this.today()),
  );
  protected readonly reviews = httpResource<ReviewsPage>(() =>
    this.readingApi.latestReviewsRequest(REVIEWS),
  );

  protected readonly errorMessage = computed(() => {
    const error: unknown = this.overview.error() ?? this.daily.error();
    return error === undefined ? undefined : ApiError.from(error).detail;
  });

  protected readonly kpis = computed(() => {
    const overview = this.overview.value();
    if (!overview) {
      return [];
    }
    return [
      { value: formatNumber(overview.finishedInMonth), label: 'Este mês' },
      { value: formatNumber(overview.finishedInYear), label: 'Este ano' },
      {
        value: overview.averageRating?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) ?? '–',
        label: 'Nota média',
      },
      { value: formatNumber(overview.rereadsInYear), label: 'Releituras' },
    ];
  });

  protected readonly monthLine = computed(() => {
    const finished = this.overview.value()?.finishedInMonth ?? 0;
    return finished === 0
      ? 'Nenhum livro terminado até agora.'
      : `${plural(finished, 'livro terminado', 'livros terminados')} até agora.`;
  });
  protected readonly monthName = computed(() => monthTitle(this.today()));

  protected readonly stats = computed(() => {
    const overview = this.overview.value();
    const days = this.daily.value()?.length ?? 0;
    return [
      { value: formatNumber(days), label: 'Dias com livro aberto' },
      { value: formatNumber(overview?.currentStreak ?? 0), label: 'Dias seguidos' },
      {
        value: formatNumber(overview?.finishedInYear ?? 0),
        label: `Livros terminados em ${this.year()}`,
      },
      { value: formatNumber(overview?.pagesInYear ?? 0), label: `Páginas em ${this.year()}` },
    ];
  });

  protected readonly bars = computed(() => timeBars(this.booksTime.value() ?? []));
  protected readonly pace = computed(() => {
    const overview = this.overview.value();
    return overview ? paceOf(overview) : [];
  });

  protected readonly editing = signal(false);
  protected readonly avatarBusy = signal(false);
  protected readonly avatarError = signal<string | undefined>(undefined);
  protected readonly plural = plural;

  protected ratingOf(rating: number | null | undefined): string | undefined {
    return rating == null
      ? undefined
      : rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  protected chooseAvatar(): void {
    this.avatarInput()?.nativeElement.click();
  }

  protected async sendAvatar(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    await this.changeAvatar(() => this.profiles.replaceAvatar(file));
  }

  protected async removeAvatar(): Promise<void> {
    await this.changeAvatar(() => this.profiles.removeAvatar());
  }

  private async changeAvatar(change: () => Promise<void>): Promise<void> {
    this.avatarError.set(undefined);
    this.avatarBusy.set(true);
    try {
      await change();
    } catch (error) {
      this.avatarError.set(ApiError.from(error).detail);
    } finally {
      this.avatarBusy.set(false);
    }
  }

  protected retry(): void {
    this.overview.reload();
    this.daily.reload();
    this.booksTime.reload();
  }
}
