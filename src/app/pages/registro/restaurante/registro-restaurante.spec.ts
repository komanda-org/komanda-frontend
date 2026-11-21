import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
  let http: HttpTestingController;
  let componente: Interno;
  let c: {
    readonly form: FormGroup;
    readonly etapa: { set(value: number): void };
    readonly cepLoading: () => boolean;
    readonly cnpjLoading: () => boolean;
  };
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();
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

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegistroRestaurante);
    componente = fixture.componentInstance as unknown as Interno;
    c = componente as unknown as {
      readonly form: FormGroup;
      readonly etapa: { set(value: number): void };
      readonly cepLoading: () => boolean;
      readonly cnpjLoading: () => boolean;
    };
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  function typeValue(id: string, value: string): void {
    const input = el().querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

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

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('ignores stale CEP responses and keeps loading until the latest lookup finishes', async () => {
    c.etapa.set(2);
    fixture.detectChanges();

    typeValue('zipCode', '01001000');
    const olderRequest = http.expectOne('https://brasilapi.com.br/api/cep/v2/01001000');
    typeValue('zipCode', '20040002');
    const latestRequest = http.expectOne('https://brasilapi.com.br/api/cep/v2/20040002');

    olderRequest.flush({ street: 'Rua Antiga', city: 'São Paulo', state: 'SP' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(el().querySelector<HTMLInputElement>('#address')?.value).toBe('');
    expect(el().querySelector('[role="status"]')?.textContent).toContain('Consultando CEP');

    latestRequest.flush({ street: 'Rua Atual', city: 'Rio de Janeiro', state: 'RJ' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(el().querySelector<HTMLInputElement>('#address')?.value).toBe(
      'Rua Atual, Rio de Janeiro-RJ',
    );
    expect(el().querySelector('[aria-label="Consultando CEP"]')).toBeNull();
  });

  it('does not overwrite values edited while a CNPJ lookup is pending', async () => {
    typeValue('cnpj', '11222333000181');
    const request = http.expectOne('https://brasilapi.com.br/api/cnpj/v1/11222333000181');

    c.form.patchValue({
      restaurantName: 'Nome digitado',
      phone: '(11) 99999-1111',
      zipCode: '20040-002',
    });

    request.flush({
      nome_fantasia: 'Nome da API',
      ddd_telefone_1: '11999998888',
      cep: '01001000',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(c.form.controls['restaurantName'].value).toBe('Nome digitado');
    expect(c.form.controls['phone'].value).toBe('(11) 99999-1111');
    expect(c.form.controls['zipCode'].value).toBe('20040-002');
    http.expectNone('https://brasilapi.com.br/api/cep/v2/01001000');
  });

  it('preenche restaurante, telefone e cep a partir da resposta da CNPJ', async () => {
    typeValue('cnpj', '11222333000181');
    const request = http.expectOne('https://brasilapi.com.br/api/cnpj/v1/11222333000181');

    request.flush({
      nome_fantasia: 'Nome da API',
      ddd_telefone_1: '11999998888',
      cep: '01001000',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const cepRequest = http.expectOne('https://brasilapi.com.br/api/cep/v2/01001000');
    cepRequest.flush({ street: 'Rua X', city: 'São Paulo', state: 'SP' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(c.form.controls['restaurantName'].value).toBe('Nome da API');
    expect(c.form.controls['phone'].value).toBe('(11) 99999-8888');
    expect(c.form.controls['zipCode'].value).toBe('01001-000');
    expect(c.cnpjLoading()).toBe(false);
    expect(c.cepLoading()).toBe(false);
  });

  it('switches from CNPJ loading to CEP loading after the CNPJ response', async () => {
    typeValue('cnpj', '11222333000181');
    const cnpjRequest = http.expectOne('https://brasilapi.com.br/api/cnpj/v1/11222333000181');

    cnpjRequest.flush({
      nome_fantasia: 'Restaurante',
      cep: '01001000',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const cepRequest = http.expectOne('https://brasilapi.com.br/api/cep/v2/01001000');
    cepRequest.flush({ street: 'Praça da Sé', city: 'São Paulo', state: 'SP' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(c.cnpjLoading()).toBe(false);
    expect(c.cepLoading()).toBe(false);
  });

  it('ignores stale CNPJ responses and keeps loading until the latest lookup finishes', async () => {
    typeValue('cnpj', '11222333000181');
    const olderRequest = http.expectOne('https://brasilapi.com.br/api/cnpj/v1/11222333000181');
    typeValue('cnpj', '22333444000198');
    const latestRequest = http.expectOne('https://brasilapi.com.br/api/cnpj/v1/22333444000198');

    olderRequest.flush({ nome_fantasia: 'Nome antigo' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(c.form.controls['restaurantName'].value).toBe('');
    expect(el().querySelector('[role="status"]')?.textContent).toContain('Consultando CNPJ');

    latestRequest.flush({ nome_fantasia: 'Nome atual' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(c.form.controls['restaurantName'].value).toBe('Nome atual');
    expect(el().querySelector('[role="status"]')).toBeNull();
  });
});
