import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Review } from '../../../core/models/profile.model';
import { RestaurantsService } from '../../../core/services/restaurants.service';
import { RestaurantProfile } from './restaurant-profile';

@Component({ template: '' })
class JobDetailStub {}

const SLUG = 'l-atelier-des-sens';
const REVIEWS_URL = `/api/users/${SLUG}/reviews`;

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

function page(data: Review[]) {
  return { data, total: data.length, skip: 0, take: 20, averageRating: 5 };
}

describe('RestaurantProfile', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let service: RestaurantsService;

  const el = () => harness.routeNativeElement as HTMLElement;
  const node = (testid: string) => el().querySelector<HTMLElement>(`[data-testid="${testid}"]`);
  const text = (testid: string) => node(testid)?.textContent?.trim();
  const all = (testid: string) =>
    Array.from(el().querySelectorAll(`[data-testid="${testid}"]`)).map((n) => n.textContent?.trim());

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function open(slug = SLUG): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/restaurantes/${slug}`);
    await settle();
  }

  async function render(reviews: Review[] = REVIEWS): Promise<void> {
    await open();
    http.expectOne(REVIEWS_URL).flush(page(reviews));
    await settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'restaurantes/:slug', component: RestaurantProfile },
          { path: 'vagas/:id', component: JobDetailStub },
          { path: 'vagas', component: JobDetailStub },
        ]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(RestaurantsService);
  });

  afterEach(() => http.verify());

  it('shows cover, logo, badges, name, location, about and pay, in this order', async () => {
    await render();

    const order = [
      'restaurant-cover',
      'restaurant-logo',
      'restaurant-badges',
      'restaurant-name',
      'restaurant-location',
      'restaurant-about',
      'restaurant-pay',
    ];
    const nodes = order.map((id) => node(id)!);
    nodes.forEach((current, i) => {
      expect(current).not.toBeNull();
      if (i > 0) {
        expect(nodes[i - 1].compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    expect(text('restaurant-category')).toBe('Alta Gastronomia');
    expect(text('restaurant-rating')).toBe('4,9');
    expect(text('restaurant-name')).toBe("L'Atelier des Sens");
    expect(text('restaurant-location')).toBe('São Paulo, SP');
    expect(text('restaurant-about')).toContain('Sobre Nós');
    expect(text('restaurant-pay')).toContain('R$ 5.000 + Gorjetas');
  });

  it('lists each job with title, sector • shift, description, salary and Aplicar Agora', async () => {
    await render();

    expect(all('job-title')).toEqual(['Chef de Partie', 'Sommelier Pleno']);
    expect(all('job-meta')).toEqual(['Cozinha Quente • Integral', 'Salão • Noturno']);
    expect(all('job-salary')).toEqual(['R$ 4.500 - R$ 6.000', 'R$ 5.000 + Gorjetas']);
    expect(all('job-description')[0]).toContain('Buscamos um Chef de Partie');
    expect(all('job-apply')).toEqual(['Aplicar Agora', 'Aplicar Agora']);
    expect(all('job-urgent')).toEqual(['Urgente']);
    expect(el().querySelectorAll('[data-testid="job"]')[0].querySelector('[data-testid="job-urgent"]')).not.toBeNull();
  });

  it('Aplicar Agora opens the job detail', async () => {
    await render();

    const apply = node('job-apply') as HTMLAnchorElement;
    expect(apply.getAttribute('href')).toBe('/vagas/chef-de-partie');

    apply.click();
    await settle();

    expect(TestBed.inject(Router).url).toBe('/vagas/chef-de-partie');
  });

  it('keeps Ver Todas disabled with a visible reason, not a dead link', async () => {
    await render();

    const seeAll = node('see-all')!;
    expect(seeAll.tagName).toBe('BUTTON');
    expect(seeAll.getAttribute('aria-disabled')).toBe('true');
    expect(text('see-all-reason')).toBeTruthy();
  });

  it('shows an actionable empty state without open jobs', async () => {
    vi.spyOn(service, 'listOpenJobs').mockReturnValue(of([]));
    await render();

    expect(text('jobs-empty')).toContain('Nenhuma vaga aberta no momento.');
    expect(el().querySelector('[data-testid="job"]')).toBeNull();
  });

  it('renders the recent reviews with avatar, name, stars and testimonial', async () => {
    await render();

    expect(all('review')).toHaveLength(1);
    expect(text('review-avatar')).toBe('P');
    expect(text('review-author')).toBe('Profissional');
    expect(node('review-stars')?.getAttribute('aria-label')).toBe('Nota 5,0 de 5');
    expect(el().querySelectorAll('[data-testid="review-stars"] .star--full')).toHaveLength(5);
    expect(text('review-text')).toBe('“Um ambiente de trabalho excepcional.”');
  });

  it('skips reviews without a testimonial', async () => {
    await render([{ ...REVIEWS[0], id: 'r2', comment: null }, REVIEWS[0]]);

    expect(all('review')).toHaveLength(1);
  });

  it('shows an empty state without reviews', async () => {
    await render([]);

    expect(text('reviews-empty')).toContain('ainda não recebeu avaliações');
  });

  it('a reviews failure keeps the restaurant on screen', async () => {
    await open();
    http.expectOne(REVIEWS_URL).flush(null, { status: 503, statusText: 'Unavailable' });
    await settle();

    expect(text('restaurant-name')).toBe("L'Atelier des Sens");
    expect(text('reviews-error')).toContain('Tentar de novo');
  });

  it('an unknown restaurant offers the way back to /vagas, without HTTP status', async () => {
    await open('nao-existe');

    expect(text('not-found')).toContain('Não encontramos este restaurante');
    expect(text('not-found')).not.toMatch(/404/);
    expect(node('back-to-jobs')?.getAttribute('href')).toBe('/vagas');
    expect(node('restaurant-name')).toBeNull();
  });

  it('shows actionable copy on failure and retries', async () => {
    const getBySlug = service.getBySlug.bind(service);
    vi.spyOn(service, 'getBySlug')
      .mockReturnValueOnce(throwError(() => ({ status: 500, messages: ['boom'] })))
      .mockImplementation(getBySlug);
    await open();

    expect(text('error')).toContain('Tente de novo');
    expect(text('error')).not.toMatch(/500|api/i);

    node('retry-btn')!.click();
    await settle();
    http.expectOne(REVIEWS_URL).flush(page(REVIEWS));
    await settle();

    expect(text('restaurant-name')).toBe("L'Atelier des Sens");
  });
});
