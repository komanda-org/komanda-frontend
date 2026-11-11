import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RegistroProfissional } from './registro-profissional';

interface Interno {
  readonly form: FormGroup;
  readonly etapa: { set(valor: number): void };
}

describe('RegistroProfissional — consulta de CEP', () => {
  let fixture: ComponentFixture<RegistroProfissional>;
  let componente: Interno;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroProfissional],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroProfissional);
    componente = fixture.componentInstance as unknown as Interno;
    http = TestBed.inject(HttpTestingController);
    componente.etapa.set(3);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('preenche o bairro e identifica cidade/UF', () => {
    const input = fixture.nativeElement.querySelector('#zipCode') as HTMLInputElement;
    input.value = '01310100';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const requisicao = http.expectOne(
      'https://brasilapi.com.br/api/cep/v2/01310100',
    );
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush({
      cep: '01310-100',
      state: 'UF',
      city: 'Estado',
      neighborhood: 'Bairro',
      street: 'Rua Exemplo',
    });
    fixture.detectChanges();

    expect(componente.form.controls['zipCode'].value).toBe('01310-100');
    expect(componente.form.controls['neighborhood'].value).toBe('Bairro');
    expect(componente.form.controls['city'].value).toBe('Estado');
    expect(componente.form.controls['state'].value).toBe('UF');
  });

  it('mantém o bairro livre quando o CEP não retorna um bairro específico', () => {
    const input = fixture.nativeElement.querySelector('#zipCode') as HTMLInputElement;
    input.value = '01000000';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const requisicao = http.expectOne(
      'https://brasilapi.com.br/api/cep/v2/01000000',
    );
    requisicao.flush({
      cep: '01000-000',
      state: 'UF',
      city: 'Estado',
      neighborhood: 'Cidade',
      street: 'Rua Exemplo',
    });
    fixture.detectChanges();

    expect(componente.form.controls['neighborhood'].value).toBe('Cidade');
    expect(componente.form.controls['city'].value).toBe('Estado');
    expect(componente.form.controls['state'].value).toBe('UF');
  });
});
