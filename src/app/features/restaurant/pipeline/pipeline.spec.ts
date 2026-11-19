import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Applicant, RestaurantJob } from '../../../core/models/restaurant-jobs.model';
import { Pipeline, appliedAtLabel } from './pipeline';

const job = (id: string, status: RestaurantJob['status'] = 'ABERTA'): RestaurantJob => ({
  id,
  title: 'Vaga ' + id,
  description: 'Descrição',
  requirements: null,
  salary: 1200,
  contractType: 'CLT',
  shift: 'NOITE',
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

  afterEach(() => http.verify());

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
    expect(rows()[0].textContent).toContain('★ 4.8');
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
    expect(el().querySelector('[data-testid="chat-link"]')?.getAttribute('href')).toBe('/mensagens/j1');
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
});
