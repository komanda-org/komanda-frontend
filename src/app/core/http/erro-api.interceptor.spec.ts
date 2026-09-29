import { HttpErrorResponse } from '@angular/common/http';
import { normalizar } from './erro-api.interceptor';

function resposta(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('normalizar', () => {
  it('usa acentos corretos na mensagem de rede (status 0)', () => {
    expect(normalizar(resposta(0, null))).toEqual({
      status: 0,
      mensagens: [
        'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.',
      ],
    });
  });

  it('usa acentos corretos na mensagem generica', () => {
    expect(normalizar(resposta(500, null))).toEqual({
      status: 500,
      mensagens: ['Não foi possível concluir o cadastro. Tente novamente em instantes.'],
    });
  });

  it('aceita o corpo como string direta', () => {
    expect(normalizar(resposta(400, 'Email em uso'))).toEqual({
      status: 400,
      mensagens: ['Email em uso'],
    });
  });

  it('aceita message como string ou array', () => {
    expect(normalizar(resposta(409, { message: 'Email já cadastrado' }))).toEqual({
      status: 409,
      mensagens: ['Email já cadastrado'],
    });
    expect(
      normalizar(resposta(400, { message: ['Email deve ser valido', 'Senha curta'] })),
    ).toEqual({ status: 400, mensagens: ['Email deve ser valido', 'Senha curta'] });
  });

  it('filtra itens que nao sao string em vez de repassar lixo', () => {
    expect(normalizar(resposta(400, { message: [42, null] }))).toEqual({
      status: 400,
      mensagens: ['Não foi possível concluir o cadastro. Tente novamente em instantes.'],
    });
  });
});
