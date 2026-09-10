/**
 * Validacao de CNPJ pelo algoritmo oficial (digitos verificadores).
 *
 * Funcao pura: entra string, sai boolean. Nao depende de Angular, nao toca em
 * DOM, nao faz requisicao. Isso a torna trivial de testar (ver cnpj.spec.ts) e
 * reutilizavel em qualquer contexto — inclusive no servidor, durante o SSR.
 *
 * COMO O ALGORITMO FUNCIONA
 * Um CNPJ tem 14 digitos: 12 de base + 2 verificadores.
 * Cada verificador e calculado assim:
 *   1. multiplica cada digito da base por um peso de uma sequencia fixa;
 *   2. soma tudo;
 *   3. resto = soma % 11;
 *   4. digito = resto < 2 ? 0 : 11 - resto.
 * O segundo verificador repete o processo incluindo o primeiro no calculo.
 */

const PESOS_PRIMEIRO_DIGITO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO_DIGITO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Deixa so os numeros: '12.345.678/0001-95' -> '12345678000195' */
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

function calcularDigito(base: string, pesos: readonly number[]): number {
  const soma = pesos.reduce((total, peso, indice) => total + Number(base[indice]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjEhValido(valor: string): boolean {
  const digitos = apenasDigitos(valor);

  if (digitos.length !== 14) {
    return false;
  }

  // '11111111111111' passa na conta dos verificadores mas nao e CNPJ real.
  // Sem esta linha, 10 sequencias invalidas seriam aceitas.
  if (/^(\d)\1{13}$/.test(digitos)) {
    return false;
  }

  const primeiro = calcularDigito(digitos.slice(0, 12), PESOS_PRIMEIRO_DIGITO);
  if (primeiro !== Number(digitos[12])) {
    return false;
  }

  const segundo = calcularDigito(digitos.slice(0, 13), PESOS_SEGUNDO_DIGITO);
  return segundo === Number(digitos[13]);
}
