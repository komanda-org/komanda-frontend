import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api-error.model';

/**
 * Normalizes every HttpErrorResponse into an ApiError before it reaches a
 * component. Registered once, in app.config.ts, for the whole app.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((response: HttpErrorResponse) => throwError(() => normalize(response))));

interface ValidationItem {
  property?: unknown;
  constraints?: Record<string, unknown>;
  children?: unknown;
}

export function normalize(response: HttpErrorResponse): ApiError {
  // status 0 = the request never reached the server: network down, API
  // offline, or the dev-server proxy couldn't reach the back-end.
  if (response.status === 0) {
    return {
      status: 0,
      messages: ['Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.'],
    };
  }

  const body = response.error as { message?: unknown } | null;
  const message = body?.message;

  if (Array.isArray(message)) {
    const messages = message.filter((item): item is string => typeof item === 'string');
    const fieldErrors: Record<string, string> = {};
    collectFieldErrors(message, '', fieldErrors);
    const fieldMessages = Object.values(fieldErrors);
    const all = [...messages, ...fieldMessages];
    if (all.length > 0) {
      return fieldMessages.length > 0
        ? { status: response.status, messages: all, fieldErrors }
        : { status: response.status, messages: all };
    }
  }

  if (typeof message === 'string' && message.length > 0) {
    return { status: response.status, messages: [message] };
  }

  return {
    status: response.status,
    messages: ['Não foi possível concluir a operação. Tente novamente em instantes.'],
  };
}

// Itens de lista (experiences) chegam aninhados em `children`, com o indice como `property`.
function collectFieldErrors(items: unknown[], prefix: string, out: Record<string, string>): void {
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) {
      continue;
    }
    const item = raw as ValidationItem;
    if (typeof item.property !== 'string' && typeof item.property !== 'number') {
      continue;
    }
    const path = prefix ? `${prefix}.${item.property}` : String(item.property);
    const first = Object.values(item.constraints ?? {}).find((value) => typeof value === 'string');
    if (typeof first === 'string') {
      out[path] = first;
    }
    if (Array.isArray(item.children)) {
      collectFieldErrors(item.children, path, out);
    }
  }
}
