import { notificationRoute, relativeTime, unreadBadge } from './notifications';

describe('notificationRoute', () => {
  it('sends each notification title to its list page', () => {
    expect(notificationRoute('Nova mensagem de Ana', 'PROFISSIONAL')).toBe('/mensagens');
    expect(notificationRoute('Nova mensagem de Cantina', 'RESTAURANTE')).toBe('/mensagens');
    expect(notificationRoute('Candidatura aprovada: Garçom', 'PROFISSIONAL')).toBe('/matches');
    expect(notificationRoute('Candidatura não aprovada: Garçom', 'PROFISSIONAL')).toBe('/matches');
    expect(notificationRoute('Vaga encerrada: Garçom', 'PROFISSIONAL')).toBe('/matches');
    expect(notificationRoute('Nova candidatura: Garçom', 'RESTAURANTE')).toBe('/pipeline');
    expect(notificationRoute('Nova vaga perto de você: Garçom', 'PROFISSIONAL')).toBe('/vagas');
  });

  it('does not navigate to a page of the other role or for unknown titles', () => {
    expect(notificationRoute('Nova candidatura: Garçom', 'PROFISSIONAL')).toBeNull();
    expect(notificationRoute('Candidatura aprovada: Garçom', 'RESTAURANTE')).toBeNull();
    expect(notificationRoute('Bem-vindo ao Komanda', 'PROFISSIONAL')).toBeNull();
  });
});

describe('relativeTime', () => {
  const now = new Date(2026, 10, 20, 15, 0, 0);
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const MIN = 60_000;

  it('describes recent moments in minutes and hours', () => {
    expect(relativeTime(ago(20_000), now)).toBe('agora');
    expect(relativeTime(ago(5 * MIN), now)).toBe('há 5 min');
    expect(relativeTime(ago(3 * 60 * MIN), now)).toBe('há 3 h');
  });

  it('uses "ontem", then days, then the date', () => {
    expect(relativeTime(new Date(2026, 10, 19, 22, 0).toISOString(), now)).toBe('ontem');
    expect(relativeTime(new Date(2026, 10, 16, 9, 0).toISOString(), now)).toBe('há 4 dias');
    expect(relativeTime(new Date(2026, 10, 2, 9, 0).toISOString(), now)).toMatch(/^2 de nov/);
  });
});

describe('unreadBadge', () => {
  it('caps the count at 9+', () => {
    expect(unreadBadge(3)).toBe('3');
    expect(unreadBadge(12)).toBe('9+');
  });
});
