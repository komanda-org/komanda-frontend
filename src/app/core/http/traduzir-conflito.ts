import { ErroApi } from '../models/erro-api.model';

/**
 * Traduz um 409 (Conflict) para a frase que o usuario deve ler.
 *
 * O back-end pode responder em ingles ou em portugues, com ou sem acento,
 * dependendo de qual rota respondeu:
 *   "Email ja cadastrado" | "User already exists"  -> e-mail em uso
 *   "CNPJ already exists"                          -> CNPJ em uso
 *
 * Normalizamos para minusculas antes de comparar para nao depender de
 * maiuscula/minuscula, e procuramos por trecho (`includes`) em vez de
 * igualdade exata — assim uma mudanca pequena de texto no back-end nao
 * quebra a traducao.
 */
export function traduzirConflito(erro: ErroApi): string {
  const texto = erro.mensagens.join(' ').toLowerCase();

  if (texto.includes('cnpj')) {
    return 'CNPJ já existe';
  }

  if (texto.includes('email') || texto.includes('e-mail') || texto.includes('user already')) {
    return 'Email já cadastrado';
  }

  // 409 de algo que ainda nao mapeamos: mostrar o que o servidor disse e
  // melhor do que esconder atras de uma mensagem generica.
  return erro.mensagens[0] ?? 'Estes dados já estão cadastrados';
}
