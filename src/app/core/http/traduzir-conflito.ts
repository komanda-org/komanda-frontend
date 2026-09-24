import { ErroApi } from '../models/erro-api.model';

/**
 * Qual campo do formulario causou o 409.
 *
 * `null` = o servidor recusou por um motivo que ainda nao mapeamos. Nesse caso
 * mostramos a mensagem dele e nao navegamos para lugar nenhum — mandar o
 * usuario para uma etapa aleatoria seria pior do que deixa-lo onde esta.
 */
export type CampoEmConflito = 'email' | 'cnpj' | null;

/**
 * O resultado da traducao: a frase que o usuario le E onde ela deve ser lida.
 *
 * Por que os dois juntos e nao duas funcoes? Porque as duas respostas saem da
 * MESMA analise do texto. Separadas, seriam duas varreduras que podem discordar
 * depois que alguem editar so uma delas.
 */
export interface ConflitoTraduzido {
  campo: CampoEmConflito;
  mensagem: string;
}

/**
 * Traduz um 409 (Conflict) para a frase que o usuario deve ler.
 *
 * O back-end responde em ingles ou em portugues dependendo da rota (conferido
 * no codigo real do komanda-api):
 *   POST /restaurants  -> "User already exists"  (UserAlreadyExistsException)
 *   POST /restaurants  -> "CNPJ already exists"  (CnpjAlreadyExistsException)
 *   POST /professionals -> "Email ja cadastrado" (ConflictException)
 *
 * Normalizamos para minusculas antes de comparar para nao depender de
 * maiuscula/minuscula, e procuramos por trecho (`includes`) em vez de
 * igualdade exata — assim uma mudanca pequena de texto no back-end nao
 * quebra a traducao.
 */
export function traduzirConflito(erro: ErroApi): ConflitoTraduzido {
  const texto = erro.mensagens.join(' ').toLowerCase();

  // CNPJ primeiro: e o caso mais especifico. Se viesse depois do email, uma
  // hipotetica mensagem "CNPJ do usuario ja existe" cairia no ramo errado.
  if (texto.includes('cnpj')) {
    return { campo: 'cnpj', mensagem: 'CNPJ já existe' };
  }

  if (texto.includes('email') || texto.includes('e-mail') || texto.includes('user already')) {
    return { campo: 'email', mensagem: 'Email já cadastrado' };
  }

  // 409 de algo que ainda nao mapeamos: mostrar o que o servidor disse e
  // melhor do que esconder atras de uma mensagem generica.
  return {
    campo: null,
    mensagem: erro.mensagens[0] ?? 'Estes dados já estão cadastrados',
  };
}
