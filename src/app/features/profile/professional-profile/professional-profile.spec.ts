import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Experience, ProfessionalMe, Review } from '../../../core/models/profile.model';
import {
  ProfessionalProfilePage,
  averageRating,
  describeError,
  formatLocation,
  formatPeriod,
  formatRating,
  sortExperiences,
  starFills,
} from './professional-profile';

const FOGO: Experience = {
  id: 'e1',
  company: 'Fogo & Alma (Estrela Michelin)',
  role: 'Chef de Cuisine',
  startDate: '2019-01-01',
  endDate: null,
  description: 'Comando da brigada e do cardápio de carnes.',
};

const ORIGEM: Experience = {
  id: 'e2',
  company: 'Restaurante Origem',
  role: 'Sous Chef',
  startDate: '2015-01-01',
  endDate: '2019-01-01',
  description: null,
};

const BOEUF: Experience = {
  id: 'e3',
  company: 'Le Boeuf (Paris)',
  role: 'Chef de Partie',
  startDate: '2012-01-01',
  endDate: '2015-01-01',
  description: null,
};

const SPECIALTIES = ['Parrilla', 'Carnes Especiais', 'Cozinha Autoral', 'Gestão de Equipe'];

function profile(overrides: Partial<ProfessionalMe> = {}): ProfessionalMe {
  return {
    role: 'PROFISSIONAL',
    id: 'u1',
    fullName: 'João Alberto',
    mainRole: 'Chef de Cuisine Especialista em Carnes',
    profilePhoto: null,
    experienceSummary: 'Com mais de 15 anos de experiência nas melhores parrilhas.',
    specialties: SPECIALTIES,
    neighborhood: null,
    city: 'São Paulo',
    state: 'SP',
    experiences: [ORIGEM, BOEUF, FOGO],
    availability: { workModels: ['PJ', 'FREELANCER'], mobility: 'NACIONAL' },
    ...overrides,
  };
}

const REVIEWS: Review[] = [
  {
    id: 'r1',
    rating: 5,
    comment: 'Domínio absoluto do fogo.',
    createdAt: '2024-03-01T12:00:00Z',
    jobId: 'j1',
    reviewerId: 'rest-1',
  },
  {
    id: 'r2',
    rating: 4.5,
    comment: 'Liderança e técnica impecáveis.',
    createdAt: '2024-05-01T12:00:00Z',
    jobId: 'j2',
    reviewerId: 'rest-2',
  },
];

function reviewsPage(data: Review[]) {
  return { data, total: data.length, skip: 0, take: 20, averageRating: null };
}

describe('ProfessionalProfile — pure functions', () => {
  it('sorts experiences from the most recent, current job first', () => {
    expect(sortExperiences([ORIGEM, BOEUF, FOGO]).map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('formats the period in years, as the spec shows', () => {
    expect(formatPeriod('2019-01-01', null)).toBe('2019 - Presente');
    expect(formatPeriod('2015-01-01', '2019-01-01')).toBe('2015 - 2019');
  });

  it('formats the location as "city, state"', () => {
    expect(formatLocation(profile())).toBe('São Paulo, SP');
    expect(formatLocation(profile({ city: null, state: null, neighborhood: null }))).toBeNull();
  });

  it('computes the average and the star fills, half star included', () => {
    expect(averageRating(REVIEWS)).toBe(4.8);
    expect(averageRating([])).toBeNull();
    expect(starFills(4.8)).toEqual(['full', 'full', 'full', 'full', 'half']);
    expect(starFills(3)).toEqual(['full', 'full', 'full', 'empty', 'empty']);
  });

  it('formats ratings with the pt-BR decimal comma', () => {
    expect(formatRating(4.8)).toBe('4,8');
    expect(formatRating(5)).toBe('5,0');
  });

  it('never exposes the HTTP status in the error copy', () => {
    for (const status of [0, 401, 403, 404, 500, 418]) {
      expect(describeError({ status, messages: ['x'] })).not.toMatch(/\d{3}/);
    }
  });
});

describe('ProfessionalProfilePage', () => {
  let fixture: ComponentFixture<ProfessionalProfilePage>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = (testid: string) => el().querySelector(`[data-testid="${testid}"]`)?.textContent?.trim();
  const all = (testid: string) =>
    Array.from(el().querySelectorAll(`[data-testid="${testid}"]`)).map((n) => n.textContent?.trim());

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function start(): Promise<void> {
    fixture = TestBed.createComponent(ProfessionalProfilePage);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function render(me: ProfessionalMe = profile(), reviews: Review[] = REVIEWS): Promise<void> {
    await start();
    http.expectOne('/api/users/me').flush(me);
    await settle();
    http.expectOne(`/api/users/${me.id}/reviews`).flush(reviewsPage(reviews));
    await settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProfessionalProfilePage],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows photo, name, role, location, bio and the four tags, in this order', async () => {
    await render();

    const order = ['profile-photo', 'profile-name', 'profile-role', 'profile-location', 'profile-about', 'profile-specialties'];
    const nodes = order.map((id) => el().querySelector(`[data-testid="${id}"]`)!);
    nodes.forEach((node, i) => {
      expect(node).not.toBeNull();
      if (i > 0) {
        expect(nodes[i - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    expect(text('profile-name')).toBe('João Alberto');
    expect(text('profile-role')).toBe('Chef de Cuisine Especialista em Carnes');
    expect(text('profile-location')).toBe('São Paulo, SP');
    expect(all('specialty')).toEqual(SPECIALTIES);
    expect(el().querySelector('[data-testid="specialty"]')?.classList).toContain('k-tag');
  });

  it('lists role, company and period from the most recent, with the description', async () => {
    await render();

    expect(all('experience-role')).toEqual(['Chef de Cuisine', 'Sous Chef', 'Chef de Partie']);
    expect(all('experience-company')).toEqual([
      'Fogo & Alma (Estrela Michelin)',
      'Restaurante Origem',
      'Le Boeuf (Paris)',
    ]);
    expect(all('experience-period')).toEqual(['2019 - Presente', '2015 - 2019', '2012 - 2015']);
    expect(all('experience-description')).toEqual(['Comando da brigada e do cardápio de carnes.']);

    const steps = el().querySelectorAll('[data-testid="experience"]');
    expect(steps[0].classList).toContain('step--current');
    expect(steps[1].classList).not.toContain('step--current');
  });

  it('does not mark any position as current when all of them have ended', async () => {
    await render(profile({ experiences: [ORIGEM, BOEUF] }));

    const steps = Array.from(el().querySelectorAll('[data-testid="experience"]'));
    expect(steps).toHaveLength(2);
    expect(steps.some((step) => step.classList.contains('step--current'))).toBe(false);
  });

  it('shows an actionable empty state without positions, not an error', async () => {
    await render(profile({ experiences: [] }));

    expect(text('experiences-empty')).toContain('Adicione suas experiências');
    expect(el().querySelector('[role="alert"]')).toBeNull();
  });

  it('shows availability with MODELO before MOBILIDADE', async () => {
    await render();

    const terms = Array.from(el().querySelectorAll('[data-testid="availability"] dt')).map((n) => n.textContent?.trim());
    expect(terms).toEqual(['Modelo', 'Mobilidade']);
    expect(all('availability-model')).toEqual(['PJ', 'Freelancer']);
    expect(text('availability-mobility')).toBe('Nacional');
  });

  it('renders one card per recommendation with stars, text and a generic author', async () => {
    await render();

    expect(all('review')).toHaveLength(2);
    expect(all('review-author')).toEqual(['Restaurante', 'Restaurante']);
    expect(all('review-text')).toEqual(['“Liderança e técnica impecáveis.”', '“Domínio absoluto do fogo.”']);
    expect(el().querySelector('[data-testid="review"] .stars')?.getAttribute('aria-label')).toBe('Nota 4,5 de 5');
  });

  it('shows an empty state without recommendations and hides the rating', async () => {
    await render(profile(), []);

    expect(text('reviews-empty')).toContain('ainda não recebeu recomendações');
    expect(el().querySelector('[data-testid="profile-rating"]')).toBeNull();
  });

  it('enables EDIT as a link to the edit page once the profile loads', async () => {
    await start();
    expect(el().querySelector('[data-testid="edit-btn"]')).toBeNull();
    http.expectOne('/api/users/me').flush(profile());
    await settle();
    http.expectOne('/api/users/u1/reviews').flush(reviewsPage(REVIEWS));
    await settle();

    const edit = el().querySelector('[data-testid="edit-btn"]')!;
    expect(edit.getAttribute('href')).toBe('/perfil/editar');
    expect(edit.hasAttribute('aria-disabled')).toBe(false);
  });

  it('offers account deletion with the profile-specific consequence', async () => {
    await render();

    expect(el().querySelector('app-delete-account')).not.toBeNull();
    expect(text('delete-account-btn')).toBe('Excluir minha conta');

    el().querySelector<HTMLButtonElement>('[data-testid="delete-account-btn"]')!.click();
    await settle();

    expect(text('delete-confirm')).toContain('Seu perfil deixa de aparecer nas buscas.');
  });

  it('keeps account deletion available when the profile fails to load', async () => {
    await start();
    http.expectOne('/api/users/me').flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(text('error')).toContain('Tente de novo');
    expect(el().querySelector('app-delete-account')).not.toBeNull();
  });

  it('shows "Não informada" when availability has no mobility', async () => {
    await render(profile({ availability: { workModels: ['CLT'], mobility: null } }));

    expect(text('availability-mobility')).toBe('Não informada');
  });

  it('shows actionable copy on failure and retries', async () => {
    await start();
    http.expectOne('/api/users/me').flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(text('error')).toContain('Tente de novo');
    expect(text('error')).not.toMatch(/500/);

    el().querySelector<HTMLButtonElement>('[data-testid="retry-btn"]')!.click();
    http.expectOne('/api/users/me').flush(profile());
    await settle();
    http.expectOne('/api/users/u1/reviews').flush(reviewsPage(REVIEWS));
    await settle();

    expect(text('profile-name')).toBe('João Alberto');
  });

  it('an expired session offers login instead of a retry that would fail forever', async () => {
    await start();
    http.expectOne('/api/users/me').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await settle();

    expect(text('error')).toContain('Sua sessão expirou');
    expect(el().querySelector('[data-testid="login-link"]')?.getAttribute('href')).toBe('/login');
    expect(el().querySelector('[data-testid="retry-btn"]')).toBeNull();
  });

  it('a recommendations failure keeps the profile on screen', async () => {
    await start();
    http.expectOne('/api/users/me').flush(profile());
    await settle();
    http.expectOne('/api/users/u1/reviews').flush(null, { status: 503, statusText: 'Unavailable' });
    await settle();

    expect(text('profile-name')).toBe('João Alberto');
    expect(text('reviews-error')).toContain('Tentar de novo');
  });
});
