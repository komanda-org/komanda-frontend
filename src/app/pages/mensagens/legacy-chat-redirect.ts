import { inject } from '@angular/core';
import { RedirectFunction, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * /mensagens/:jobId vem dos botoes do profissional, que so conhecem a vaga:
 * completa com o proprio id. Restaurante precisa dizer com qual profissional.
 */
export const legacyChatRedirect: RedirectFunction = ({ params }) => {
  const router = inject(Router);
  const user = inject(AuthService).getUser();
  if (user?.role === 'PROFISSIONAL' && params['jobId']) {
    return router.createUrlTree(['/mensagens', params['jobId'], user.id]);
  }
  return router.createUrlTree(['/mensagens']);
};
