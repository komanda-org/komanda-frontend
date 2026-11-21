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

  it('always sends the CEP, masked as 00000-000', async () => {
    typeZip('01001000');

    http
      .expectOne('https://brasilapi.com.br/api/cep/v2/01001000')
      .flush({ state: 'SP', city: 'São Paulo', neighborhood: 'Sé' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector<HTMLInputElement>('#state')?.value).toBe('SP');
    expect(el().querySelector<HTMLInputElement>('#city')?.value).toBe('São Paulo');
    expect(el().querySelector<HTMLInputElement>('#neighborhood')?.value).toBe('Sé');

    submit();
    const request = http.expectOne('/api/professionals');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ fullName: 'Ana Souza', zipCode: '01001-000' });
    expect(request.request.body).toMatchObject({ neighborhood: 'Sé' });
    expect(request.request.body).not.toHaveProperty('state');
    expect(request.request.body).not.toHaveProperty('city');
    request.flush({ id: 'p1' });
  });

  it('ignores stale CEP responses and keeps loading until the latest lookup finishes', async () => {
    typeZip('01001000');
    const olderRequest = http.expectOne('https://brasilapi.com.br/api/cep/v2/01001000');

    typeZip('20040002');
    const latestRequest = http.expectOne('https://brasilapi.com.br/api/cep/v2/20040002');

    olderRequest.flush({ state: 'SP', city: 'São Paulo', neighborhood: 'Sé' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(el().querySelector<HTMLInputElement>('#city')?.value).toBe('');
    expect(el().querySelector('[role="status"]')?.textContent).toContain('Consultando CEP');

    latestRequest.flush({ state: 'RJ', city: 'Rio de Janeiro', neighborhood: 'Centro' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(el().querySelector<HTMLInputElement>('#state')?.value).toBe('RJ');
    expect(el().querySelector<HTMLInputElement>('#city')?.value).toBe('Rio de Janeiro');
    expect(el().querySelector<HTMLInputElement>('#neighborhood')?.value).toBe('Centro');
    expect(el().querySelector('[role="status"]')).toBeNull();
  });

  it('does not replace location fields edited while the CEP lookup is pending', async () => {
    typeZip('01001000');
    const request = http.expectOne('https://brasilapi.com.br/api/cep/v2/01001000');

    const cityInput = el().querySelector<HTMLInputElement>('#city')!;
    cityInput.value = 'Cidade informada';
    cityInput.dispatchEvent(new Event('input'));

    request.flush({ state: 'SP', city: 'São Paulo', neighborhood: 'Sé' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(cityInput.value).toBe('Cidade informada');
    expect(el().querySelector<HTMLInputElement>('#state')?.value).toBe('SP');
    expect(el().querySelector<HTMLInputElement>('#neighborhood')?.value).toBe('Sé');
  });
});

describe('RegistroProfissional — API errors', () => {
  let fixture: ComponentFixture<RegistroProfissional>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

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
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(RegistroProfissional);
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
      zipCode: '01001-000',
    });
    component.etapa.set(3);
    fixture.detectChanges();
    el().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  });

  afterEach(() => http.verify());

  it('explains an e-mail already in use and goes back to the step that has it', () => {
    http
      .expectOne('/api/professionals')
      .flush({ message: 'Email já cadastrado' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(el().textContent).toContain('Email já cadastrado');
    expect(el().textContent).not.toContain('Algo deu errado');
    expect(el().querySelector('#email')).not.toBeNull();
  });

  it('shows the validation message sent by the API instead of the generic one', () => {
    http
      .expectOne('/api/professionals')
      .flush({ message: ['zipCode must be a valid CEP'] }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(el().textContent).not.toContain('Algo deu errado');
  });
});
