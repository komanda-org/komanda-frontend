import { UserRole } from '../models/auth.model';

interface NotificationRoute {
  prefix: string;
  path: string;
  role: UserRole | null;
}

// A API so identifica o aviso pelo titulo; a vaga nao vem junto, entao cai na lista.
const ROUTES: NotificationRoute[] = [
  { prefix: 'Nova mensagem', path: '/mensagens', role: null },
  { prefix: 'Candidatura aprovada', path: '/matches', role: 'PROFISSIONAL' },
  { prefix: 'Candidatura não aprovada', path: '/matches', role: 'PROFISSIONAL' },
  { prefix: 'Vaga encerrada', path: '/matches', role: 'PROFISSIONAL' },
  { prefix: 'Nova candidatura', path: '/pipeline', role: 'RESTAURANTE' },
  { prefix: 'Nova vaga perto de você', path: '/vagas', role: 'PROFISSIONAL' },
];

/** Tela para onde o aviso leva, ou null quando nao ha (ou e de outro perfil). */
export function notificationRoute(title: string, role: UserRole | null | undefined): string | null {
  const route = ROUTES.find((item) => title.trim().startsWith(item.prefix));
  if (!route || (route.role && route.role !== role)) {
    return null;
  }
  return route.path;
}

export function unreadBadge(count: number): string {
  return count > 9 ? '9+' : String(count);
}
