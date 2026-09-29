import { redigirCorpo } from './log-http.interceptor';

describe('redigirCorpo', () => {
  it('troca password por [REDACTED] e mantem os outros campos', () => {
    expect(
      redigirCorpo({ email: 'chef@komanda.com', password: 'segredo123' }),
    ).toEqual({ email: 'chef@komanda.com', password: '[REDACTED]' });
  });

  it('cobre senha/secret em qualquer caixa e em objetos aninhados', () => {
    const saida = redigirCorpo({
      Senha: 'x',
      clientSecret: 'y',
      dentro: { passwordHash: 'z', ok: 1 },
    }) as Record<string, unknown>;

    expect(saida['Senha']).toBe('[REDACTED]');
    expect(saida['clientSecret']).toBe('[REDACTED]');
    expect((saida['dentro'] as Record<string, unknown>)['passwordHash']).toBe('[REDACTED]');
    expect((saida['dentro'] as Record<string, unknown>)['ok']).toBe(1);
  });

  it('nao muta o objeto original', () => {
    const corpo = { password: 'segredo123' };
    redigirCorpo(corpo);

    expect(corpo.password).toBe('segredo123');
  });

  it('devolve primitivos, nulos e arrays sem quebrar', () => {
    expect(redigirCorpo(null)).toBeNull();
    expect(redigirCorpo('texto')).toBe('texto');
    expect(redigirCorpo([{ password: 'x', a: 1 }])).toEqual([
      { password: '[REDACTED]', a: 1 },
    ]);
  });
});
