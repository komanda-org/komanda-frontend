import { ValidationErrors } from '@angular/forms';

/**
 * Traduz o objeto de erros de um control para UMA frase em portugues.
 *
 * Por que centralizar: sem isso, cada template teria uma escada de @if
 * ("se required mostra X, se minlength mostra Y..."). Aqui a regra existe uma
 * vez so e o texto fica consistente na aplicacao inteira.
 *
 * O `rotulo` e o nome do campo como o usuario o ve ("Email", "Senha",
 * "Nome completo"). E ele que faz a mensagem sair exatamente como a
 * especificacao pede:
 *   rotulo 'Email'         + erro email      -> "Email deve ser valido"
 *   rotulo 'Senha'         + minlength 8     -> "Senha deve ter no minimo 8 caracteres"
 *   rotulo 'Nome completo' + minlength 3     -> "Nome completo deve ter no minimo 3 caracteres"
 */
export function mensagemDoErro(erros: ValidationErrors | null, rotulo: string): string | null {
  if (!erros) {
    return null;
  }

  // A ordem das checagens define a prioridade: mostramos um erro por vez,
  // o mais "basico" primeiro. Empilhar tres mensagens num campo so confunde.
  if (erros['required']) {
    return `${rotulo} e obrigatorio`;
  }

  if (erros['email']) {
    return `${rotulo} deve ser valido`;
  }

  if (erros['apenasEspacos']) {
    return `${rotulo} nao pode conter apenas espacos`;
  }

  if (erros['cnpj']) {
    return 'CNPJ invalido';
  }

  if (erros['cep']) {
    return `${rotulo} deve estar no formato 00000-000`;
  }

  if (erros['url']) {
    return `${rotulo} deve ser uma URL valida`;
  }

  if (erros['minlength']) {
    const minimo = (erros['minlength'] as { requiredLength: number }).requiredLength;
    return `${rotulo} deve ter no minimo ${minimo} caracteres`;
  }

  if (erros['maxlength']) {
    const maximo = (erros['maxlength'] as { requiredLength: number }).requiredLength;
    return `${rotulo} deve ter no maximo ${maximo} caracteres`;
  }

  if (erros['itemLongo']) {
    const maximo = (erros['itemLongo'] as { maximo: number }).maximo;
    return `Cada funcao deve ter no maximo ${maximo} caracteres`;
  }

  return `${rotulo} e invalido`;
}
