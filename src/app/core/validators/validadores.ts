import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { cnpjEhValido } from './cnpj';

/**
 * VALIDADORES customizados: recebem o control e devolvem `null` ou um objeto
 * `{ chaveDoErro: ... }` — a chave que `mensagens-de-erro.ts` traduz.
 *
 * Todos devolvem `null` quando o campo esta vazio: campo em branco e assunto
 * do `Validators.required`, senao campo opcional nao seria enviavel.
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

/**
 * Comprimento minimo medido DEPOIS do trim: `montarPayload` envia o texto
 * aparado, entao o `Validators.minLength` (que mede a string crua) deixaria
 * "abc   " passar num minLength(6) e o back recusaria com 400.
 *
 * Devolve a chave `minlength` com a mesma forma do Angular para o tradutor ja
 * saber ler. Ao maximo nao aplicamos: aparar so encurta.
 */
export function minimoAparado(minimo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string | null;

    // Campo vazio e assunto do `required`, nao deste validador.
    if (!valor) {
      return null;
    }

    const aparado = valor.trim().length;

    return aparado >= minimo
      ? null
      : { minlength: { requiredLength: minimo, actualLength: aparado } };
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
 * Usa o parser `URL` do browser (regex de URL e furada) e aceita so http/https,
 * porque `javascript:alert(1)` tambem passa nele. O ponto no hostname acompanha
 * o back: o `@IsUrl()` do class-validator roda com `require_tld: true` e
 * recusaria "http://localhost/foto.png" — sem isto o front aprovaria uma URL
 * que o servidor devolveria como 400.
 */
export function urlValida(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string | null;

    if (!valor) {
      return null;
    }

    try {
      const url = new URL(valor);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { url: true };
      }

      return url.hostname.includes('.') ? null : { url: true };
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

/** Confirmação de senha: dois controles devem ser iguais. */
export function confirmacaoIgual(campoOriginal: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const form = control.parent;
    if (!form) {
      return null;
    }
    const original = form.get(campoOriginal);
    if (!original) {
      return null;
    }
    return control.value === original.value ? null : { confirmacao: true };
  };
}

/** Checkbox obrigatório: deve ser true. */
export function obrigatorioTrue(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    return control.value === true ? null : { obrigatorioTrue: true };
  };
}
