import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { problemDetailsInterceptor } from '@core/api/problem-details-interceptor';
import { requestedByInterceptor } from '@core/api/requested-by-interceptor';
import { AppTitleStrategy } from '@core/layout/app-title-strategy';

import { ProfileStore } from '@core/profile/profile-store';

import { routes } from './app.routes';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([requestedByInterceptor, problemDetailsInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    // Not awaited: the app opens with the theme saved in the browser while the profile arrives.
    provideAppInitializer(() => {
      void inject(ProfileStore).load();
    }),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
