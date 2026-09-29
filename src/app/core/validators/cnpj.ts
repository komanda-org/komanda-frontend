/**
 * Validacao de CNPJ pelo algoritmo oficial (digitos verificadores).
 *
 * Funcao pura — nao depende de Angular nem de DOM, funciona ate no SSR.
 *
 * Um CNPJ tem 14 digitos: 12 de base + 2 verificadores. Cada verificador:
 * multiplica a base por uma sequencia de pesos, soma, resto = soma % 11 e
 * digito = resto < 2 ? 0 : 11 - resto. O segundo repete incluindo o primeiro.
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
