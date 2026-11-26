import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { toOneOf } from '@core/api/query-params';
import { HasUnsavedChanges } from '@core/routing/unsaved-changes-guard';
import { Breadcrumbs, Crumb } from '@shared/ui/breadcrumbs/breadcrumbs';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';

import { FeaturedSettings } from '../featured-settings/featured-settings';
import { DeadlineGoals } from '../deadline-goals/deadline-goals';
import { GoalsSettings } from '../goals-settings/goals-settings';
import { Registry } from '../registry/registry';
import { REGISTRY_KINDS, RegistryKind } from '../registry/registry-kinds';

/** The tabs of Configurações, as they appear in the address (`?aba=metas`). */
export const SETTINGS_TABS = [
  { id: 'cadastros', label: 'Cadastros' },
  { id: 'destaques', label: 'Destaques da Home' },
  { id: 'metas', label: 'Metas' },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]['id'];

const toTab = toOneOf(SETTINGS_TABS.map((tab) => tab.id));
const toKind = toOneOf(REGISTRY_KINDS.map((kind) => kind.id));

/**
 * Configurações: the catalogs to create and delete, the books featured on the Home and the reading
 * goals, one tab each. The tab and the catalog live in the address, so the Home links straight to
 * the goals (`?aba=metas`).
 *
 * <p>Destaques and Metas are saved with a button; leaving one of them with changes not saved asks
 * first, both when switching tabs and when leaving the page.
 */
@Component({
  selector: 'ml-settings-page',
  imports: [Breadcrumbs, ConfirmDialog, DeadlineGoals, FeaturedSettings, GoalsSettings, Registry],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export default class SettingsPage implements HasUnsavedChanges {
  readonly aba = input<SettingsTab, unknown>('cadastros', {
    transform: (value) => toTab(value) ?? 'cadastros',
  });
  readonly cadastro = input<RegistryKind, unknown>('generos', {
    transform: (value) => toKind(value) ?? 'generos',
  });

  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly featured = viewChild(FeaturedSettings);
  private readonly goals = viewChild(GoalsSettings);
  private readonly discardDialog = viewChild.required<ConfirmDialog>('discardDialog');

  protected readonly tabs = SETTINGS_TABS;
  protected readonly crumbs: readonly Crumb[] = [
    { label: 'Home', link: '/' },
    { label: 'Configurações' },
  ];

  /** The tab the reader asked for while the open one had changes, until they answer. */
  private readonly pending = signal<SettingsTab | undefined>(undefined);

  hasUnsavedChanges(): boolean {
    return Boolean(this.featured()?.hasUnsavedChanges() || this.goals()?.hasUnsavedChanges());
  }

  protected select(tab: SettingsTab): void {
    if (tab === this.aba()) {
      return;
    }
    if (this.hasUnsavedChanges()) {
      this.pending.set(tab);
      this.discardDialog().open();
      return;
    }
    this.go(tab);
  }

  /** The changes are dropped, and the tab the reader asked for opens. */
  protected discard(): void {
    const tab = this.pending();
    this.featured()?.discard();
    this.goals()?.discard();
    this.discardDialog().close();
    this.pending.set(undefined);
    if (tab) {
      this.go(tab);
    }
  }

  protected changeKind(kind: RegistryKind): void {
    void this.router.navigate([], {
      queryParams: { aba: null, cadastro: kind === 'generos' ? null : kind },
    });
  }

  /** Left and right move between the tabs, and Home and End go to the first and the last. */
  protected moveTab(event: KeyboardEvent): void {
    const last = this.tabs.length - 1;
    const current = this.tabs.findIndex((tab) => tab.id === this.aba());
    const target =
      event.key === 'ArrowRight'
        ? (current + 1) % this.tabs.length
        : event.key === 'ArrowLeft'
          ? (current + last) % this.tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined;
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    this.select(this.tabs[target]!.id);
  }

  private go(tab: SettingsTab): void {
    void this.router
      .navigate([], { queryParams: { aba: tab === 'cadastros' ? null : tab } })
      .then(() => {
        const index = this.tabs.findIndex((item) => item.id === tab);
        this.host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus();
      });
  }
}
