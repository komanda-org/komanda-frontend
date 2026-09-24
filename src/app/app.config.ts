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
     * HttpClient da aplicacao.
     *
     * `withFetch()` troca o XMLHttpRequest antigo pela API fetch. Nao e enfeite:
     * o XHR nao existe no Node, entao sem isto toda requisicao feita durante o
     * SSR falharia.
     *
     * `withInterceptors([...])` registra os pedagios UMA vez para o app inteiro.
     * A ordem do array e a ordem de execucao NA IDA; na volta, o inverso.
     *
     * O log vem por ULTIMO de proposito: assim ele fica mais perto do backend e,
     * na volta, e o primeiro a ver a resposta — inclusive o HttpErrorResponse
     * cru, antes do erroApi transformar em ErroApi. Ele se desliga sozinho em
     * build de producao.
     */
    provideHttpClient(
      withFetch(),
      withInterceptors([erroApiInterceptor, logHttpInterceptor]),
    ),
  ],
};
