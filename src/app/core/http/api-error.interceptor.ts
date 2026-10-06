import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api-error.model';

/**
 * Normalizes every HttpErrorResponse into an ApiError before it reaches a
 * component. Registered once, in app.config.ts, for the whole app.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((response: HttpErrorResponse) => throwError(() => normalize(response))));

function normalize(response: HttpErrorResponse): ApiError {
  // status 0 = the request never reached the server: network down, API
  // offline, or the dev-server proxy couldn't reach the back-end.
  if (response.status === 0) {
    return {
      status: 0,
      messages: ['Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.'],
    };
  }

  const body = response.error as { message?: string | string[] } | null;
  const message = body?.message;

  if (Array.isArray(message)) {
    return { status: response.status, messages: message };
  }

  if (typeof message === 'string' && message.length > 0) {
    return { status: response.status, messages: [message] };
  }

  return {
    status: response.status,
    messages: ['Não foi possível concluir a operação. Tente novamente em instantes.'],
  };
}
