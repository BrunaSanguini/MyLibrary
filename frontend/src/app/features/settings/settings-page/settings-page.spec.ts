import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NOW } from '@core/time/today';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import SettingsPage from './settings-page';

/** jsdom has no modal dialogs; the dialog itself is covered in the browser suite. */
function stubModalDialogs(): void {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

async function open(url: string) {
  stubModalDialogs();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [{ path: 'configuracoes', component: SettingsPage }],
        withComponentInputBinding(),
      ),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: NOW, useValue: () => new Date(2026, 10, 19, 12) },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  TestBed.tick();
  return { harness, http: TestBed.inject(HttpTestingController) };
}

/** Whatever the open tab asked for, answered empty. */
function answerAll(http: HttpTestingController) {
  for (const request of http.match(() => true)) {
    const url = request.request.url;
    if (url === '/api/v1/goals' || url === '/api/v1/genres' || url === '/api/v1/featured') {
      request.flush([]);
    } else if (url === '/api/v1/stats/overview') {
      request.flush({
        year: 2026,
        month: 11,
        finishedInMonth: 0,
        finishedInYear: 0,
        rereadsInYear: 0,
        pagesInYear: 0,
      });
    } else {
      request.flush({ content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 });
    }
  }
}

describe('SettingsPage', () => {
  it('opens on Cadastros, under the trail and the title', async () => {
    const { http, harness } = await open('/configuracoes');
    answerAll(http);
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cadastros' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Gêneros' })).toBeInTheDocument();
  });

  it('opens the tab and the catalog the address asks for', async () => {
    const { http, harness } = await open('/configuracoes?aba=metas');
    answerAll(http);
    await harness.fixture.whenStable();

    expect(screen.getByRole('tab', { name: 'Metas' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Suas metas de leitura' })).toBeInTheDocument();
  });

  it('moves between the tabs with the arrows, in the address', async () => {
    const { http, harness } = await open('/configuracoes');
    answerAll(http);
    await harness.fixture.whenStable();

    screen.getByRole('tab', { name: 'Cadastros' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    TestBed.tick();
    answerAll(http);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/configuracoes?aba=destaques');
    expect(screen.getByRole('tab', { name: 'Destaques da Home' })).toHaveFocus();
  });

  it('asks before leaving a tab with changes that were not saved', async () => {
    const { http, harness } = await open('/configuracoes?aba=metas');
    answerAll(http);
    await harness.fixture.whenStable();

    await userEvent.click(screen.getByRole('switch', { name: 'Releituras' }));
    expect(harness.routeDebugElement?.componentInstance.hasUnsavedChanges()).toBe(true);
    await userEvent.click(screen.getByRole('tab', { name: 'Cadastros' }));

    const dialog = screen.getByRole('dialog', { name: 'Descartar alterações?' });
    expect(TestBed.inject(Router).url).toBe('/configuracoes?aba=metas');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Descartar alterações' }));
    TestBed.tick();
    answerAll(http);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/configuracoes');
  });
});
