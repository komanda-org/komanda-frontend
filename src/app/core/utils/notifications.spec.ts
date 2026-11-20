import { notificationRoute, unreadBadge } from './notifications';

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

describe('unreadBadge', () => {
  it('caps the count at 9+', () => {
    expect(unreadBadge(3)).toBe('3');
    expect(unreadBadge(12)).toBe('9+');
  });
});
