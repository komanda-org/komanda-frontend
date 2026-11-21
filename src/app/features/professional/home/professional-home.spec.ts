import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { MyApplication } from '../../../core/models/applications.model';
import { ProfessionalHome, firstName } from './professional-home';

const application = (
  id: string,
  status: MyApplication['status'],
  date: string,
): MyApplication => ({
  applicationId: id,
  status,
  applicationDate: date,
  job: { id: 'job-' + id, title: 'Vaga ' + id },
  restaurant: { id: 'r1', name: 'Cantina Bella Massa' },
});

describe('firstName', () => {
  it('capitalises the first name and ignores empty values', () => {
    expect(firstName('jose ravani')).toBe('Jose');
    expect(firstName('   ')).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});

describe('ProfessionalHome', () => {
  let fixture: ComponentFixture<ProfessionalHome>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const text = (id: string) => el().querySelector(`[data-testid="${id}"]`)?.textContent?.trim();

  async function render(
    applications: MyApplication[],
    profile: { status: number } | { fullName: string } = { fullName: 'jose ravani' },
  ): Promise<void> {
    fixture = TestBed.createComponent(ProfessionalHome);
    fixture.detectChanges();
    await fixture.whenStable();
    http
      .expectOne((r) => r.url === '/api/users/me/applications')
      .flush({ data: applications, total: applications.length, skip: 0, take: 50 });
    const jobs = http.expectOne((r) => r.url === '/api/jobs/search');
    expect(jobs.request.params.get('take')).toBe('1');
    jobs.flush({ data: [], total: 7, skip: 0, take: 1 });
    const me = http.expectOne('/api/users/me');
    if ('status' in profile) {
      me.flush(null, { status: profile.status, statusText: 'Error' });
    } else {
      me.flush(profile);
    }
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProfessionalHome],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('greets by first name and counts applications and open jobs', async () => {
    await render([
      application('a1', 'PENDENTE', '2026-11-18T10:00:00Z'),
      application('a2', 'APROVADA', '2026-11-19T10:00:00Z'),
      application('a3', 'REJEITADA', '2026-11-10T10:00:00Z'),
    ]);

    expect(text('greeting')).toMatch(/, Jose!$/);
    expect(text('stat-pending')).toBe('1');
    expect(text('stat-matches')).toBe('1');
    expect(text('stat-jobs')).toBe('7');
    expect(text('matches-alert')).toContain('Um restaurante aprovou');
  });

  it('lists the newest applications first, with a chat link only for approved ones', async () => {
    await render([
      application('a1', 'PENDENTE', '2026-11-18T10:00:00Z'),
      application('a2', 'APROVADA', '2026-11-19T10:00:00Z'),
    ]);

    const rows = el().querySelectorAll('[data-testid="application-row"]');
    expect(rows[0].textContent).toContain('Vaga a2');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/mensagens/job-a2');
    expect(rows[1].textContent).toContain('Em análise');
    expect(rows[1].querySelector('a')).toBeNull();
  });

  it('offers "Avaliar restaurante" on the approved application with job and restaurant ids', async () => {
    await render([
      application('a1', 'PENDENTE', '2026-11-18T10:00:00Z'),
      application('a2', 'APROVADA', '2026-11-19T10:00:00Z'),
    ]);
    const rows = el().querySelectorAll('[data-testid="application-row"]');
    expect(rows[1].querySelector('[data-testid="review-btn"]')).toBeNull();

    (rows[0].querySelector('[data-testid="review-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el().querySelector('[data-testid="star-3"]') as HTMLInputElement).click();
    fixture.detectChanges();
    (el().querySelector('[data-testid="review-submit"]') as HTMLButtonElement).click();

    const request = http.expectOne('/api/users/reviews');
    expect(request.request.body).toEqual({ jobId: 'job-a2', receiverId: 'r1', rating: 3 });
    request.flush({ id: 'rev1' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text('reviewed')).toContain('Avaliado ✓');
  });

  it('still renders without the profile name when the profile fails', async () => {
    await render([], { status: 404 });

    expect(text('greeting')).toMatch(/^(Bom dia|Boa tarde|Boa noite)!$/);
    expect(el().querySelector('[data-testid="empty"]')).not.toBeNull();
  });
});
