import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { erroApiInterceptor } from './core/http/erro-api.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),

    /**
     * HttpClient da aplicacao.
     *
     * `withFetch()` troca o XMLHttpRequest antigo pela API fetch. Nao e enfeite:
     * o XHR nao existe no Node, entao sem isto toda requisicao feita durante o
     * SSR falharia.
     *
     * `withInterceptors([...])` registra o pedagio de erro UMA vez para o app
     * inteiro. A ordem do array e a ordem de execucao.
     */
    provideHttpClient(withFetch(), withInterceptors([erroApiInterceptor])),
  ],
};
