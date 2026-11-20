import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { ProfessionalPreferencesService } from '../../../core/services/professional-preferences.service';
import { RegistroProfissional } from './registro-profissional';

describe('RegistroProfissional — CEP', () => {
  let fixture: ComponentFixture<RegistroProfissional>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const zipInput = () => el().querySelector<HTMLInputElement>('#zipCode')!;
  const zipField = () => zipInput().closest('.campo') as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegistroProfissional],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: ProfessionalPreferencesService, useValue: { saveForEmail: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegistroProfissional);

    // Etapas 1 e 2 ja preenchidas: o foco aqui e a etapa da localizacao.
    const component = fixture.componentInstance as unknown as {
      form: { patchValue(value: object): void };
      etapa: { set(value: number): void };
    };
    component.form.patchValue({
      email: 'ana@example.com',
      password: 'senha-forte-1',
      confirmPassword: 'senha-forte-1',
      fullName: 'Ana Souza',
      mainRole: 'Cozinheira',
      contractType: 'CLT',
      acceptedTerms: true,
    });
    component.etapa.set(3);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function typeZip(value: string): void {
    zipInput().value = value;
    zipInput().dispatchEvent(new Event('input'));
  }

  function submit(): void {
    el().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  }

  it('marks the CEP as required and explains why it is asked', () => {
    expect(zipInput().getAttribute('aria-required')).toBe('true');
    expect(zipField().querySelector('.campo__obrigatorio')?.textContent).toBe('*');
    expect(zipField().querySelector('.campo__opcional')).toBeNull();
    expect(zipField().textContent).toContain('Usamos o CEP para mostrar vagas perto de você.');
  });

  it('does not send the registration without a CEP', () => {
    submit();

    http.expectNone('/api/professionals');
    expect(zipField().querySelector('.campo__erro')?.textContent).toBe('Informe seu CEP');
  });

  it('rejects an incomplete CEP', () => {
    typeZip('0100');
    submit();

    http.expectNone('/api/professionals');
    expect(zipField().querySelector('.campo__erro')?.textContent).toBe('CEP inválido');
  });

  it('always sends the CEP, masked as 00000-000', () => {
    typeZip('01001000');
    submit();

    const request = http.expectOne('/api/professionals');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ fullName: 'Ana Souza', zipCode: '01001-000' });
    expect(request.request.body).not.toHaveProperty('neighborhood');
    request.flush({ id: 'p1' });
  });
});
