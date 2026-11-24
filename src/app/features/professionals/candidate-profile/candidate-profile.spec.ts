import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { PublicProfessionalProfile, Review } from '../../../core/models/profile.model';
import { ApplicantProfessional } from '../../../core/models/restaurant-jobs.model';
import { AuthService } from '../../../core/services/auth.service';
import {
  CandidateProfile,
  CandidateProfileState,
  experiencePeriod,
  ratingSummary,
} from './candidate-profile';

@Component({ template: '' })
class Blank {}

const SUMMARY: ApplicantProfessional = {
  id: 'p1',
  fullName: 'Ana Souza',
  mainRole: 'Sushiman',
  profilePhoto: null,
  experienceSummary: 'Resumo vindo da candidatura.',
  averageRating: 4.6,
};

const PROFILE: PublicProfessionalProfile = {
  ...SUMMARY,
  experienceSummary: 'Dez anos de cozinha japonesa.',
  interestedRoles: ['Chef de partida'],
  specialties: ['Sushi', 'Sashimi'],
  city: 'São Paulo',
  state: 'SP',
  neighborhood: 'Pinheiros',
  workModels: ['CLT', 'FREELANCER'],
  mobility: 'REGIONAL',
  reviewsCount: 12,
  memberSince: '2025-01-10T00:00:00.000Z',
  experiences: [
    { company: 'Sushi Bar', role: 'Sushiman', startDate: '2022-03-01', endDate: null, description: 'Balcão.' },
  ],
};

const review = (id: string, extra: Partial<Review> = {}): Review => ({
  id,
  rating: 5,
  comment: `Comentário ${id}`,
  jobId: 'j1',
  reviewerId: 'r1',
  createdAt: new Date().toISOString(),
  ...extra,
});

const reviewsPage = (data: Review[], total = data.length, skip = 0, averageRating: number | null = 4.6) => ({
  data,
  total,
  skip,
  take: 10,
  averageRating,
});

describe('candidate profile helpers', () => {
  it('formats the experience period and the rating summary', () => {
    expect(experiencePeriod('2022-03-01', null)).toBe('mar/2022 – atual');
    expect(experiencePeriod('2019-01-01', '2021-11-30')).toBe('jan/2019 – nov/2021');
    expect(ratingSummary(4.6, 12)).toBe('4,6 · 12 avaliações');
    expect(ratingSummary(5, 1)).toBe('5,0 · 1 avaliação');
  });
});

describe('CandidateProfile', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const el = () => harness.routeNativeElement as HTMLElement;
  const q = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const all = (id: string) =>
    Array.from(el().querySelectorAll(`[data-testid="${id}"]`)).map((node) => node.textContent?.trim());

  const STATE: CandidateProfileState = {
    professional: SUMMARY,
    jobId: 'j1',
    applicationId: 'a1',
    status: 'PENDENTE',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'profissionais/:id', component: CandidateProfile },
          { path: 'pipeline', component: Blank },
          { path: 'mensagens/:jobId', component: Blank },
        ]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => ({ id: 'r1', role: 'RESTAURANTE' }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  // A busca de contratacoes aprovadas roda em todo perfil; os testes que nao tratam dela a descartam.
  afterEach(() => {
    http.match((r) => r.url === '/api/users/me/jobs');
    http.verify();
  });

  async function open(state: CandidateProfileState | null, query: Record<string, string> = { job: 'j1' }) {
    harness = await RouterTestingHarness.create();
    await TestBed.inject(Router).navigate(['/profissionais', 'p1'], {
      queryParams: query,
      ...(state ? { state } : {}),
    });
    harness.detectChanges();
    await harness.fixture.whenStable();
  }

  function flush(profile: PublicProfessionalProfile | null, reviews: ReturnType<typeof reviewsPage>): void {
    const profileRequest = http.expectOne('/api/professionals/p1');
    if (profile) {
      profileRequest.flush(profile);
    } else {
      profileRequest.flush({ message: 'Cannot GET' }, { status: 404, statusText: 'Not Found' });
    }
    http.expectOne((r) => r.url === '/api/users/p1/reviews' && r.params.get('skip') === '0').flush(reviews);
    harness.detectChanges();
  }

  it('shows the average rating and the comments of the reviews', async () => {
    await open(STATE);
    flush(
      PROFILE,
      reviewsPage(
        [
          review('r1', { reviewer: { id: 'u1', name: 'Cantina Bella', photo: null, role: 'RESTAURANTE' } }),
          review('r2', { reviewer: null }),
          review('r3', { comment: null, rating: 4 }),
        ],
        12,
      ),
    );

    expect(q('profile-name')?.textContent).toContain('Ana Souza');
    expect(q('profile-location')?.textContent).toContain('São Paulo/SP');
    expect(q('profile-rating')?.textContent).toContain('4,6 · 12 avaliações');
    expect(q('profile-about')?.textContent).toContain('Dez anos de cozinha japonesa.');
    expect(q('profile-work-models')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('CLT, Freelancer');
    expect(q('profile-mobility')?.textContent).toContain('Regional');
    expect(q('experience-period')?.textContent).toBe('mar/2022 – atual');
    expect(all('review-author')).toEqual(['Cantina Bella', 'Restaurante parceiro', 'Restaurante parceiro']);
    expect(all('review-comment')).toEqual(['Comentário r1', 'Comentário r2']);
    expect(el().querySelectorAll('[data-testid="review"]')[2].querySelector('.stars')).not.toBeNull();
  });

  it('shows the empty state when there are no reviews', async () => {
    await open(STATE);
    flush({ ...PROFILE, averageRating: null, reviewsCount: 0 }, reviewsPage([], 0, 0, null));

    expect(q('reviews-empty')?.textContent).toContain('Este profissional ainda não recebeu avaliações.');
    expect(q('profile-rating')?.textContent).toContain('Ainda sem avaliações');
    expect(q('more-reviews')).toBeNull();
  });

  it('keeps the summary from the application when GET /professionals/:id fails', async () => {
    await open(STATE);
    expect(q('profile-name')?.textContent).toContain('Ana Souza');

    flush(null, reviewsPage([review('r1')], 1, 0, 5));

    expect(q('profile-error')).toBeNull();
    expect(q('profile-name')?.textContent).toContain('Ana Souza');
    expect(q('profile-about')?.textContent).toContain('Resumo vindo da candidatura.');
    expect(q('profile-specialties')).toBeNull();
    expect(q('experience')).toBeNull();
  });

  it('shows a skeleton and then an error with retry when there is nothing to show', async () => {
    await open(null, {});
    expect(q('profile-loading')).not.toBeNull();

    flush(null, reviewsPage([], 0, 0, null));

    expect(q('profile-error')?.textContent).toContain('Não encontramos este profissional.');
    q('retry-btn')!.click();
    flush(PROFILE, reviewsPage([], 0, 0, null));
    expect(q('profile-name')?.textContent).toContain('Ana Souza');
  });

  it('loads more reviews with skip and take', async () => {
    await open(STATE);
    const firstPage = Array.from({ length: 10 }, (_, i) => review('r' + i));
    flush(PROFILE, reviewsPage(firstPage, 12));

    q('more-reviews')!.click();
    harness.detectChanges();
    http
      .expectOne((r) => r.url === '/api/users/p1/reviews' && r.params.get('skip') === '10')
      .flush(reviewsPage([review('r10'), review('r11')], 12, 10));
    harness.detectChanges();

    expect(el().querySelectorAll('[data-testid="review"]')).toHaveLength(12);
    expect(q('more-reviews')).toBeNull();
  });

  it('approves a pending application and updates the status', async () => {
    await open(STATE);
    flush(PROFILE, reviewsPage([], 0, 0, null));

    expect(q('application-status')?.textContent).toContain('Aguardando sua decisão');
    q('approve-btn')!.click();
    harness.detectChanges();
    const request = http.expectOne('/api/jobs/j1/applications/a1/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'APROVADA' });
    request.flush({});
    harness.detectChanges();

    expect(q('application-status')?.textContent).toContain('Aprovado');
    expect(q('approve-btn')).toBeNull();
    expect(q('chat-link')?.getAttribute('href')).toBe('/mensagens/j1/p1');
  });

  it('hides the decision buttons when the job was closed (422)', async () => {
    await open(STATE);
    flush(PROFILE, reviewsPage([], 0, 0, null));

    q('reject-btn')!.click();
    harness.detectChanges();
    http
      .expectOne('/api/jobs/j1/applications/a1/status')
      .flush({ message: 'Vaga encerrada não aceita alterações' }, { status: 422, statusText: 'Unprocessable Entity' });
    harness.detectChanges();

    expect(q('decision-error')?.textContent).toContain('Vaga encerrada não aceita alterações.');
    expect(q('approve-btn')).toBeNull();
    expect(q('reject-btn')).toBeNull();
  });

  it('finds the application again after a reload, using ?job= from the URL', async () => {
    await open(null);
    http
      .expectOne((r) => r.url === '/api/jobs/j1/applications')
      .flush({
        data: [{ applicationId: 'a1', status: 'APROVADA', applicationDate: '2026-11-18T12:00:00.000Z', professional: SUMMARY }],
        total: 1,
        skip: 0,
        take: 50,
      });
    flush(PROFILE, reviewsPage([], 0, 0, null));

    expect(q('application-status')?.textContent).toContain('Aprovado');
    expect(q('back-link')?.getAttribute('href')).toBe('/pipeline?job=j1');
  });

  describe('rating the professional', () => {
    const JOB = {
      id: 'j1',
      title: 'Sushiman',
      description: '',
      requirements: null,
      salary: null,
      contractType: 'CLT',
      shifts: ['NOITE'],
      status: 'ABERTA',
      urgent: false,
      createdAt: '2026-11-18T12:00:00.000Z',
    };
    const applicants = (status: string) => ({
      data: [{ applicationId: 'a1', status, applicationDate: '2026-11-18T12:00:00.000Z', professional: SUMMARY }],
      total: 1,
      skip: 0,
      take: 50,
    });

    function flushHires(status: string): void {
      http.expectOne((r) => r.url === '/api/users/me/jobs').flush({ data: [JOB], total: 1, skip: 0, take: 50 });
      http.expectOne((r) => r.url === '/api/jobs/j1/applications').flush(applicants(status));
      harness.detectChanges();
    }

    it('shows the review button only for jobs where the professional was approved', async () => {
      await open(null, {});
      flush(PROFILE, reviewsPage([], 0, 0, null));
      flushHires('APROVADA');

      expect(q('rate-panel')).not.toBeNull();
      expect(q('rate-item')?.textContent).toContain('Sushiman');
      expect(q('review-btn')?.textContent).toContain('Avaliar');
    });

    it('hides the review button without an approval', async () => {
      await open(null, {});
      flush(PROFILE, reviewsPage([], 0, 0, null));
      flushHires('PENDENTE');

      expect(q('rate-panel')).toBeNull();
      expect(q('review-btn')).toBeNull();
    });
  });
});
