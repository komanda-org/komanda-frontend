import { Routes } from '@angular/router';
import { AppLayout } from './layout/app-layout/app-layout';
import { PlaceholderPage } from './pages/placeholder/placeholder-page';

export const routes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      { path: '', redirectTo: 'vagas', pathMatch: 'full' },
      { path: 'vagas', component: PlaceholderPage, data: { title: 'Vagas' } },
      { path: 'matches', component: PlaceholderPage, data: { title: 'Matches' } },
      { path: 'mensagens', component: PlaceholderPage, data: { title: 'Mensagens' } },
      { path: 'perfil', component: PlaceholderPage, data: { title: 'Perfil' } },
    ],
  },
  { path: '**', redirectTo: 'vagas' },
];
