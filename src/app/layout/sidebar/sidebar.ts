import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  testid: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly user = { name: 'Julian Rossi', role: 'EXECUTIVE CHEF' };
  protected readonly nav: NavItem[] = [
    { path: '/vagas', label: 'Vagas', testid: 'nav-vagas', icon: '/icons/vagas.svg' },
    { path: '/matches', label: 'Matches', testid: 'nav-matches', icon: '/icons/matches.svg' },
    { path: '/mensagens', label: 'Mensagens', testid: 'nav-mensagens', icon: '/icons/mensagens.svg' },
    { path: '/perfil', label: 'Perfil', testid: 'nav-perfil', icon: '/icons/perfil.svg' },
  ];
}
