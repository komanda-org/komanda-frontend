import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, UrlTree, convertToParamMap, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Applicant, RestaurantJob } from '../../../core/models/restaurant-jobs.model';
import { Pipeline, appliedAtLabel, jobOptionLabel, ratingBadge } from './pipeline';

const job = (id: string, status: RestaurantJob['status'] = 'ABERTA'): RestaurantJob => ({
  id,
  title: 'Vaga ' + id,
  description: 'Descrição',
  requirements: null,
  salary: 1200,
  contractType: 'CLT',
  shifts: ['NOITE'],
  status,
  urgent: false,
  createdAt: '2026-11-01T12:00:00.000Z',
});

const applicant = (id: string, status: Applicant['status']): Applicant => ({
  applicationId: id,
  status,
  applicationDate: '2026-11-18T12:00:00.000Z',
  professional: {
    id: 'p-' + id,
    fullName: 'Pessoa ' + id,
    mainRole: 'Sushiman',
    profilePhoto: null,
    experienceSummary: 'Resumo ' + id,
    averageRating: 4.8,
  },
});

const page = <T>(data: T[]) => ({ data, total: data.length, skip: 0, take: 50 });

describe('appliedAtLabel', () => {
  it('says Hoje for applications from today', () => {
    const now = new Date('2026-11-19T15:00:00');
    expect(appliedAtLabel('2026-11-19T09:00:00', now)).toBe('Hoje');
    expect(appliedAtLabel('2026-11-10T09:00:00', now)).not.toBe('Hoje');
  });
});

describe('ratingBadge', () => {
  it('shows the average with a comma, or Novo without reviews', () => {
    expect(ratingBadge(4.6)).toBe('★ 4,6');
    expect(ratingBadge(null)).toBe('Novo');
  });
});

describe('jobOptionLabel', () => {
  it('adds the pending count in parentheses once it is known', () => {
    expect(jobOptionLabel(job('j1'))).toBe('Vaga j1 · Noite');
    expect(jobOptionLabel(job('j1'), 3)).toBe('Vaga j1 · Noite (3)');
    expect(jobOptionLabel(job('j0', 'ENCERRADA'), 0)).toBe('Vaga j0 · Noite (0) (encerrada)');
  });
});

describe('Pipeline', () => {
  let fixture: ComponentFixture<Pipeline>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const rows = () => el().querySelectorAll('[data-testid="applicant-row"]');

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(requestedJob: string | null): Promise<void> {
    TestBed.configureTestingModule({
      imports: [Pipeline],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(requestedJob ? { job: requestedJob } : {}) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Pipeline);
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne((r) => r.url === '/api/users/me/jobs').flush(page([job('j0', 'ENCERRADA'), job('j1'), job('j2')]));
  }

  // As contagens das outras vagas sao pedidas em paralelo; os testes que nao tratam delas as descartam.
  afterEach(() => {
    http.match((r) => r.method === 'GET' && r.url.endsWith('/applications'));
    http.verify();
  });

  it('opens the first open job and lists pending applicants with their counts', async () => {
    await render(null);
    http
      .expectOne((r) => r.url === '/api/jobs/j1/applications')
      .flush(page([applicant('a1', 'PENDENTE'), applicant('a2', 'APROVADA'), applicant('a3', 'REJEITADA')]));
    await settle();

    expect(el().querySelector('[data-testid="tab-PENDENTE"]')?.textContent).toContain('Pendente (1)');
    expect(el().querySelector('[data-testid="tab-APROVADA"]')?.textContent).toContain('Aprovado (1)');
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('Pessoa a1');
    expect(rows()[0].textContent).toContain('★ 4,8');
    expect(el().querySelector('[data-testid="approval-rate"]')?.textContent).toBe('50%');
  });

  it('honours the job requested in the URL', async () => {
    await render('j2');
    http.expectOne((r) => r.url === '/api/jobs/j2/applications').flush(page([]));
    await settle();

    expect(el().querySelector('[data-testid="empty-tab"]')?.textContent).toContain(
      'Nenhum candidato aguardando',
    );
  });

  it('approves a candidate and moves them to the approved tab with a chat link', async () => {
    await render('j1');
    http.expectOne((r) => r.url === '/api/jobs/j1/applications').flush(page([applicant('a1', 'PENDENTE')]));
    await settle();

    (el().querySelector('[data-testid="approve-btn"]') as HTMLButtonElement).click();
    const request = http.expectOne('/api/jobs/j1/applications/a1/status');
    expect(request.request.body).toEqual({ status: 'APROVADA' });
    request.flush({});
    await settle();

    expect(rows()).toHaveLength(0);
    (el().querySelector('[data-testid="tab-APROVADA"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(rows()).toHaveLength(1);
    expect(el().querySelector('[data-testid="chat-link"]')?.getAttribute('href')).toBe('/mensagens/j1/p-a1');
  });

  it('reviews the approved professional with the open job and the professional id', async () => {
    await render('j2');
    http
      .expectOne((r) => r.url === '/api/jobs/j2/applications')
      .flush(page([applicant('a1', 'PENDENTE'), applicant('a2', 'APROVADA')]));
    await settle();

    expect(rows()[0].querySelector('[data-testid="review-btn"]')).toBeNull();
    (el().querySelector('[data-testid="tab-APROVADA"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const review = el().querySelector('[data-testid="review-btn"]') as HTMLButtonElement;
    expect(review.textContent).toContain('Avaliar profissional');

    review.click();
    fixture.detectChanges();
    (el().querySelector('[data-testid="star-5"]') as HTMLInputElement).click();
    fixture.detectChanges();
    (el().querySelector('[data-testid="review-submit"]') as HTMLButtonElement).click();

    const request = http.expectOne('/api/users/reviews');
    expect(request.request.body).toEqual({ jobId: 'j2', receiverId: 'p-a2', rating: 5 });
    request.flush({ id: 'rev1' });
    await settle();

    expect(el().querySelector('[data-testid="reviewed"]')?.textContent).toContain('Avaliado ✓');
  });

  it('opens the candidate profile with the summary in the router state', async () => {
    await render('j1');
    http.expectOne((r) => r.url === '/api/jobs/j1/applications').flush(page([applicant('a1', 'PENDENTE')]));
    await settle();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const link = el().querySelector('[data-testid="applicant-link"]') as HTMLAnchorElement;
    expect(link.getAttribute('aria-label')).toBe('Ver perfil de Pessoa a1');
    expect(link.getAttribute('href')).toBe('/profissionais/p-a1?job=j1');
    link.click();

    const [url, extras] = navigate.mock.calls[0];
    expect(TestBed.inject(Router).serializeUrl(url as UrlTree)).toBe('/profissionais/p-a1?job=j1');
    expect(extras?.state).toEqual({
      professional: applicant('a1', 'PENDENTE').professional,
      jobId: 'j1',
      applicationId: 'a1',
      status: 'PENDENTE',
    });
  });

  it('marks a candidate without reviews as Novo', async () => {
    await render('j1');
    const fresh = applicant('a1', 'PENDENTE');
    fresh.professional.averageRating = null;
    http.expectOne((r) => r.url === '/api/jobs/j1/applications').flush(page([fresh]));
    await settle();

    expect(el().querySelector('[data-testid="applicant-rating"]')?.textContent).toBe('Novo');
  });

  it('shows the pending count of every job in the selector and keeps it in sync', async () => {
    await render('j1');
    http
      .expectOne((r) => r.url === '/api/jobs/j1/applications')
      .flush(page([applicant('a1', 'PENDENTE'), applicant('a2', 'PENDENTE')]));
    http.expectOne((r) => r.url === '/api/jobs/j0/applications').flush(page([applicant('a3', 'APROVADA')]));
    http.expectOne((r) => r.url === '/api/jobs/j2/applications').flush(page([applicant('a4', 'PENDENTE')]));
    await settle();

    const options = () => Array.from(el().querySelectorAll('option')).map((o) => o.textContent?.trim());
    expect(options()).toEqual([
      'Vaga j0 · Noite (0) (encerrada)',
      'Vaga j1 · Noite (2)',
      'Vaga j2 · Noite (1)',
    ]);

    (el().querySelector('[data-testid="approve-btn"]') as HTMLButtonElement).click();
    http.expectOne('/api/jobs/j1/applications/a1/status').flush({});
    await settle();
    expect(options()[1]).toBe('Vaga j1 · Noite (1)');
  });
});
