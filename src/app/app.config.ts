import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),

    /**
     * `withFetch()` swaps the old XMLHttpRequest for the fetch API — not
     * cosmetic: XHR doesn't exist in Node, so any request made during SSR
     * would fail without it.
     */
    provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
  ],
};
