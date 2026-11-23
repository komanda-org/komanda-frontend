import { Routes } from '@angular/router';
import { authChildGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppLayout } from './layout/app-layout/app-layout';
import { legacyChatRedirect } from './pages/mensagens/legacy-chat-redirect';

const professionalOnly = [roleGuard('PROFISSIONAL')];
const restaurantOnly = [roleGuard('RESTAURANTE')];

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
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
    path: 'auth/redefinir-senha',
    title: 'Criar nova senha · Komanda',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: '',
    component: AppLayout,
    canActivateChild: [authChildGuard],
    children: [
      {
        path: 'home',
        title: 'Início · Komanda',
        canActivate: professionalOnly,
        loadComponent: () =>
          import('./features/professional/home/professional-home').then((m) => m.ProfessionalHome),
      },
      {
        path: 'vagas',
        title: 'Vagas · Komanda',
        canActivate: professionalOnly,
        loadComponent: () =>
          import('./pages/jobs/jobs-feed/jobs-feed').then((m) => m.JobsFeed),
      },
      {
        path: 'vagas/:id',
        title: 'Detalhes da vaga · Komanda',
        canActivate: professionalOnly,
        loadComponent: () =>
          import('./pages/jobs/job-detail/job-detail').then((m) => m.JobDetail),
      },
      {
        path: 'matches',
        title: 'Minhas candidaturas · Komanda',
        canActivate: professionalOnly,
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
        path: 'mensagens/:jobId/:professionalId',
        loadComponent: () =>
          import('./pages/mensagens/mensagens-shell').then((m) => m.MensagensShell),
        title: 'Chat · Komanda',
      },
      {
        path: 'mensagens/:jobId',
        redirectTo: legacyChatRedirect,
      },
      {
        path: 'perfil',
        title: 'Meu perfil · Komanda',
        canActivate: professionalOnly,
        loadComponent: () =>
          import('./features/profile/professional-profile/professional-profile').then(
            (m) => m.ProfessionalProfilePage,
          ),
      },
      {
        path: 'perfil/editar',
        title: 'Editar perfil · Komanda',
        canActivate: professionalOnly,
        loadComponent: () =>
          import('./features/profile/profile-edit/profile-edit').then((m) => m.ProfileEdit),
      },
      {
        path: 'profissionais/:id',
        title: 'Perfil do profissional · Komanda',
        loadComponent: () =>
          import('./features/professionals/candidate-profile/candidate-profile').then(
            (m) => m.CandidateProfile,
          ),
      },
      {
        path: 'restaurantes/:id',
        title: 'Restaurante · Komanda',
        loadComponent: () =>
          import('./features/restaurants/restaurant-profile/restaurant-profile').then(
            (m) => m.RestaurantProfile,
          ),
      },
      {
        path: 'dashboard',
        title: 'Início · Komanda',
        canActivate: restaurantOnly,
        loadComponent: () =>
          import('./features/restaurant/dashboard/restaurant-dashboard').then(
            (m) => m.RestaurantDashboard,
          ),
      },
      {
        path: 'my-jobs',
        title: 'Minhas vagas · Komanda',
        canActivate: restaurantOnly,
        loadComponent: () =>
          import('./features/restaurant/my-jobs/my-jobs').then((m) => m.MyJobs),
      },
      {
        path: 'my-jobs/new',
        title: 'Nova vaga · Komanda',
        canActivate: restaurantOnly,
        loadComponent: () =>
          import('./features/restaurant/new-job/new-job').then((m) => m.NewJob),
      },
      {
        path: 'my-jobs/:id/edit',
        title: 'Editar vaga · Komanda',
        canActivate: restaurantOnly,
        loadComponent: () =>
          import('./features/restaurant/edit-job/edit-job').then((m) => m.EditJob),
      },
      {
        path: 'my-jobs/:id/preview',
        title: 'Visualizar vaga · Komanda',
        canActivate: restaurantOnly,
        loadComponent: () =>
          import('./features/restaurant/job-preview/job-preview').then((m) => m.JobPreview),
      },
      {
        path: 'pipeline',
        title: 'Pipeline · Komanda',
        canActivate: restaurantOnly,
        loadComponent: () =>
          import('./features/restaurant/pipeline/pipeline').then((m) => m.Pipeline),
      },
      {
        path: 'plans',
        title: 'Planos · Komanda',
        canActivate: restaurantOnly,
        loadComponent: () => import('./features/restaurant/plans/plans').then((m) => m.Plans),
      },
      { path: '', redirectTo: 'vagas', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
