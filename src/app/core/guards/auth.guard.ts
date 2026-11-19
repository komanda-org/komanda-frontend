import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

function isAuthenticated(): boolean | UrlTree {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() || router.parseUrl('/login');
}

export const authGuard: CanActivateFn = () => isAuthenticated();
export const authChildGuard: CanActivateChildFn = () => isAuthenticated();
