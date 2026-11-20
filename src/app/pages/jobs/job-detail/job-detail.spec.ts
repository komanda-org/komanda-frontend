import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
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
};

const emptyApplications = { data: [], total: 0, skip: 0, take: 50 };

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
  const el = () => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string) => el().querySelector(`[data-testid="${id}"]`);

  async function start(state: unknown = null): Promise<void> {
    history.replaceState(state, '');
    fixture = TestBed.createComponent(JobDetail);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [JobDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'job-1' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    history.replaceState(null, '');
  });

  it('renders the job handed over by the list without calling GET /jobs/:id', async () => {
    await start({ job: JOB });
    http.expectOne((r) => r.url === '/api/users/me/applications').flush(emptyApplications);
    http.expectNone('/api/jobs/job-1');
    await settle();

    expect(byTestId('job-title')?.textContent).toContain('Cozinheiro de Linha');
    expect(byTestId('restaurant-name')?.textContent).toContain('Le Petit Bistro');
    expect(byTestId('urgent-badge')).not.toBeNull();
    expect(byTestId('job-description')?.textContent).toContain('Segundo parágrafo.');
    expect(byTestId('job-requirements')?.textContent).toContain('praças quentes');
    expect(byTestId('restaurant-link')?.getAttribute('href')).toBe('/restaurantes/rest-1');
    expect(byTestId('restaurant-hero-link')?.getAttribute('href')).toBe('/restaurantes/rest-1');
    expect(el().textContent).toContain('Noite');
  });

  it('fetches the job by id when opened directly', async () => {
    await start();
    http.expectOne((r) => r.url === '/api/users/me/applications').flush(emptyApplications);
    http.expectOne('/api/jobs/job-1').flush(JOB);
    await settle();

    expect(byTestId('job-title')?.textContent).toContain('Cozinheiro de Linha');
  });

  it('explains a missing job without exposing the HTTP status', async () => {
    await start();
    http.expectOne((r) => r.url === '/api/users/me/applications').flush(emptyApplications);
    http.expectOne('/api/jobs/job-1').flush(null, { status: 404, statusText: 'Not Found' });
    await settle();

    expect(byTestId('load-error')?.textContent).toContain('Não encontramos esta vaga');
    expect(byTestId('load-error')?.textContent).not.toContain('404');
  });

  it('applies once and switches the button to the submitted state', async () => {
    await start({ job: JOB });
    http.expectOne((r) => r.url === '/api/users/me/applications').flush(emptyApplications);
    await settle();

    (byTestId('apply-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    const request = http.expectOne('/api/jobs/job-1/applications');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ id: 'a1', jobId: 'job-1', professionalId: 'u1', createdAt: JOB.createdAt });
    await settle();

    expect(byTestId('apply-btn')?.textContent).toContain('Candidatura enviada');
    expect((byTestId('apply-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the job as already applied when it is in my applications', async () => {
    await start({ job: JOB });
    http.expectOne((r) => r.url === '/api/users/me/applications').flush({
      ...emptyApplications,
      data: [
        {
          applicationId: 'a1',
          status: 'PENDENTE',
          applicationDate: JOB.createdAt,
          job: { id: 'job-1', title: JOB.title },
          restaurant: { id: 'rest-1', name: 'Le Petit Bistro' },
        },
      ],
      total: 1,
    });
    await settle();

    expect(byTestId('apply-btn')?.textContent).toContain('Candidatura enviada');
  });
});
