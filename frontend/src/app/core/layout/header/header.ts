import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { initialOf, ProfileStore } from '@core/profile/profile-store';
import { ThemeStore } from '@core/theme/theme-store';
import { Icon } from '@shared/ui/icon/icon';

import { SearchPanel } from '../search-panel/search-panel';

interface MenuItem {
  readonly path: string;
  readonly label: string;
  readonly exact: boolean;
}

@Component({
  selector: 'ml-header',
  imports: [RouterLink, RouterLinkActive, Icon, SearchPanel],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly theme = inject(ThemeStore);
  private readonly profiles = inject(ProfileStore);

  protected readonly menu: readonly MenuItem[] = [
    { path: '/', label: 'Início', exact: true },
    { path: '/estante', label: 'Minha Estante', exact: false },
    { path: '/listas', label: 'Listas', exact: false },
    { path: '/metas', label: 'Metas', exact: false },
    { path: '/catalogos', label: 'Catálogos', exact: false },
  ];

  protected readonly dark = computed(() => this.theme.resolved() === 'dark');
  protected readonly avatarUrl = computed(() => this.profiles.profile()?.avatarUrl);
  protected readonly initial = computed(() => initialOf(this.profiles.profile()?.displayName));

  /** Saved in the profile, so it holds in every tab and on the next visit. */
  protected toggleTheme(): void {
    this.profiles.changeTheme(this.dark() ? 'LIGHT' : 'DARK').catch(() => {
      // The store already went back to the previous theme; the button shows it again.
    });
  }
}
