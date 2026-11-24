import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Review } from '../../../core/models/profile.model';
import { RestaurantPublicProfile } from '../../../core/models/restaurant.model';
import { AuthService } from '../../../core/services/auth.service';
import { RestaurantProfile, jobMetaLine, reviewsCountLabel } from './restaurant-profile';

@Component({ template: '' })
class StubPage {}

const ID = '701cce5e-1cc4-45e5-8e6a-4d5751ee259f';
const PROFILE_URL = `/api/restaurants/${ID}`;
const REVIEWS_URL = `/api/users/${ID}/reviews`;

function restaurant(overrides: Partial<RestaurantPublicProfile> = {}): RestaurantPublicProfile {
  return {
    id: ID,
    restaurantName: 'Cantina Bella Massa',
    cuisineType: 'Italiana',
    description: 'Cantina italiana tradicional com massas artesanais e forno a lenha.',
    address: 'Rua das Flores, 123 - Centro, São Paulo - SP',
    phone: '(11) 98765-4321',
    zipCode: '01001-000',
    logoUrl: null,
    averageRating: 4.5,
    reviewsCount: 12,
    openJobs: [
      {
        id: 'job-1',
        title: 'Cozinheiro(a) de massas',
        contractType: 'CLT',
        salary: 3200,
        shifts: ['MANHA', 'TARDE'],
        urgent: true,
        createdAt: '2026-11-19T09:20:05.590Z',
      },
      {
        id: 'job-2',
        title: 'Barista para fins de semana',
        contractType: 'FREELANCER',
        salary: null,
        shifts: [],
        urgent: false,
        createdAt: '2026-11-18T09:20:05.590Z',
      },
    ],
    ...overrides,
  };
}

const REVIEWS: Review[] = [
  {
    id: 'r1',
    rating: 5,
    comment: 'Um ambiente de trabalho excepcional.',
    jobId: 'j1',
    reviewerId: 'u1',
    createdAt: '2024-05-01T12:00:00Z',
  },
];

function reviewsPage(data: Review[]) {
  return { data, total: data.length, skip: 0, take: 20, averageRating: 5 };
}

describe('restaurant profile helpers', () => {
  it('pluralises the reviews count', () => {
    expect(reviewsCountLabel(1)).toBe('(1 avaliação)');
    expect(reviewsCountLabel(12)).toBe('(12 avaliações)');
  });

  it('joins contract and shift labels, skipping a missing shift', () => {
    expect(jobMetaLine(restaurant().openJobs[0])).toBe('CLT • Manhã e Tarde');
    expect(jobMetaLine(restaurant().openJobs[1])).toBe('Freelancer');
  });
});

describe('RestaurantProfile', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let user: { id: string; role: 'PROFISSIONAL' | 'RESTAURANTE' };

  const el = () => harness.routeNativeElement as HTMLElement;
  const node = (testid: string) => el().querySelector<HTMLElement>(`[data-testid="${testid}"]`);
  const text = (testid: string) => node(testid)?.textContent?.trim().replace(/\s+/g, ' ');
  const all = (testid: string) =>
    Array.from(el().querySelectorAll(`[data-testid="${testid}"]`)).map((n) =>
      n.textContent?.trim().replace(/\s+/g, ' '),
    );

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function open(id = ID): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/restaurantes/${id}`);
    await settle();
  }

  async function render(
    profile: RestaurantPublicProfile = restaurant(),
    reviews: Review[] = REVIEWS,
  ): Promise<void> {
    await open();
    http.expectOne(PROFILE_URL).flush(profile);
    await settle();
    http.expectOne(REVIEWS_URL).flush(reviewsPage(reviews));
    await settle();
  }

  beforeEach(() => {
    user = { id: 'prof-1', role: 'PROFISSIONAL' };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'restaurantes/:id', component: RestaurantProfile },
          { path: 'vagas/:id', component: StubPage },
          { path: 'pipeline', component: StubPage },
          { path: 'my-jobs/:id/preview', component: StubPage },
          { path: 'home', component: StubPage },
        ]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => user } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  // A busca de contratacoes aprovadas roda em todo perfil; os testes que nao tratam dela a descartam.
  afterEach(() => {
    http.match((r) => r.url === '/api/users/me/applications');
    http.verify();
  });

  it('renders the restaurant data from a single GET', async () => {
    await render();

    expect(text('restaurant-name')).toBe('Cantina Bella Massa');
    expect(text('restaurant-category')).toBe('Italiana');
    expect(text('restaurant-logo')).toBe('CM');
    expect(node('restaurant-rating')?.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Nota 4,5 de 5',
    );
    expect(text('restaurant-reviews-count')).toBe('(12 avaliações)');
    expect(text('restaurant-about')).toContain('massas artesanais');
    expect(text('restaurant-address')).toBe('Rua das Flores, 123 - Centro, São Paulo - SP');
    expect(node('restaurant-phone')?.querySelector('a')?.getAttribute('href')).toBe('tel:(11) 98765-4321');
    expect(node('restaurant-events')).toBeNull();
  });

  it('uses the logo image when there is one', async () => {
    await render(restaurant({ logoUrl: '/logo.png' }));

    expect(node('restaurant-logo')?.querySelector('img')?.getAttribute('src')).toBe('/logo.png');
  });

  it('says "Sem avaliações ainda" without a rating', async () => {
    await render(restaurant({ averageRating: null, reviewsCount: 0 }), []);

    expect(text('restaurant-rating')).toBe('Sem avaliações ainda');
  });

  it('shows the events badge for a restaurant without zip code', async () => {
    await render(restaurant({ zipCode: null }));

    expect(text('restaurant-events')).toBe('Atende em eventos');
  });

  it('lists open jobs with contract, shift, salary in R$ or "A combinar" and the urgent badge', async () => {
    await render();

    expect(all('job-title')).toEqual(['Cozinheiro(a) de massas', 'Barista para fins de semana']);
    expect(all('job-meta')).toEqual(['CLT • Manhã e Tarde', 'Freelancer']);
    expect(all('job-salary')[0]).toMatch(/^R\$\s3\.200,00$/);
    expect(all('job-salary')[1]).toBe('A combinar');
    expect(all('job-urgent')).toEqual(['Urgente']);
  });

  it('a professional opens the job detail from the card', async () => {
    await render();

    const link = node('job-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/vagas/job-1');
    link.click();
    await settle();

    expect(TestBed.inject(Router).url).toBe('/vagas/job-1');
  });

  it('the owner opens the job preview from "Ver vaga"', async () => {
    user = { id: ID, role: 'RESTAURANTE' };
    await render();

    const link = node('job-link') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Ver vaga');
    expect(link.getAttribute('href')).toBe('/my-jobs/job-1/preview');
    link.click();
    await settle();

    expect(TestBed.inject(Router).url).toBe('/my-jobs/job-1/preview');
  });

  it('the owner sees the "Editar perfil" link', async () => {
    user = { id: ID, role: 'RESTAURANTE' };
    await render();
    expect((node('edit-profile-link') as HTMLAnchorElement).getAttribute('href')).toBe('/restaurant-profile/edit');
  });

  it('another account does not see the "Editar perfil" link', async () => {
    user = { id: 'r-9', role: 'RESTAURANTE' };
    await render();
    expect(node('edit-profile-link')).toBeNull();
  });

  it('another restaurant sees the jobs without a link it could not open', async () => {
    user = { id: 'other', role: 'RESTAURANTE' };
    await render();

    expect(all('job')).toHaveLength(2);
    expect(node('job-link')).toBeNull();
  });

  it('shows the empty message without open jobs', async () => {
    await render(restaurant({ openJobs: [] }));

    expect(text('jobs-empty')).toBe('Nenhuma vaga aberta no momento');
    expect(node('job')).toBeNull();
  });

  it('renders the recent reviews with the fixed "Profissional" label', async () => {
    await render();

    expect(all('review')).toHaveLength(1);
    expect(text('review-author')).toBe('Profissional');
    expect(node('review-stars')?.getAttribute('aria-label')).toBe('Nota 5,0 de 5');
    expect(text('review-text')).toBe('“Um ambiente de trabalho excepcional.”');
  });

  it('a reviews failure keeps the restaurant on screen', async () => {
    await open();
    http.expectOne(PROFILE_URL).flush(restaurant());
    await settle();
    http.expectOne(REVIEWS_URL).flush(null, { status: 503, statusText: 'Unavailable' });
    await settle();

    expect(text('restaurant-name')).toBe('Cantina Bella Massa');
    expect(text('reviews-error')).toContain('Tentar de novo');
  });

  it('404 shows "Restaurante não encontrado" without the HTTP status', async () => {
    await open();
    http
      .expectOne(PROFILE_URL)
      .flush({ message: 'Restaurante não encontrado' }, { status: 404, statusText: 'Not Found' });
    await settle();

    expect(text('not-found')).toContain('Restaurante não encontrado');
    expect(text('not-found')).not.toMatch(/404/);
    expect(node('back-link')?.getAttribute('href')).toBe('/home');
    expect(node('restaurant-name')).toBeNull();
  });

  it('treats an id that is not a UUID (400) as not found', async () => {
    await open('nao-existe');
    http
      .expectOne('/api/restaurants/nao-existe')
      .flush({ message: 'Validation failed (uuid is expected)' }, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(text('not-found')).toContain('Restaurante não encontrado');
    expect(el().textContent).not.toContain('uuid');
  });

  it('shows actionable copy on failure and retries', async () => {
    await open();
    http.expectOne(PROFILE_URL).flush(null, { status: 500, statusText: 'Error' });
    await settle();

    expect(text('error')).toContain('Tente de novo');
    expect(text('error')).not.toMatch(/500|api/i);

    node('retry-btn')!.click();
    await settle();
    http.expectOne(PROFILE_URL).flush(restaurant());
    await settle();
    http.expectOne(REVIEWS_URL).flush(reviewsPage([]));
    await settle();

    expect(text('restaurant-name')).toBe('Cantina Bella Massa');
  });

  describe('rating the restaurant', () => {
    const myApplications = (status: string, restaurantId = ID) => ({
      data: [
        {
          applicationId: 'a1',
          status,
          applicationDate: '2026-11-18T12:00:00.000Z',
          job: { id: 'job-1', title: 'Cozinheiro(a) de massas' },
          restaurant: { id: restaurantId, name: 'Cantina Bella Massa' },
        },
      ],
      total: 1,
      skip: 0,
      take: 50,
    });

    async function flushHires(page: ReturnType<typeof myApplications>): Promise<void> {
      http.expectOne((r) => r.url === '/api/users/me/applications').flush(page);
      await settle();
    }

    it('a professional approved by this restaurant sees the review button', async () => {
      await render();
      await flushHires(myApplications('APROVADA'));

      expect(node('rate-panel')).not.toBeNull();
      expect(text('rate-item')).toContain('Cozinheiro(a) de massas');
      expect(text('review-btn')).toContain('Avaliar');
    });

    it('hides the button without an approval', async () => {
      await render();
      await flushHires(myApplications('PENDENTE'));
      expect(node('rate-panel')).toBeNull();
    });

    it('hides the button for an approval at another restaurant', async () => {
      await render();
      await flushHires(myApplications('APROVADA', 'outro-restaurante'));
      expect(node('rate-panel')).toBeNull();
    });

    it('a restaurant never sees the review button nor looks up applications', async () => {
      user = { id: 'r-9', role: 'RESTAURANTE' };
      await render();

      http.expectNone((r) => r.url === '/api/users/me/applications');
      expect(node('rate-panel')).toBeNull();
    });
  });
});
