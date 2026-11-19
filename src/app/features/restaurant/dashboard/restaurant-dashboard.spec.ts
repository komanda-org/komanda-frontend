import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Applicant, RestaurantJob } from '../../../core/models/restaurant-jobs.model';
import { greetingFor } from '../../../core/utils/greeting';
import { RestaurantDashboard } from './restaurant-dashboard';

const DAY = 24 * 60 * 60 * 1000;

const job = (id: string, overrides: Partial<RestaurantJob> = {}): RestaurantJob => ({
  id,
  title: 'Vaga ' + id,
  description: 'Descrição',
  requirements: null,
  salary: 1200,
  contractType: 'CLT',
  shift: 'NOITE',
  status: 'ABERTA',
  urgent: false,
  createdAt: '2026-11-01T12:00:00.000Z',
  ...overrides,
});

const applicant = (id: string, status: Applicant['status'], ageMs: number): Applicant => ({
  applicationId: id,
  status,
  applicationDate: new Date(Date.now() - ageMs).toISOString(),
  professional: {
    id: 'p-' + id,
    fullName: 'Pessoa ' + id,
    mainRole: 'Cozinheiro',
    profilePhoto: null,
    experienceSummary: null,
    averageRating: null,
  },
});

const page = <T>(data: T[]) => ({ data, total: data.length, skip: 0, take: 50 });

describe('greetingFor', () => {
  it('greets by time of day', () => {
    expect(greetingFor(8)).toBe('Bom dia');
    expect(greetingFor(14)).toBe('Boa tarde');
    expect(greetingFor(21)).toBe('Boa noite');
  });
});

describe('RestaurantDashboard', () => {
  let fixture: ComponentFixture<RestaurantDashboard>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const text = (id: string) => el().querySelector(`[data-testid="${id}"]`)?.textContent?.trim();

  async function render(jobs: RestaurantJob[], applicants: Record<string, Applicant[]>): Promise<void> {
    fixture = TestBed.createComponent(RestaurantDashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne((r) => r.url === '/api/users/me/jobs').flush(page(jobs));
    for (const item of jobs) {
      http.expectOne((r) => r.url === `/api/jobs/${item.id}/applications`).flush(page(applicants[item.id] ?? []));
    }
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RestaurantDashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('summarises pending, matches and open jobs from the real applicants', async () => {
    await render([job('j1', { urgent: true }), job('j2'), job('j3', { status: 'ENCERRADA' })], {
      j1: [applicant('a1', 'PENDENTE', 3 * DAY), applicant('a2', 'APROVADA', DAY)],
      j2: [applicant('a3', 'PENDENTE', 1000)],
      j3: [applicant('a4', 'PENDENTE', 5 * DAY)],
    });

    expect(text('stat-pending')).toBe('2');
    expect(text('stat-matches')).toBe('1');
    expect(text('stat-jobs')).toBe('2');
    expect(el().querySelectorAll('[data-testid="job-row"]')).toHaveLength(2);
    expect(text('stale-alert')).toContain('1 candidato aguarda sua resposta há mais de 48h');
  });

  it('closes a job after confirmation and removes it from the active list', async () => {
    await render([job('j1')], { j1: [] });

    (el().querySelector('[data-testid="close-job"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el().querySelector('[data-testid="confirm-close"]') as HTMLButtonElement).click();

    const request = http.expectOne('/api/jobs/j1/status');
    expect(request.request.body).toEqual({ status: 'ENCERRADA' });
    request.flush(job('j1', { status: 'ENCERRADA' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelectorAll('[data-testid="job-row"]')).toHaveLength(0);
    expect(el().querySelector('[data-testid="empty"]')).not.toBeNull();
  });

  it('shows an actionable message without the HTTP status when loading fails', async () => {
    fixture = TestBed.createComponent(RestaurantDashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne((r) => r.url === '/api/users/me/jobs').flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text('load-error')).toContain('Não foi possível carregar suas vagas');
    expect(text('load-error')).not.toContain('500');
  });
});
