import { ApiError } from '../models/api-error.model';

/**
 * Qual campo do formulario causou o 409. `null` = motivo nao mapeado: nesse
 * caso mostramos a mensagem dele sem navegar (levar a pessoa para uma etapa
 * aleatoria seria pior do que deixa-la onde esta).
 */
export type CampoEmConflito = 'email' | 'cnpj' | null;

/**
 * O resultado da traducao: a frase que o usuario le E onde ela deve ser lida —
 * as duas saem da mesma analise do texto; separadas, poderiam discordar.
 */
export interface ConflitoTraduzido {
  campo: CampoEmConflito;
  mensagem: string;
}

/**
 * Traduz um 409 para a frase que o usuario deve ler.
 *
 * O back responde em ingles ou portugues conforme a rota:
 *   POST /restaurants  -> "User already exists" / "CNPJ already exists"
 *   POST /professionals -> "Email ja cadastrado"
 *
 * Comparamos por trecho e em minusculas: uma mudanca pequena de texto no
 * back nao quebra a traducao.
 */
export function traduzirConflito(erro: ApiError): ConflitoTraduzido {
  const texto = erro.messages.join(' ').toLowerCase();

  // CNPJ primeiro: e o caso mais especifico; depois do email cairia no ramo errado.
  if (texto.includes('cnpj')) {
    return { campo: 'cnpj', mensagem: 'CNPJ já existe' };
  }

  if (texto.includes('email') || texto.includes('e-mail') || texto.includes('user already')) {
    return { campo: 'email', mensagem: 'Email já cadastrado' };
  }

  // 409 nao mapeado: a frase do servidor e melhor que uma generica.
  return {
    campo: null,
    mensagem: erro.messages[0] ?? 'Estes dados já estão cadastrados',
  };
}
