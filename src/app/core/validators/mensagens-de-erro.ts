import { ValidationErrors } from '@angular/forms';

/**
 * Traduz o objeto de erros de um control para UMA frase em portugues — sem
 * isso cada template teria uma escada de @if e o texto divergiria entre telas.
 *
 * O `rotulo` e o nome do campo como o usuario o ve; ele faz a frase sair como
 * a especificacao pede ("Email deve ser valido", "Senha deve ter no minimo
 * 8 caracteres").
 */
export function mensagemDoErro(erros: ValidationErrors | null, rotulo: string): string | null {
  if (!erros) {
    return null;
  }

  // Um erro por vez, do mais basico primeiro. Excecao: 'servidor' e
  // 'conflito' vem da API depois do submit e sao mais especificos.
  if (typeof erros['servidor'] === 'string' && erros['servidor']) {
    return erros['servidor'];
  }

  if (erros['conflito']) {
    return `${rotulo} já cadastrado`;
  }

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

  if (erros['confirmacao']) {
    return 'As senhas nao conferem';
  }

  if (erros['obrigatorioTrue']) {
    return 'Voce deve aceitar os termos para continuar';
  }

  return `${rotulo} e invalido`;
}
