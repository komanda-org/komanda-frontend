import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** No servidor (prerender) nao ha localStorage: libera, e o browser decide ao hidratar. */
export const authGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  return inject(AuthService).getToken() ? true : inject(Router).createUrlTree(['/login']);
};
