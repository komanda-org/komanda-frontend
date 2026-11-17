import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
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
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];