export interface NavItem {
  path: string;
  label: string;
  testid: string;
  icon: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/vagas', label: 'Vagas', testid: 'nav-vagas', icon: '/icons/vagas.svg' },
  { path: '/matches', label: 'Matches', testid: 'nav-matches', icon: '/icons/matches.svg' },
  { path: '/mensagens', label: 'Mensagens', testid: 'nav-mensagens', icon: '/icons/mensagens.svg' },
  { path: '/perfil', label: 'Perfil', testid: 'nav-perfil', icon: '/icons/perfil.svg' },
];
