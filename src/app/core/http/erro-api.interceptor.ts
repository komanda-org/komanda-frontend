import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErroApi } from '../models/erro-api.model';

/**
 * INTERCEPTOR de erro.
 *
 * Um interceptor e um "pedagio" no caminho de toda requisicao HTTP: ele ve a
 * requisicao sair e a resposta voltar, e pode transformar as duas. Registrado
 * uma unica vez em app.config.ts, vale para o app inteiro.
 *
 * Este aqui tem UM trabalho: transformar o HttpErrorResponse cru — cujo formato
 * varia conforme o erro — no nosso `ErroApi`, que e sempre igual. A partir daqui
 * nenhuma tela precisa saber que o Nest as vezes manda `message` como string e
 * as vezes como array.
 *
 * Note que ele NAO mostra nada na tela e NAO decide o que fazer com o erro —
 * so normaliza e repassa. Quem decide e quem chamou.
 */
export const erroApiInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((resposta: HttpErrorResponse) => throwError(() => normalizar(resposta))),
  );

function normalizar(resposta: HttpErrorResponse): ErroApi {
  // status 0 = a requisicao nem chegou ao servidor: rede caiu, API fora do ar,
  // ou o proxy do dev-server nao esta conseguindo alcancar o back-end.
  if (resposta.status === 0) {
    return {
      status: 0,
      mensagens: ['Nao foi possivel falar com o servidor. Verifique sua conexao e tente de novo.'],
    };
  }

  const corpo = resposta.error as { message?: string | string[] } | null;
  const mensagem = corpo?.message;

  if (Array.isArray(mensagem)) {
    return { status: resposta.status, mensagens: mensagem };
  }

  if (typeof mensagem === 'string' && mensagem.length > 0) {
    return { status: resposta.status, mensagens: [mensagem] };
  }

  return {
    status: resposta.status,
    mensagens: ['Nao foi possivel concluir o cadastro. Tente novamente em instantes.'],
  };
}
