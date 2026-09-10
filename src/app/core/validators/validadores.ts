import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { cnpjEhValido } from './cnpj';

/**
 * VALIDADORES customizados.
 *
 * Um ValidatorFn e uma funcao que recebe o control e devolve:
 *   - `null`  quando esta tudo certo;
 *   - um objeto `{ chaveDoErro: ... }` quando falhou.
 *
 * A chave do objeto e o que aparece depois em `control.errors`, e e ela que o
 * tradutor de mensagens (mensagens-de-erro.ts) usa para escolher o texto.
 *
 * Todos aqui devolvem `null` quando o campo esta vazio. Motivo: campo vazio e
 * responsabilidade do `Validators.required`, nao deste validador. Se um campo
 * opcional ficasse invalido so por estar em branco, seria impossivel envia-lo.
 */

/** Bloqueia nomes compostos so de espaco em branco ("   "). */
export function naoApenasEspacos(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string | null;

    if (!valor) {
      return null;
    }

    return valor.trim().length === 0 ? { apenasEspacos: true } : null;
  };
}

/** CNPJ: formato + digitos verificadores. */
export function cnpjValido(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string | null;

    if (!valor) {
      return null;
    }

    return cnpjEhValido(valor) ? null : { cnpj: true };
  };
}

/** CEP no formato 00000-000. */
export function cepValido(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string | null;

    if (!valor) {
      return null;
    }

    return /^\d{5}-\d{3}$/.test(valor) ? null : { cep: true };
  };
}

/**
 * URL valida.
 *
 * Usa o construtor `URL` do proprio browser em vez de regex. Regex de URL e
 * notoriamente furada; o parser nativo ja implementa a especificacao inteira.
 * Restringimos a http/https porque `javascript:alert(1)` tambem e uma URL valida
 * para o parser — e nao queremos isso num campo de foto de perfil.
 */
export function urlValida(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string | null;

    if (!valor) {
      return null;
    }

    try {
      const url = new URL(valor);
      return url.protocol === 'http:' || url.protocol === 'https:' ? null : { url: true };
    } catch {
      return { url: true };
    }
  };
}

/** Cada item de um array de strings respeita um tamanho maximo. */
export function itensAteTamanho(maximo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string[] | null;

    if (!valor || valor.length === 0) {
      return null;
    }

    return valor.some((item) => item.length > maximo)
      ? { itemLongo: { maximo } }
      : null;
  };
}
