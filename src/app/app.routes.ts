import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // 'full' is required here: without it, '' would match ANY path (every
    // path starts with the empty string) and nothing else would be reached.
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    title: 'Entrar · Komanda',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    // Placeholder route: the page itself belongs to a future task.
    path: 'auth/recuperar-senha',
    title: 'Recuperar senha · Komanda',
    loadComponent: () =>
      import('./features/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    // Placeholder route: the real dashboard belongs to a future task.
    path: 'dashboard',
    title: 'Dashboard · Komanda',
    loadComponent: () => import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    // Wildcard always last: the router stops at the first match.
    path: '**',
    redirectTo: 'login',
  },
];
