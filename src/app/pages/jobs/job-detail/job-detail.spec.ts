import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { ToastService } from '../../../core/services/toast.service';
import { Job } from '../../../core/models/jobs.model';
import { contractLabel, formatSalary, jobMeta, shiftsLabel } from '../../../core/utils/job-labels';
import { JobDetail } from './job-detail';

const JOB: Job = {
  id: 'job-1',
  title: 'Cozinheiro de Linha',
  description: 'Primeiro parágrafo.\nSegundo parágrafo.',
  requirements: 'Experiência com praças quentes.',
  salary: '2400',
  contractType: 'CLT',
  status: 'ABERTA',
  restaurantId: 'rest-1',
  restaurant: {
    restaurantName: 'Le Petit Bistro',
    logoUrl: null,
    cuisineType: 'Cozinha francesa',
    averageRating: null,
    address: 'Rua das Flores, 123 - Centro, São Paulo - SP',
    zipCode: '01001-000',
  },
  createdAt: '2026-11-10T12:00:00.000Z',
  shifts: ['NOITE'],
  urgent: true,
  hasApplied: false,
  application: null,
};

describe('JobDetail — pure functions', () => {
  it('formats salary and falls back when it is missing', () => {
    expect(formatSalary('2400').replace(/\s/g, ' ')).toBe('R$ 2.400,00');
    expect(formatSalary(null)).toBe('A combinar');
  });

  it('translates contract codes into readable labels', () => {
    expect(contractLabel('ESTAGIO')).toBe('Estágio');
  });

  it('joins 0, 1, 2 and 3 shifts into a readable label', () => {
    expect(shiftsLabel([])).toBeNull();
    expect(shiftsLabel(null)).toBeNull();
    expect(shiftsLabel(['INTEGRAL'])).toBe('Integral');
    expect(shiftsLabel(['MANHA', 'TARDE'])).toBe('Manhã e Tarde');
    expect(shiftsLabel(['MANHA', 'TARDE', 'NOITE'])).toBe('Manhã, Tarde e Noite');
    expect(jobMeta(['MANHA', 'TARDE'], 'CLT')).toBe('Manhã e Tarde · CLT');
    expect(jobMeta([], 'PJ')).toBe('PJ');
  });
});

describe('JobDetail', () => {
  let fixture: ComponentFixture<JobDetail>;
  let http: HttpTestingController;
  const locationMock = { back: vi.fn() };
  const el = () => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string) => el().querySelector(`[data-testid="${id}"]`);

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function open(job: Job | null, error?: { status: number; statusText: string }): Promise<void> {
    fixture = TestBed.createComponent(JobDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectNone((r) => r.url === '/api/users/me/applications');
    const request = http.expectOne('/api/jobs/job-1');
    if (error) {
      request.flush({ message: 'Vaga não encontrada' }, error);
    } else {
      request.flush(job);
    }
    await settle();
  }

  const applied = (status: 'PENDENTE' | 'APROVADA' | 'REJEITADA'): Job => ({
    ...JOB,
    hasApplied: true,
    application: { id: 'a1', status, createdAt: JOB.createdAt },
  });

  beforeEach(() => {
    locationMock.back.mockClear();
    TestBed.configureTestingModule({
      imports: [JobDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: Location, useValue: locationMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'job-1' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('loads the job from GET /jobs/:id', async () => {
    await open(JOB);

    expect(byTestId('job-title')?.textContent).toContain('Cozinheiro de Linha');
    expect(byTestId('restaurant-name')?.textContent).toContain('Le Petit Bistro');
    expect(byTestId('urgent-badge')).not.toBeNull();
    expect(byTestId('job-description')?.textContent).toContain('Segundo parágrafo.');
    expect(byTestId('job-requirements')?.textContent).toContain('praças quentes');
    expect(byTestId('restaurant-link')?.getAttribute('href')).toBe('/restaurantes/rest-1');
    expect(byTestId('restaurant-hero-link')?.getAttribute('href')).toBe('/restaurantes/rest-1');
    expect(el().textContent).toContain('Noite');
    expect(byTestId('closed-banner')).toBeNull();
  });

  it('applies once and shows the pending status', async () => {
    await open(JOB);

    (byTestId('apply-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    const request = http.expectOne('/api/jobs/job-1/applications');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ id: 'a1', jobId: 'job-1', professionalId: 'u1', createdAt: JOB.createdAt });
    await settle();

    expect(byTestId('apply-btn')).toBeNull();
    expect(byTestId('application-status')?.textContent).toContain('Candidatura enviada');
  });

  it('shows "Candidatura enviada" for a pending application', async () => {
    await open(applied('PENDENTE'));

    expect(byTestId('apply-btn')).toBeNull();
    expect(byTestId('application-status')?.textContent).toContain('Candidatura enviada');
  });

  it('congratulates an approved application and links to the conversation', async () => {
    await open(applied('APROVADA'));

    expect(byTestId('application-status')?.textContent).toContain('Você foi aprovado(a)!');
    expect(byTestId('open-chat')?.textContent).toContain('Abrir conversa');
    expect(byTestId('open-chat')?.getAttribute('href')).toBe('/mensagens/job-1');
    expect(byTestId('apply-btn')).toBeNull();
  });

  it('tells a rejected application kindly', async () => {
    await open(applied('REJEITADA'));

    expect(byTestId('application-status')?.textContent).toContain('Não foi dessa vez');
    expect(byTestId('open-chat')).toBeNull();
    expect(byTestId('apply-btn')).toBeNull();
  });

  it('hides the apply button on a closed job and explains why', async () => {
    await open({ ...JOB, status: 'ENCERRADA' });

    expect(byTestId('closed-banner')?.textContent).toContain('Esta vaga não está recebendo candidaturas');
    expect(byTestId('apply-btn')).toBeNull();
  });

  it('keeps showing the application status on a paused job already applied to', async () => {
    await open({ ...applied('APROVADA'), status: 'PAUSADA' });

    expect(byTestId('closed-banner')).not.toBeNull();
    expect(byTestId('application-status')?.textContent).toContain('Você foi aprovado(a)!');
  });

  it('explains a missing job without exposing the HTTP status', async () => {
    await open(null, { status: 404, statusText: 'Not Found' });

    expect(byTestId('load-error')?.textContent).toContain('Não encontramos esta vaga');
    expect(byTestId('load-error')?.textContent).not.toContain('404');
  });

  it('treats an invalid id (400) as a job that was not found', async () => {
    await open(null, { status: 400, statusText: 'Bad Request' });

    expect(byTestId('load-error')?.textContent).toContain('Não encontramos esta vaga');
  });

  it('goes back through history so the feed keeps its filters', async () => {
    await open(JOB);

    (byTestId('back-btn') as HTMLButtonElement).click();

    expect(locationMock.back).toHaveBeenCalled();
  });

  it('shares the current url when the browser supports it', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });

    await open(JOB);
    (byTestId('share-btn') as HTMLButtonElement).click();
    await settle();

    expect(share).toHaveBeenCalledWith({ title: JOB.title, url: location.href });
  });

  it('copies the link when the browser cannot share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await open(JOB);
    (byTestId('share-btn') as HTMLButtonElement).click();
    await settle();

    expect(writeText).toHaveBeenCalledWith(location.href);
    expect(TestBed.inject(ToastService).message()).toBe('Link copiado');
  });
});
