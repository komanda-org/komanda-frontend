import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErroApi } from '../models/erro-api.model';

/**
 * Transforma o HttpErrorResponse cru — cujo formato varia conforme o erro —
 * no nosso `ErroApi`, que e sempre igual. So normaliza e repassa: mostrar e
 * decidir o que fazer e papel de quem chamou.
 */
export const erroApiInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((resposta: HttpErrorResponse) => throwError(() => normalizar(resposta))),
  );

/** Exportada para teste unitario puro, sem TestBed. */
export function normalizar(resposta: HttpErrorResponse): ErroApi {
  // status 0 = a requisicao nem chegou ao servidor (rede, API ou proxy fora).
  if (resposta.status === 0) {
    return {
      status: 0,
      mensagens: [
        'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.',
      ],
    };
  }

  // O Nest manda { message }; erro de rede/proxy pode chegar string ou vazio.
  const corpo = resposta.error as { message?: unknown } | string | null;
  if (typeof corpo === 'string' && corpo.length > 0) {
    return { status: resposta.status, mensagens: [corpo] };
  }

  const mensagem = typeof corpo === 'object' && corpo !== null ? corpo.message : undefined;

  if (Array.isArray(mensagem)) {
    const lista = mensagem.filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    );
    if (lista.length > 0) {
      return { status: resposta.status, mensagens: lista };
    }
  } else if (typeof mensagem === 'string' && mensagem.length > 0) {
    return { status: resposta.status, mensagens: [mensagem] };
  }

  return {
    status: resposta.status,
    mensagens: ['Não foi possível concluir o cadastro. Tente novamente em instantes.'],
  };
}
