import { apenasDigitos } from '../validators/cnpj';

/**
 * MASCARAS de digitacao.
 *
 * Sao funcoes puras `string -> string`: recebem o que o usuario digitou e
 * devolvem o texto ja formatado. Quem chama e o evento (input) do campo.
 *
 * Regra que elas seguem: NUNCA bloquear a digitacao, so formatar o que veio.
 * Uma mascara que "engole" tecla e uma das piores experiencias de formulario.
 */

/** 12345678000195 -> 12.345.678/0001-95 */
export function mascararCnpj(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14);

  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** 01310100 -> 01310-100 */
export function mascararCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}

/** 11987654321 -> (11) 98765-4321 — aceita fixo (8 digitos) e celular (9). */
export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);

  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }

  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}
