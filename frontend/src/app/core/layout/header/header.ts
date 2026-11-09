import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeStore } from '@core/theme/theme-store';
import { Icon } from '@shared/ui/icon/icon';

interface MenuItem {
  readonly path: string;
  readonly label: string;
  readonly exact: boolean;
}

@Component({
  selector: 'ml-header',
  imports: [RouterLink, RouterLinkActive, Icon],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly theme = inject(ThemeStore);

  protected readonly menu: readonly MenuItem[] = [
    { path: '/', label: 'Início', exact: true },
    { path: '/estante', label: 'Minha Estante', exact: false },
    { path: '/listas', label: 'Listas', exact: false },
    { path: '/catalogos', label: 'Catálogos', exact: false },
  ];

  protected readonly dark = computed(() => this.theme.resolved() === 'dark');

  // The profile does not exist yet; once it does, the choice is also saved with PUT /profile.
  protected toggleTheme(): void {
    this.theme.setPreference(this.dark() ? 'LIGHT' : 'DARK');
  }
}
