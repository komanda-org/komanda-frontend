import { FormControl, FormGroup } from '@angular/forms';
import { aplicarConflito, aplicarErrosDeValidacao } from './aplicar-erro-servidor';

/** Form minimo com os nomes reais dos dois wizards. */
function montarForm() {
  return new FormGroup({
    email: new FormControl(''),
    password: new FormControl(''),
    fullName: new FormControl(''),
    mainRole: new FormControl(''),
    cnpj: new FormControl(''),
    neighborhood: new FormControl(''),
    zipCode: new FormControl(''),
  });
}

describe('aplicarErrosDeValidacao', () => {
  it('mapeia a mensagem do 400 para o control e marca como tocado', () => {
    const form = montarForm();
    const restantes = aplicarErrosDeValidacao(form, ['Email deve ser valido']);

    expect(restantes).toEqual([]);
    expect(form.controls.email.errors?.['servidor']).toBe('Email deve ser valido');
    expect(form.controls.email.touched).toBe(true);
  });

  it('entende apelidos em portugues (senha -> password, cep -> zipCode)', () => {
    const form = montarForm();
    const restantes = aplicarErrosDeValidacao(form, [
      'Senha deve ter no minimo 8 caracteres',
      'CEP deve estar no formato 00000-000',
      'Bairro deve ter no maximo 100 caracteres',
    ]);

    expect(restantes).toEqual([]);
    expect(form.controls.password.errors?.['servidor']).toContain('Senha');
    expect(form.controls.zipCode.errors?.['servidor']).toContain('CEP');
    expect(form.controls.neighborhood.errors?.['servidor']).toContain('Bairro');
  });

  it('ignora acentos e maiusculas ao procurar o campo', () => {
    const form = montarForm();
    const restantes = aplicarErrosDeValidacao(form, ['DESCRIÇÃO do ambiente curta']);

    // 'descricao' nao existe neste form minimo: sobra para o banner.
    expect(restantes).toEqual(['DESCRIÇÃO do ambiente curta']);
  });

  it('devolve para o banner o que nao pertence a nenhum control', () => {
    const form = montarForm();
    const restantes = aplicarErrosDeValidacao(form, ['Algo deu errado no servidor']);

    expect(restantes).toEqual(['Algo deu errado no servidor']);
    expect(form.controls.email.touched).toBe(false);
  });

  it('preserva os erros que o control ja tinha', () => {
    const form = montarForm();
    form.controls.email.setErrors({ required: true });
    aplicarErrosDeValidacao(form, ['Email deve ser valido']);

    expect(form.controls.email.errors).toMatchObject({ required: true });
    expect(form.controls.email.errors?.['servidor']).toBeDefined();
  });
});

describe('aplicarConflito', () => {
  it('marca o control em conflito e o mostra como tocado', () => {
    const form = montarForm();
    aplicarConflito(form, 'email');

    expect(form.controls.email.errors?.['conflito']).toBe(true);
    expect(form.controls.email.touched).toBe(true);
  });

  it('ignora campo null ou que o form nao tem', () => {
    const form = montarForm();

    expect(() => {
      aplicarConflito(form, null);
      aplicarConflito(form, 'cnpj-inexistente');
    }).not.toThrow();
    expect(form.controls.email.errors).toBeNull();
  });
});
