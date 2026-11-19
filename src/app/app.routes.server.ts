import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rota com authGuard tem que ficar em Client: no prerender o guard nao ve
  // sessao, redireciona para /login e o HTML gerado seria o da tela de entrar.
  {
    path: 'dashboard',
    renderMode: RenderMode.Client,
  },
  {
    path: 'vagas',
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
    path: 'mensagens',
    renderMode: RenderMode.Client,
  },
  {
    path: 'mensagens/:jobId',
    renderMode: RenderMode.Client,
  },
  // Slug dinamico: o build nao sabe quais restaurantes pre-renderizar.
  {
    path: 'restaurantes/:slug',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];