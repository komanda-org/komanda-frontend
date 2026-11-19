import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** No servidor (prerender) nao ha localStorage: libera, e o browser decide ao hidratar. */
function isAuthenticated(): boolean | UrlTree {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() || router.parseUrl('/login');
}

export const authGuard: CanActivateFn = () => isAuthenticated();
export const authChildGuard: CanActivateChildFn = () => isAuthenticated();
