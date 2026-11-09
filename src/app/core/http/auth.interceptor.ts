import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

function isApiRequest(url: string): boolean {
  const base = environment.apiUrl;
  return url === base || url.startsWith(`${base}/`);
}

function isUnauthorized(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 401;
}

/** Token so vai para a nossa API; assets e terceiros nunca recebem a sessao. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.getToken();

  if (!token) {
    return next(req);
  }

  // A API recusou o token: guarda-lo so faria toda requisicao seguinte falhar igual.
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    tap({ error: (error: unknown) => isUnauthorized(error) && auth.logout() }),
  );
};
