import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * INTERCEPTOR de log — ferramenta de desenvolvimento.
 *
 * Mesmo padrao do erro-api.interceptor, proposito oposto: aquele TRANSFORMA o
 * que passa, este apenas OBSERVA. Por isso usa `tap` e nao `map` — tap executa
 * um efeito colateral e repassa o valor intacto, entao ele nao tem como
 * quebrar a resposta que chega na tela.
 *
 * Registrado por ULTIMO no array de app.config.ts: isso o deixa mais perto do
 * backend, e na volta ele ve o HttpErrorResponse cru (com o status HTTP real)
 * antes do erroApiInterceptor normalizar tudo para ErroApi.
 */
export const logHttpInterceptor: HttpInterceptorFn = (req, next) => {
  // Em producao nao logamos nada: payload de cadastro pode conter senha, e o
  // console do browser e visivel para qualquer um. O `return next(req)` aqui
  // devolve a cadeia intocada — como se este interceptor nao existisse.
  if (environment.producao) {
    return next(req);
  }

  const inicio = Date.now();
  // urlWithParams (e nao url) porque inclui a query string — em rotas como
  // /jobs/search os filtros viajam ali, e e justamente o que voce quer conferir.
  const etiqueta = `${req.method} ${req.urlWithParams}`;

  console.groupCollapsed(`➡️ ${etiqueta}`);
  console.log('corpo enviado:', req.body);
  console.groupEnd();

  return next(req).pipe(
    tap({
      next: (evento) => {
        // next() emite VARIOS eventos (Sent, UploadProgress, Response...).
        // Sem este filtro voce logaria ruido a cada requisicao.
        if (evento.type !== HttpEventType.Response) {
          return;
        }

        console.groupCollapsed(
          `✅ ${evento.status} ${etiqueta} — ${Date.now() - inicio}ms`,
        );
        console.log('resposta:', evento.body);
        console.groupEnd();
      },

      error: (erro: HttpErrorResponse) => {
        // status 0 = a requisicao nem saiu do lugar: back-end fora do ar ou
        // proxy nao alcancou a porta 3000. Nao adianta procurar bug no payload.
        console.groupCollapsed(
          `❌ ${erro.status} ${etiqueta} — ${Date.now() - inicio}ms`,
        );
        console.log('corpo enviado:', req.body);
        console.log('resposta do servidor:', erro.error);
        console.groupEnd();
      },
    }),
  );
};
