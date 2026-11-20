import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { initialOf, ProfileStore } from '@core/profile/profile-store';
import { ThemeStore } from '@core/theme/theme-store';
import { Crest } from '@shared/ui/crest/crest';
import { Icon } from '@shared/ui/icon/icon';
import { Wordmark } from '@shared/ui/wordmark/wordmark';
import { filter, map } from 'rxjs';

import { SearchPanel } from '../search-panel/search-panel';

interface MenuItem {
  readonly path: string;
  readonly label: string;
  /** The item is the current one on its own page and on the pages that belong to it. */
  readonly areas: readonly string[];
}

/** The address without the query string and the fragment. */
function pathOf(url: string): string {
  return url.replace(/[?#].*$/, '');
}

@Component({
  selector: 'ml-header',
  imports: [RouterLink, Icon, SearchPanel, Crest, Wordmark],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeStore);
  private readonly profiles = inject(ProfileStore);

  /** The Home has no area besides itself: "/" is a prefix of every address. */
  protected readonly menu: readonly MenuItem[] = [
    { path: '/', label: 'Home', areas: [] },
    { path: '/estante', label: 'Minha Estante', areas: ['/estante', '/livro'] },
    { path: '/listas', label: 'Listas', areas: ['/listas', '/lista'] },
    {
      path: '/catalogos',
      label: 'Catálogos',
      areas: ['/catalogos', '/autor', '/serie', '/generos', '/editoras'],
    },
    { path: '/calendario', label: 'Calendário', areas: ['/calendario'] },
  ];

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => pathOf(event.urlAfterRedirects)),
    ),
    { initialValue: pathOf(this.router.url) },
  );

  protected readonly profileActive = computed(() => this.currentPath() === '/perfil');
  /** Configurações is the only page where the gear is the current item; no menu item is. */
  protected readonly settingsActive = computed(() => this.currentPath() === '/configuracoes');
  protected readonly dark = computed(() => this.theme.resolved() === 'dark');
  protected readonly avatarUrl = computed(() => this.profiles.profile()?.avatarUrl);
  protected readonly initial = computed(() => initialOf(this.profiles.profile()?.displayName));

  protected isCurrent(item: MenuItem): boolean {
    const path = this.currentPath();
    if (item.path === '/') {
      return path === '/';
    }
    return item.areas.some((area) => path === area || path.startsWith(`${area}/`));
  }

  /** Saved in the profile, so it holds in every tab and on the next visit. */
  protected toggleTheme(): void {
    this.profiles.changeTheme(this.dark() ? 'LIGHT' : 'DARK').catch(() => {
      // The store already went back to the previous theme; the button shows it again.
    });
  }
}
