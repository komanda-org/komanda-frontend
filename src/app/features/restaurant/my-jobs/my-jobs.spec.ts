import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { RestaurantJob } from '../../../core/models/restaurant-jobs.model';
import { MyJobs } from './my-jobs';

const job = (id: string, overrides: Partial<RestaurantJob> = {}): RestaurantJob => ({
  id,
  title: 'Vaga ' + id,
  description: 'Descrição',
  requirements: null,
  salary: 1200,
  contractType: 'ESTAGIO',
  shifts: ['TARDE'],
  status: 'ABERTA',
  urgent: false,
  createdAt: '2026-11-01T12:00:00.000Z',
  ...overrides,
});

const page = <T>(data: T[]) => ({ data, total: data.length, skip: 0, take: 50 });

describe('MyJobs', () => {
  let fixture: ComponentFixture<MyJobs>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const cards = () => el().querySelectorAll('[data-testid="job-card"]');

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [MyJobs],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MyJobs);
    fixture.detectChanges();
    await fixture.whenStable();
    http
      .expectOne((r) => r.url === '/api/users/me/jobs')
      .flush(page([job('j1', { urgent: true }), job('j2', { status: 'ENCERRADA' })]));
    http.expectOne((r) => r.url === '/api/jobs/j1/applications').flush(
      page([
        {
          applicationId: 'a1',
          status: 'PENDENTE',
          applicationDate: '2026-11-18T12:00:00.000Z',
          professional: { id: 'p1', fullName: 'Ana', mainRole: 'Chef', profilePhoto: null, experienceSummary: null, averageRating: null },
        },
      ]),
    );
    http.expectOne((r) => r.url === '/api/jobs/j2/applications').flush(page([]));
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('splits active and closed jobs into tabs with their counts', async () => {
    expect(el().querySelector('[data-testid="tab-active"]')?.textContent).toContain('Ativas (1)');
    expect(el().querySelector('[data-testid="tab-closed"]')?.textContent).toContain('Encerradas (1)');
    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain('Urgente');
    expect(cards()[0].textContent).toContain('Tarde · Estágio');
    expect(cards()[0].querySelector('[data-testid="applicants-count"]')?.textContent).toBe('1');

    (el().querySelector('[data-testid="tab-closed"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain('Encerrada');
    expect(cards()[0].querySelector('[data-testid="close-job"]')).toBeNull();
    expect(cards()[0].querySelector('[data-testid="edit-job"]')).toBeNull();
  });

  it('offers "Editar" on open jobs, pointing to the edit route', () => {
    const edit = cards()[0].querySelector('[data-testid="edit-job"]');

    expect(edit?.textContent).toContain('Editar');
    expect(edit?.getAttribute('href')).toBe('/my-jobs/j1/edit');
  });

  it('offers "Ver vaga" on every status, carrying the job in the navigation state', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const view = cards()[0].querySelector<HTMLAnchorElement>('[data-testid="view-job"]')!;

    expect(view.textContent).toContain('Ver vaga');
    expect(view.getAttribute('href')).toBe('/my-jobs/j1/preview');
    view.click();
    expect(navigate.mock.calls[0][1]?.state).toEqual({ job: job('j1', { urgent: true }) });

    (el().querySelector('[data-testid="tab-closed"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cards()[0].querySelector('[data-testid="view-job"]')?.getAttribute('href')).toBe(
      '/my-jobs/j2/preview',
    );
  });

  it('explains a failed close without exposing the HTTP status', async () => {
    (el().querySelector('[data-testid="close-job"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el().querySelector('[data-testid="confirm-close"]') as HTMLButtonElement).click();
    http.expectOne('/api/jobs/j1/status').flush(null, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = el().querySelector('[role="alert"]')?.textContent ?? '';
    expect(alert).toContain('A vaga foi alterada em outra aba');
    expect(alert).not.toContain('409');
  });
});
