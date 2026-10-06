import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Troca segredos por '[REDACTED]': console do browser e visivel para qualquer um. */
export function redigirCorpo(corpo: unknown): unknown {
  if (Array.isArray(corpo)) {
    return corpo.map(redigirCorpo);
  }

  if (typeof corpo !== 'object' || corpo === null) {
    return corpo;
  }

  const copia: Record<string, unknown> = { ...(corpo as Record<string, unknown>) };
  for (const chave of Object.keys(copia)) {
    const minuscula = chave.toLowerCase();
    copia[chave] =
      minuscula.includes('password') ||
      minuscula.includes('senha') ||
      minuscula.includes('secret') ||
      minuscula.includes('token')
        ? '[REDACTED]'
        : redigirCorpo(copia[chave]);
  }

  return copia;
}

/**
 * INTERCEPTOR de log — so de desenvolvimento, e so observa (por isso `tap` e
 * nao `map`). Registrado por ultimo: na volta ele ve o erro cru, antes do
 * erroApiInterceptor normalizar.
 */
export const logHttpInterceptor: HttpInterceptorFn = (req, next) => {
  // Em producao nao logamos nada: o corpo do cadastro pode conter senha.
  if (environment.production) {
    return next(req);
  }

  const inicio = Date.now();
  // urlWithParams: a query string leva os filtros da busca.
  const etiqueta = `${req.method} ${req.urlWithParams}`;

  console.groupCollapsed(`➡️ ${etiqueta}`);
  console.log('corpo enviado:', redigirCorpo(req.body));
  console.groupEnd();

  return next(req).pipe(
    tap({
      next: (evento) => {
        // next() emite varios tipos de evento; so o Response interessa aqui.
        if (evento.type !== HttpEventType.Response) {
          return;
        }

        console.groupCollapsed(
          `✅ ${evento.status} ${etiqueta} — ${Date.now() - inicio}ms`,
        );
        console.log('resposta:', redigirCorpo(evento.body));
        console.groupEnd();
      },

      error: (erro: HttpErrorResponse) => {
        // status 0 = a requisicao nem saiu do lugar: procurar bug no payload adianta nada.
        console.groupCollapsed(
          `❌ ${erro.status} ${etiqueta} — ${Date.now() - inicio}ms`,
        );
        console.log('corpo enviado:', redigirCorpo(req.body));
        console.log('resposta do servidor:', erro.error);
        console.groupEnd();
      },
    }),
  );
};
