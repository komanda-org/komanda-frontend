import { ErrorCopy, describeError } from './describe-error';

const COPY: ErrorCopy = {
  fallback: 'Não foi possível carregar. Tente de novo.',
  byStatus: { 401: 'Sua sessão expirou.' },
};

describe('describeError', () => {
  it('usa a frase da tela quando ela existe para o status', () => {
    expect(describeError({ status: 401, messages: ['x'] }, COPY)).toBe('Sua sessão expirou.');
  });

  it('usa as frases comuns de rede e de servidor', () => {
    expect(describeError({ status: 0, messages: [] }, COPY)).toContain('internet');
    expect(describeError({ status: 503, messages: [] }, COPY)).toContain('instável');
  });

  it('cai no fallback para status desconhecido', () => {
    expect(describeError({ status: 418, messages: ['x'] }, COPY)).toBe(COPY.fallback);
  });

  it('cai no fallback quando o erro nao e um ApiError', () => {
    expect(describeError(new Error('boom'), COPY)).toBe(COPY.fallback);
    // Formato legado (erro-api.model): sem `messages`, nao e ApiError.
    expect(describeError({ status: 401, mensagens: ['x'] }, COPY)).toBe(COPY.fallback);
  });

  it('nunca expoe o status HTTP', () => {
    for (const status of [0, 401, 500, 418]) {
      expect(describeError({ status, messages: ['x'] }, COPY)).not.toMatch(/\d{3}/);
    }
  });
});
