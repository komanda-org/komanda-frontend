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
