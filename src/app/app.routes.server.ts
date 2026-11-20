import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rota com authGuard tem que ficar em Client: no prerender o guard nao ve
  // sessao, redireciona para /login e o HTML gerado seria o da tela de entrar.
  {
    path: 'dashboard',
    renderMode: RenderMode.Client,
  },
  {
    path: 'home',
    renderMode: RenderMode.Client,
  },
  {
    path: 'vagas',
    renderMode: RenderMode.Client,
  },
  {
    path: 'vagas/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'matches',
    renderMode: RenderMode.Client,
  },
  {
    path: 'perfil',
    renderMode: RenderMode.Client,
  },
  {
    path: 'perfil/editar',
    renderMode: RenderMode.Client,
  },
  {
    path: 'mensagens',
    renderMode: RenderMode.Client,
  },
  {
    path: 'mensagens/:jobId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'mensagens/:jobId/:professionalId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'my-jobs',
    renderMode: RenderMode.Client,
  },
  {
    path: 'my-jobs/new',
    renderMode: RenderMode.Client,
  },
  {
    path: 'my-jobs/:id/edit',
    renderMode: RenderMode.Client,
  },
  {
    path: 'my-jobs/:id/preview',
    renderMode: RenderMode.Client,
  },
  {
    path: 'pipeline',
    renderMode: RenderMode.Client,
  },
  {
    path: 'plans',
    renderMode: RenderMode.Client,
  },
  // O token vem na query: pre-renderizar geraria o HTML de "Link invalido".
  {
    path: 'auth/redefinir-senha',
    renderMode: RenderMode.Client,
  },
  // Id dinamico: o build nao sabe quais restaurantes pre-renderizar.
  {
    path: 'restaurantes/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profissionais/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];