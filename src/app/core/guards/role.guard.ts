import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

export function homeFor(role: UserRole | null | undefined): string {
  return role === 'RESTAURANTE' ? '/dashboard' : '/home';
}

/** Leva cada papel para a propria area em vez de deixar a API responder 403. */
export function roleGuard(role: UserRole): CanActivateFn {
  return () => {
    const router = inject(Router);
    const user = inject(AuthService).getUser();
    if (!user) {
      return router.parseUrl('/login');
    }
    return user.role === role || router.parseUrl(homeFor(user.role));
  };
}
