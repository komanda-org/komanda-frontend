import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { erroApiInterceptor } from './core/http/erro-api.interceptor';
import { logHttpInterceptor } from './core/http/log-http.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),

    /**
     * `withFetch()`: o XHR nao existe no Node — sem o fetch, toda requisicao
     * feita durante o SSR falharia.
     *
     * Ordem dos interceptors = ordem de execucao na ida (na volta, o inverso):
     * o log por ultimo, para ver a resposta crua antes do `erroApi` normalizar
     * (e mascarar o que nao deve ser impresso). Ele se desliga em producao.
     */
    provideHttpClient(
      withFetch(),
      withInterceptors([erroApiInterceptor, logHttpInterceptor]),
    ),
  ],
};
