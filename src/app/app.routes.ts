import { Routes } from '@angular/router';
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
      import('./features/registro/escolha-perfil/escolha-perfil').then((m) => m.EscolhaPerfil),
  },
  {
    path: 'registro/profissional',
    title: 'Criar conta · Profissional · Komanda',
    loadComponent: () =>
      import('./features/registro/profissional/registro-profissional').then(
        (m) => m.RegistroProfissional,
      ),
  },
  {
    path: 'registro/restaurante',
    title: 'Criar conta · Restaurante · Komanda',
    loadComponent: () =>
      import('./features/registro/restaurante/registro-restaurante').then(
        (m) => m.RegistroRestaurante,
      ),
  },
  {
    path: 'login',
    title: 'Entrar · Komanda',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'auth/recuperar-senha',
    title: 'Recuperar senha · Komanda',
    loadComponent: () =>
      import('./features/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'dashboard',
    title: 'Dashboard · Komanda',
    loadComponent: () => import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: '',
    component: AppLayout,
    children: [
      { path: 'vagas', component: PlaceholderPage, data: { title: 'Vagas' } },
      { path: 'matches', component: PlaceholderPage, data: { title: 'Matches' } },
      { path: 'mensagens', component: PlaceholderPage, data: { title: 'Mensagens' } },
      { path: 'perfil', component: PlaceholderPage, data: { title: 'Perfil' } },
      { path: '', redirectTo: 'vagas', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'registro',
  },
];