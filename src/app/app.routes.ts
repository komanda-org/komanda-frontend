import { Routes } from '@angular/router';
import { authChildGuard, authGuard } from './core/guards/auth.guard';
import { AppLayout } from './layout/app-layout/app-layout';
import { PlaceholderPage } from './pages/placeholder/placeholder-page';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'registro',
  },
  {
    path: 'registro',
    title: 'Criar conta · Komanda',
    loadComponent: () =>
      import('./pages/registro/escolha-perfil/escolha-perfil').then((m) => m.EscolhaPerfil),
  },
  {
    path: 'registro/profissional',
    title: 'Criar conta · Profissional · Komanda',
    loadComponent: () =>
      import('./pages/registro/profissional/registro-profissional').then(
        (m) => m.RegistroProfissional,
      ),
  },
  {
    path: 'registro/restaurante',
    title: 'Criar conta · Restaurante · Komanda',
    loadComponent: () =>
      import('./pages/registro/restaurante/registro-restaurante').then(
        (m) => m.RegistroRestaurante,
      ),
  },
  {
    path: 'login',
    title: 'Entrar · Komanda',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'auth/recuperar-senha',
    title: 'Recuperar senha · Komanda',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'dashboard',
    title: 'Dashboard · Komanda',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: '',
    component: AppLayout,
    canActivateChild: [authChildGuard],
    children: [
      {
        path: 'vagas',
        title: 'Vagas · Komanda',
        loadComponent: () =>
          import('./pages/jobs/jobs-feed/jobs-feed').then((m) => m.JobsFeed),
      },
      {
        path: 'matches',
        title: 'Minhas candidaturas · Komanda',
        loadComponent: () =>
          import('./features/applications/my-applications/my-applications').then(
            (m) => m.MyApplications,
          ),
      },
      {
        path: 'mensagens',
        loadComponent: () =>
          import('./pages/mensagens/mensagens-shell').then((m) => m.MensagensShell),
        title: 'Mensagens · Komanda',
      },
      {
        path: 'mensagens/:jobId',
        loadComponent: () =>
          import('./pages/mensagens/mensagens-shell').then((m) => m.MensagensShell),
        title: 'Chat · Komanda',
      },
      { path: 'perfil', component: PlaceholderPage, data: { title: 'Perfil' } },
      {
        path: 'restaurantes/:slug',
        title: 'Restaurante · Komanda',
        loadComponent: () =>
          import('./features/restaurants/restaurant-profile/restaurant-profile').then(
            (m) => m.RestaurantProfile,
          ),
      },
      { path: '', redirectTo: 'vagas', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'registro',
  },
];