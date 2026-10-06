import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RegistroRestaurante } from './registro-restaurante';

/**
 * O que estes testes protegem: as REGRAS DE AVANCO da etapa 1. Nao ha teste de
 * pixel aqui — layout quebra de um jeito que o olho ve e o teste nao.
 *
 * Por que o `as unknown as Interno`: `form`, `etapa` e `avancar` sao
 * `protected`, e `protected` e uma garantia do TypeScript em tempo de
 * COMPILACAO — em tempo de execucao sao propriedades comuns do objeto. O cast
 * declara o que estamos alcancando, em vez de espalhar `any` pelo arquivo: se
 * um dia `avancar` mudar de assinatura, esta interface para de bater e o teste
 * quebra na compilacao, que e onde a gente quer descobrir.
 */
interface Interno {
  readonly form: FormGroup;
  readonly etapa: () => number;
  avancar(): void;
  voltar(): void;
}

/** Um conjunto valido da etapa 1, para cada teste estragar so o que interessa. */
const ETAPA_1_VALIDA = {
  cnpj: '11.222.333/0001-81',
  restaurantName: 'Bistrô Maison',
  email: 'contato@restaurante.com',
  cuisineType: 'Francesa',
  password: 'senhaSegura1!',
  confirmPassword: 'senhaSegura1!',
  acceptTerms: true,
};

describe('RegistroRestaurante — avanço da etapa 1', () => {
  let fixture: ComponentFixture<RegistroRestaurante>;
  let componente: Interno;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroRestaurante],
      providers: [
        provideRouter([]),
        // O componente injeta RegistroService, que injeta HttpClient. Nenhum
        // destes testes chega a enviar — o Testing garante que, se chegasse,
        // a requisicao nao sairia de verdade.
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroRestaurante);
    componente = fixture.componentInstance as unknown as Interno;
    fixture.detectChanges();
  });

  it('bloqueia o avanço com campo obrigatório vazio e marca só os campos da etapa 1', () => {
    componente.form.patchValue({ ...ETAPA_1_VALIDA, restaurantName: '' });

    componente.avancar();

    expect(componente.etapa()).toBe(1);
    expect(componente.form.controls['restaurantName'].touched).toBe(true);
    // A etapa 2 nao pode ser cobrada antes da hora: `description` e obrigatorio,
    // mas quem esta na etapa 1 nao tem como te-lo preenchido ainda.
    expect(componente.form.controls['description'].touched).toBe(false);
  });

  it('bloqueia o avanço quando a confirmação não bate com a senha', () => {
    componente.form.patchValue({ ...ETAPA_1_VALIDA, confirmPassword: 'outraSenha1!' });

    componente.avancar();

    expect(componente.etapa()).toBe(1);
    expect(componente.form.controls['confirmPassword'].errors?.['confirmacao']).toBe(true);
  });

  it('revalida a confirmação quando a SENHA muda depois dela', () => {
    // A ordem e o ponto do teste: confirmacao primeiro, senha depois. Sem a
    // revalidacao cruzada no construtor, o par ficaria valido por acidente.
    componente.form.controls['confirmPassword'].setValue('senhaSegura1!');
    componente.form.controls['password'].setValue('senhaDiferente9!');

    expect(componente.form.controls['confirmPassword'].errors?.['confirmacao']).toBe(true);
  });

  it('bloqueia o avanço enquanto os termos não forem aceitos', () => {
    componente.form.patchValue({ ...ETAPA_1_VALIDA, acceptTerms: false });

    componente.avancar();

    expect(componente.etapa()).toBe(1);
    expect(componente.form.controls['acceptTerms'].touched).toBe(true);
    expect(componente.form.controls['acceptTerms'].errors?.['obrigatorioTrue']).toBe(true);
  });

  it('avança com a etapa 1 completa e preserva os dados ao voltar', () => {
    componente.form.patchValue(ETAPA_1_VALIDA);

    componente.avancar();
    expect(componente.etapa()).toBe(2);

    componente.voltar();

    expect(componente.etapa()).toBe(1);
    expect(componente.form.controls['cnpj'].value).toBe(ETAPA_1_VALIDA.cnpj);
    expect(componente.form.controls['restaurantName'].value).toBe(ETAPA_1_VALIDA.restaurantName);
    expect(componente.form.controls['acceptTerms'].value).toBe(true);
  });
});
