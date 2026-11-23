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
    http.expectOne('/api/auth/login').flush({ access_token: 't', user: { id: 'p1', role: 'PROFISSIONAL' } });
    http.expectOne({ method: 'GET', url: '/api/users/me' }).flush(profile());
    http.expectOne({ method: 'PUT', url: '/api/users/me' }).flush({ userId: 'p1', role: 'PROFISSIONAL', profile: profile() });
  });
});

function profile() {
  return {
    role: 'PROFISSIONAL',
    id: 'p1',
    fullName: 'Ana Souza',
    mainRole: 'Cozinheira',
    profilePhoto: null,
    experienceSummary: null,
    specialties: [],
    neighborhood: null,
    city: 'São Paulo',
    state: 'SP',
    experiences: [],
    availability: null,
  };
}

describe('RegistroProfissional — trajectory and availability', () => {
  let fixture: ComponentFixture<RegistroProfissional>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

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
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(RegistroProfissional);
    const component = fixture.componentInstance as unknown as {
      form: { patchValue(value: object): void };
      etapa: { set(value: number): void };
      experienciasAdicionadas: { set(value: object[]): void };
    };
    component.form.patchValue({
      email: 'ana@example.com',
      password: 'senha-forte-1',
      confirmPassword: 'senha-forte-1',
      fullName: 'Ana Souza',
      mainRole: 'Cozinheira',
      contractType: 'Freelancer',
      acceptedTerms: true,
      zipCode: '01001-000',
      mobility: 'REGIONAL',
    });
    component.experienciasAdicionadas.set([
      {
        id: 1,
        workPlace: 'Bistrô Maison',
        role: 'Auxiliar',
        startDate: '05/2026',
        endDate: '09/2026',
        currentJob: false,
        experienceDescription: 'Praça fria.',
        skills: ['Confeitaria'],
      },
    ]);
    component.etapa.set(3);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
      .click();
  });

  afterEach(() => http.verify());

  it('saves experiences in the trajectory and the contract type as availability', () => {
    const register = http.expectOne('/api/professionals');
    expect(register.request.body).not.toHaveProperty('experienceSummary');
    register.flush({ id: 'p1' });
    http.expectOne('/api/auth/login').flush({ access_token: 't', user: { id: 'p1', role: 'PROFISSIONAL' } });
    http.expectOne({ method: 'GET', url: '/api/users/me' }).flush(profile());

    const update = http.expectOne({ method: 'PUT', url: '/api/users/me' });
    expect(update.request.body).toMatchObject({
      experienceSummary: null,
      city: 'São Paulo',
      workModels: ['FREELANCER'],
      mobility: 'REGIONAL',
      specialties: ['Confeitaria'],
      experiences: [
        {
          company: 'Bistrô Maison',
          role: 'Auxiliar',
          startDate: '2026-05-01',
          endDate: '2026-09-01',
          description: 'Praça fria.',
        },
      ],
    });
    update.flush({ userId: 'p1', role: 'PROFISSIONAL', profile: profile() });

    expect(navigate).toHaveBeenCalledWith(['/home']);
  });

  it('sends the person to login when the account exists but the profile could not be saved', () => {
    http.expectOne('/api/professionals').flush({ id: 'p1' });
    http.expectOne('/api/auth/login').flush({ access_token: 't', user: { id: 'p1', role: 'PROFISSIONAL' } });
    http
      .expectOne({ method: 'GET', url: '/api/users/me' })
      .flush({ message: 'erro' }, { status: 500, statusText: 'Server Error' });

    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
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
