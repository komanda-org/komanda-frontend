import { ApiError } from '../models/api-error.model';
import { traduzirConflito } from './traduzir-conflito';

/**
 * As mensagens abaixo NAO foram inventadas: sao as respostas reais do
 * komanda-api, capturadas em POST /api/restaurants e /api/professionals.
 */
function conflito(mensagem: string): ApiError {
  return { status: 409, messages: [mensagem] };
}

describe('traduzirConflito', () => {
  it('reconhece o conflito de CNPJ do POST /restaurants', () => {
    expect(traduzirConflito(conflito('CNPJ already exists'))).toEqual({
      campo: 'cnpj',
      mensagem: 'CNPJ j\u00e1 existe',
    });
  });

  it('reconhece o conflito de email do POST /restaurants (texto em ingles)', () => {
    expect(traduzirConflito(conflito('User already exists'))).toEqual({
      campo: 'email',
      mensagem: 'Email j\u00e1 cadastrado',
    });
  });

  it('reconhece o conflito de email do POST /professionals (texto em portugues)', () => {
    expect(traduzirConflito(conflito('Email j\u00e1 cadastrado'))).toEqual({
      campo: 'email',
      mensagem: 'Email j\u00e1 cadastrado',
    });
  });

  it('nao depende de maiusculas/minusculas', () => {
    expect(traduzirConflito(conflito('cnpj ALREADY EXISTS')).campo).toBe('cnpj');
  });

  it('repassa a mensagem do servidor quando o conflito e desconhecido', () => {
    expect(traduzirConflito(conflito('Something else conflicts'))).toEqual({
      campo: null,
      mensagem: 'Something else conflicts',
    });
  });

  it('reconhece o mojibake que o back ja mandou ("Email j� cadastrado")', () => {
    // Compatibilidade com a resposta corrompida: o que importa e a palavra email.
    expect(traduzirConflito(conflito('Email j� cadastrado'))).toEqual({
      campo: 'email',
      mensagem: 'Email já cadastrado',
    });
  });

  it('reconhece acentos, hifen e caixa alta', () => {
    expect(traduzirConflito(conflito('EMAIL JÁ CADASTRADO')).campo).toBe('email');
    expect(traduzirConflito(conflito('E-mail em uso')).campo).toBe('email');
    expect(traduzirConflito(conflito('CNPJ já cadastrado')).campo).toBe('cnpj');
  });

  it('varre todas as mensagens do array, nao so a primeira', () => {
    expect(
      traduzirConflito({ status: 409, messages: ['Algo estranho', 'User already exists'] })
        .campo,
    ).toBe('email');
  });

  it('nao navega para lugar nenhum quando nao identifica o campo', () => {
    // campo null e o sinal para o componente deixar o usuario onde esta.
    expect(traduzirConflito({ status: 409, messages: [] }).campo).toBeNull();
  });
});
