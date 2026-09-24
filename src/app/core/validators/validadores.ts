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

/**
 * Comprimento minimo medido DEPOIS do trim.
 *
 * Por que existe: `montarPayload` envia todo texto com `.trim()`, mas o
 * `Validators.minLength` do Angular mede a string CRUA. "abc   " passaria por
 * um minLength(6) e chegaria ao back como "abc" — 400 garantido. Este validador
 * mede o mesmo valor que vai no JSON, entao o front e o back concordam.
 *
 * Devolve a chave `minlength` com a MESMA forma que o Angular usa
 * ({ requiredLength, actualLength }) de proposito: assim mensagens-de-erro.ts
 * ja sabe traduzir, sem precisar de um caso novo para dizer a mesma frase.
 * (So vale reusar a chave porque o significado e identico: "curto demais".)
 *
 * Nao aplicamos o mesmo ao maximo: aparar so encurta, entao um maxLength
 * medido no valor cru nunca deixa passar algo que o back vai recusar.
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
 * Usa o construtor `URL` do proprio browser em vez de regex. Regex de URL e
 * notoriamente furada; o parser nativo ja implementa a especificacao inteira.
 * Restringimos a http/https porque `javascript:alert(1)` tambem e uma URL valida
 * para o parser — e nao queremos isso num campo de foto de perfil.
 *
 * A exigencia de ponto no hostname existe para acompanhar o back: o `@IsUrl()`
 * do class-validator roda com `require_tld: true` por padrao, entao ele RECUSA
 * "http://localhost/foto.png". Sem esta linha o front aprovaria uma URL que o
 * servidor devolveria como 400.
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
