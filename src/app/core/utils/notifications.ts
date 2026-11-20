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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" ou a data ("12 de nov."). */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diff = now.getTime() - date.getTime();
  if (!Number.isFinite(diff)) {
    return '';
  }
  if (diff < MINUTE) {
    return 'agora';
  }
  if (diff < HOUR) {
    return `há ${Math.floor(diff / MINUTE)} min`;
  }
  const days = Math.round((startOfDay(now) - startOfDay(date)) / (24 * HOUR));
  if (days === 1) {
    return 'ontem';
  }
  if (days < 1) {
    return `há ${Math.floor(diff / HOUR)} h`;
  }
  if (days < 7) {
    return `há ${days} dias`;
  }
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(date);
}

export function unreadBadge(count: number): string {
  return count > 9 ? '9+' : String(count);
}
