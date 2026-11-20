import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { isApiError } from '../models/api-error.model';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const SESSION_ENDED_TOAST = 'Sua sessão terminou. Entre novamente.';
export const ACCOUNT_DELETED_TOAST = 'Esta conta foi excluída.';

function isApiRequest(url: string): boolean {
  const base = environment.apiUrl;
  return url === base || url.startsWith(`${base}/`);
}

// O 401 do login e senha errada: a propria tela explica.
function isLoginRequest(url: string): boolean {
  return url === `${environment.apiUrl}/auth/login`;
}

function isUnauthorized(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 401;
}

/** Frase do toast; a API avisa "Sessão encerrada: a conta foi excluída ou desativada". */
export function sessionEndedMessage(error: unknown): string {
  const text = isApiError(error) ? error.messages.join(' ') : '';
  const plain = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return plain.includes('excluida') ? ACCOUNT_DELETED_TOAST : SESSION_ENDED_TOAST;
}

/** Token so vai para a nossa API; assets e terceiros nunca recebem a sessao. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = auth.getToken();

  if (!token) {
    return next(req);
  }

  // A API recusou o token: guarda-lo so faria toda requisicao seguinte falhar igual.
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    tap({
      error: (error: unknown) => {
        // Varias requisicoes podem falhar juntas: so a primeira ainda encontra o token.
        if (!isUnauthorized(error) || isLoginRequest(req.url) || !auth.getToken()) {
          return;
        }
        auth.logout();
        toast.show(sessionEndedMessage(error));
        void router.navigateByUrl('/login');
      },
    }),
  );
};
