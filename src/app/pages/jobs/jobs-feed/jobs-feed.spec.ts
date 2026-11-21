import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Application, Job, JobsResponse } from '../../../core/models/jobs.model';
import { LocationService } from '../../../core/services/location.service';
import { ProfessionalPreferencesService } from '../../../core/services/professional-preferences.service';
import { DISTANCE_NO_LIMIT, JobsFeed, applyDistanceFilter, toMaxDistance } from './jobs-feed';

const restaurant = (restaurantName: string, zipCode = '01001-000') => ({
  restaurantName,
  logoUrl: null,
  cuisineType: 'Italiana',
  averageRating: null,
  address: 'Rua das Flores, 123 - Centro, São Paulo - SP',
  zipCode,
});

const jobs: Job[] = [
  {
    id: 'job-clt',
    title: 'Cozinheiro de Linha',
    description: 'Preparação de pratos',
    requirements: null,
    salary: '2400',
    contractType: 'CLT',
    status: 'ABERTA',
    restaurantId: 'restaurant-1',
    restaurant: restaurant('Le Petit Bistro'),
    createdAt: '2026-10-01T12:00:00.000Z',
    shifts: ['MANHA', 'TARDE'],
    distanceKm: 1.2,
    urgent: true,
  },
  {
    id: 'job-pj',
    title: 'Garçom / Garçonete',
    description: 'Atendimento no salão',
    requirements: null,
    salary: null,
    contractType: 'PJ',
    status: 'ABERTA',
    restaurantId: 'restaurant-2',
    restaurant: restaurant('Pizzaria Napoli'),
    createdAt: '2026-10-02T12:00:00.000Z',
    shifts: [],
  },
  {
    id: 'job-applied',
    title: 'Auxiliar de Cozinha',
    description: 'Apoio à cozinha',
    requirements: null,
    salary: '1350',
    contractType: 'CLT',
    status: 'ABERTA',
    restaurantId: 'restaurant-3',
    restaurant: restaurant('Burguer House'),
    createdAt: '2026-10-03T12:00:00.000Z',
    shifts: [],
  },
];

describe('applyDistanceFilter', () => {
  const at = (id: string, distanceKm: number | null | undefined): Job => ({ ...jobs[1], id, distanceKm });

  it('keeps jobs within the radius nearest first, then jobs without distance, and counts the hidden', () => {
    const view = applyDistanceFilter(
      [at('far', 80), at('unknown', null), at('near', 2), at('mid', 9), at('calculating', undefined)],
      10,
    );

    expect(view.jobs.map((job) => job.id)).toEqual(['near', 'mid', 'unknown', 'calculating']);
    expect(view.hidden).toBe(1);
    expect(view.unknown).toBe(2);
  });
});

describe('toMaxDistance', () => {
  it('maps the slider from 5 to 100 km, with the last stop meaning no limit', () => {
    expect(toMaxDistance('5')).toBe(5);
    expect(toMaxDistance('100')).toBe(100);
    expect(toMaxDistance(DISTANCE_NO_LIMIT)).toBeNull();
    expect(toMaxDistance('')).toBeNull();
    expect(toMaxDistance('2')).toBe(5);
  });
});

describe('JobsFeed', () => {
  let fixture: ComponentFixture<JobsFeed>;
  let http: HttpTestingController;
  // Nos testes a "latitude" do restaurante ja e a distancia em km, para ler facil.
  const DISTANCE_BY_ZIP: Record<string, number | null> = {
    '01001-000': 3,
    '20000-000': 60,
    '99999-999': null,
  };
  const location = {
    getUserLocation: vi.fn(),
    getRestaurantCoordinates: vi.fn(async (zipCode: string) => {
      const distance = DISTANCE_BY_ZIP[zipCode];
      return distance === null || distance === undefined ? null : { lat: distance, lng: 0 };
    }),
    calculateDistanceKm: vi.fn((_origin: unknown, destination: { lat: number }) => destination.lat),
  };

  const response: JobsResponse = { data: jobs, total: 12, skip: 0, take: 20 };

  beforeEach(async () => {
    location.getUserLocation.mockReset().mockResolvedValue({ status: 'unavailable' });
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
    localStorage.removeItem('komanda.user');
    localStorage.removeItem('komanda.professionalPreferences.joao@example.com');
    await TestBed.configureTestingModule({
      imports: [JobsFeed],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: LocationService, useValue: location },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JobsFeed);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  function applicationsPage(...jobIds: string[]) {
    return {
      data: jobIds.map((jobId, index) => ({
        applicationId: `application-${index}`,
        status: 'PENDENTE' as const,
        applicationDate: '2026-10-03T12:00:00.000Z',
        job: { id: jobId, title: 'Vaga' },
        restaurant: { id: 'restaurant-1', name: 'Restaurante' },
      })),
      total: jobIds.length,
      skip: 0,
      take: 50,
    };
  }

  function loadJobs(data: JobsResponse = response): void {
    const jobsRequest = http.expectOne((request) => request.url === '/api/jobs/search');
    expect(jobsRequest.request.method).toBe('GET');
    expect(jobsRequest.request.params.get('take')).toBe('20');
    expect(jobsRequest.request.params.get('skip')).toBe('0');
    const applicationsRequest = http.expectOne(
      (request) => request.url === '/api/users/me/applications',
    );
    expect(applicationsRequest.request.method).toBe('GET');
    jobsRequest.flush(data);
    applicationsRequest.flush(applicationsPage('job-applied'));
    fixture.detectChanges();
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const q = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const cardTitles = () =>
    Array.from(el().querySelectorAll('.job-card__title')).map((node) => node.textContent?.trim());

  function setMaxDistance(km: string): void {
    const input = q('distance-input') as HTMLInputElement;
    input.value = km;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  const located = (id: string, title: string, zipCode: string): Job => ({
    ...jobs[1],
    id,
    title,
    restaurant: restaurant('Cantina Bella Massa', zipCode),
  });
  const nearbyPage = [
    located('near', 'Pizzaiolo', '01001-000'),
    located('far', 'Garçom', '20000-000'),
    located('unknown', 'Sommelier', '99999-999'),
  ];

  function grantLocation(): void {
    location.getUserLocation.mockResolvedValue({
      status: 'granted',
      coordinates: { lat: -23.55, lng: -46.63 },
    });
  }

  it('shows the distance in km and keeps jobs inside a large radius', async () => {
    grantLocation();
    loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 });
    await settle();

    expect(q('distance-badge')?.textContent).toContain('3.0 KM');
    expect(q('distance-value')?.textContent).toBe('Sem limite');
    setMaxDistance('100');
    http.expectOne((request) => request.url === '/api/jobs/search').flush({
      data: nearbyPage,
      total: 3,
      skip: 0,
      take: 20,
    });
    http.expectOne((request) => request.url === '/api/users/me/applications').flush(
      applicationsPage(),
    );
    await settle();

    expect(q('distance-value')?.textContent).toBe('até 100 km');

    expect(cardTitles()).toEqual(['Pizzaiolo', 'Garçom', 'Sommelier']);
    expect(q('distance-note')?.textContent).toContain('entre as 3 carregadas');
  });

  it('hides jobs outside a small radius with an explanation, keeping unknown ones last', async () => {
    grantLocation();
    loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 });
    await settle();
    setMaxDistance('10');
    http.expectOne((request) => request.url === '/api/jobs/search').flush({
      data: nearbyPage,
      total: 3,
      skip: 0,
      take: 20,
    });
    http.expectOne((request) => request.url === '/api/users/me/applications').flush(
      applicationsPage(),
    );
    await settle();

    expect(cardTitles()).toEqual(['Pizzaiolo', 'Sommelier']);
    expect(q('distance-note')?.textContent).toContain('1 vaga fora do raio foi ocultada');
    expect(q('distance-note')?.textContent).toContain('sem distância calculada aparecem no fim');
    const lastCard = Array.from(el().querySelectorAll('.job-card')).at(-1);
    expect(lastCard?.querySelector('[data-testid="distance-unavailable"]')?.textContent).toContain(
      'Distância indisponível',
    );
  });

  it('explains an empty list caused only by the distance filter', async () => {
    grantLocation();
    loadJobs({ data: [nearbyPage[1]], total: 1, skip: 0, take: 20 });
    await settle();
    setMaxDistance('10');
    http.expectOne((request) => request.url === '/api/jobs/search').flush({
      data: [nearbyPage[1]],
      total: 1,
      skip: 0,
      take: 20,
    });
    http.expectOne((request) => request.url === '/api/users/me/applications').flush(
      applicationsPage(),
    );
    await settle();

    expect(q('distance-empty')?.textContent).toContain('Nenhuma das vagas carregadas fica a até 10 km');
  });

  it('shows a loading hint while distances are being calculated, without emptying the list', async () => {
    let release: (value: unknown) => void = () => undefined;
    location.getUserLocation.mockReturnValue(new Promise((resolve) => (release = resolve)));
    loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 });
    await settle();

    expect(q('distance-hint')?.textContent).toContain('Calculando distâncias');
    expect(cardTitles()).toHaveLength(3);

    release({ status: 'granted', coordinates: { lat: 0, lng: 0 } });
    await settle();
    expect(q('distance-hint')?.textContent?.trim()).toBe('');
  });

  it('disables the distance filter and explains why when location is denied', async () => {
    location.getUserLocation.mockResolvedValue({ status: 'denied' });
    loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 });
    await settle();

    expect((q('distance-input') as HTMLInputElement).disabled).toBe(true);
    expect(q('distance-hint')?.textContent).toContain('Ative a localização');
    expect(cardTitles()).toHaveLength(3);
    expect(q('distance-unavailable')).toBeNull();
  });

  it('applies the distance filter to jobs from "load more" too', async () => {
    grantLocation();
    loadJobs({ data: [nearbyPage[0]], total: 2, skip: 0, take: 20 });
    await settle();
    setMaxDistance('10');
    http.expectOne((request) => request.url === '/api/jobs/search').flush({
      data: [nearbyPage[0]],
      total: 2,
      skip: 0,
      take: 20,
    });
    http.expectOne((request) => request.url === '/api/users/me/applications').flush(
      applicationsPage(),
    );
    await settle();

    (el().querySelector('.load-more') as HTMLButtonElement).click();
    http
      .expectOne((r) => r.url === '/api/jobs/search' && r.params.get('skip') === '1')
      .flush({ data: [nearbyPage[1]], total: 2, skip: 1, take: 20 });
    http.expectOne((r) => r.url === '/api/users/me/applications').flush(applicationsPage());
    await settle();

    expect(cardTitles()).toEqual(['Pizzaiolo']);
    expect(q('distance-note')?.textContent).toContain('entre as 2 carregadas');
    expect(q('distance-note')?.textContent).toContain('1 vaga fora do raio foi ocultada');
  });

  it('renders the greeting and total returned by the API', () => {
    loadJobs();

    expect(fixture.nativeElement.textContent).toContain('Olá, João');
    expect(fixture.nativeElement.textContent).toContain('12 vagas perto de você');
    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('1.2 KM');
    expect(fixture.nativeElement.textContent).toContain('Urgente');
  });

  it('shows the job shifts as a readable badge', () => {
    loadJobs();

    const badges = Array.from(el().querySelectorAll('.job-card')[0].querySelectorAll('.badge')).map(
      (badge) => badge.textContent?.trim(),
    );
    expect(badges).toContain('Manhã e Tarde');
  });

  it('filters by the Integral shift and no longer offers Madrugada', () => {
    loadJobs();

    const select = el().querySelector<HTMLSelectElement>('select[name="jobShift"]')!;
    const options = Array.from(select.options).map((option) => option.value);
    expect(options).toEqual(['', 'MANHA', 'TARDE', 'NOITE', 'INTEGRAL']);

    select.value = 'INTEGRAL';
    select.dispatchEvent(new Event('change'));
    const jobsRequest = http.expectOne(
      (request) => request.url === '/api/jobs/search' && request.params.get('shift') === 'INTEGRAL',
    );
    http.expectOne((request) => request.url === '/api/users/me/applications').flush(applicationsPage());
    jobsRequest.flush({ data: [], total: 0, skip: 0, take: 20 });
  });

  it('links the restaurant name to its public profile', () => {
    loadJobs();

    const hrefs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="restaurant-link"]'),
    ).map((link) => link.getAttribute('href'));
    expect(hrefs[0]).toMatch(/^\/restaurantes\/restaurant-\d$/);
    expect(hrefs).toHaveLength(3);
  });

  it('loads the next server page and appends its jobs', () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      ...jobs[index % jobs.length],
      id: `page-${index}`,
    }));
    loadJobs({ data: firstPage, total: 25, skip: 0, take: 20 });

    fixture.nativeElement.querySelector('.load-more').click();
    const jobsRequest = http.expectOne(
      (request) => request.url === '/api/jobs/search' && request.params.get('skip') === '20',
    );
    const applicationsRequest = http.expectOne(
      (request) => request.url === '/api/users/me/applications',
    );
    jobsRequest.flush({
      data: Array.from({ length: 5 }, (_, index) => ({
        ...jobs[index % jobs.length],
        id: `page-${index + 20}`,
      })),
      total: 25,
      skip: 20,
      take: 20,
    });
    applicationsRequest.flush(applicationsPage());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(25);
  });

  it('filters by job title or restaurant after submitting the search', () => {
    loadJobs();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = 'napoli';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement.querySelector('form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    const jobsRequest = http.expectOne(
      (request) => request.url === '/api/jobs/search' && request.params.get('query') === 'napoli',
    );
    const applicationsRequest = http.expectOne(
      (request) => request.url === '/api/users/me/applications',
    );
    jobsRequest.flush({ data: [jobs[1]], total: 1, skip: 0, take: 20 });
    applicationsRequest.flush(applicationsPage());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Pizzaria Napoli');
  });

  it('filters by CLT and clears the filter when the selected chip is clicked again', () => {
    loadJobs();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const cltChip = Array.from(
      nativeElement.querySelectorAll<HTMLButtonElement>('.chip'),
    ).find((chip) => chip.textContent?.trim() === 'CLT');
    expect(cltChip).toBeDefined();
    if (!cltChip) {
      return;
    }
    cltChip.click();
    const cltRequest = http.expectOne(
      (request) =>
        request.url === '/api/jobs/search' && request.params.get('contractType') === 'CLT',
    );
    const cltApplicationsRequest = http.expectOne(
      (request) => request.url === '/api/users/me/applications',
    );
    cltRequest.flush({ data: [jobs[0], jobs[2]], total: 2, skip: 0, take: 20 });
    cltApplicationsRequest.flush(applicationsPage());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(2);

    cltChip.click();
    const allJobsRequest = http.expectOne(
      (request) => request.url === '/api/jobs/search' && !request.params.has('contractType'),
    );
    const allApplicationsRequest = http.expectOne(
      (request) => request.url === '/api/users/me/applications',
    );
    allJobsRequest.flush(response);
    allApplicationsRequest.flush(applicationsPage());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(3);
  });

  it('does not require a contract preference to match Para você', () => {
    localStorage.setItem(
      'komanda.user',
      JSON.stringify({ id: 'professional-1', role: 'PROFISSIONAL', email: 'joao@example.com' }),
    );
    TestBed.inject(ProfessionalPreferencesService).saveForEmail('joao@example.com', {
      mainRole: 'Cozinheiro',
      interestedRoles: [],
    });

    loadJobs({ ...response, data: [{ ...jobs[0], contractType: 'PJ' }] });

    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(1);
  });

  it('filters Para você by the professional role and contract preference', () => {
    localStorage.setItem(
      'komanda.user',
      JSON.stringify({ id: 'professional-1', role: 'PROFISSIONAL', email: 'joao@example.com' }),
    );
    TestBed.inject(ProfessionalPreferencesService).saveForEmail('joao@example.com', {
      mainRole: 'Cozinheiro',
      interestedRoles: [],
      contractType: 'CLT',
    });

    const sameRoleWithDifferentContract: Job = {
      ...jobs[0],
      id: 'job-pj-cook',
      contractType: 'PJ',
    };
    loadJobs({ ...response, data: [...jobs, sameRoleWithDifferentContract] });

    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Cozinheiro de Linha');
  });

  it('sends an application once and switches the action to the submitted state', () => {
    loadJobs();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const applyButton = Array.from(
      nativeElement.querySelectorAll<HTMLButtonElement>('.apply-button'),
    ).find((button) => button.textContent?.includes('Candidatar-se'));
    expect(applyButton).toBeDefined();
    if (!applyButton) {
      return;
    }
    applyButton.click();
    fixture.detectChanges();

    const request = http.expectOne('/api/jobs/job-clt/applications');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    const application: Application = {
      id: 'application-1',
      jobId: 'job-clt',
      professionalId: 'professional-1',
      createdAt: '2026-10-13T12:00:00.000Z',
    };
    request.flush(application);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Candidatura enviada');
    expect(
      fixture.nativeElement.querySelector('.apply-button--applied').disabled,
    ).toBe(true);
    nativeElement
      .querySelector<HTMLButtonElement>('.job-card .apply-button--applied')
      ?.click();
    http.expectNone('/api/jobs/job-clt/applications');
  });

  it('links each card to the full job page', () => {
    loadJobs();

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.job-card [data-testid="job-details-link"]',
    );

    expect(link?.textContent).toContain('Ver vaga completa');
    expect(link?.getAttribute('href')).toBe('/vagas/job-clt');
  });

  it('renders jobs already applied to as submitted', () => {
    loadJobs();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const appliedCard = Array.from(
      nativeElement.querySelectorAll<HTMLElement>('.job-card'),
    ).find((card) => card.textContent?.includes('Burguer House'));

    expect(appliedCard?.querySelector('.apply-button--applied')).not.toBeNull();
  });

  it('shows a retry action without exposing an HTTP status on load failure', () => {
    const jobsRequest = http.expectOne((request) => request.url === '/api/jobs/search');
    const applicationsRequest = http.expectOne(
      (request) => request.url === '/api/users/me/applications',
    );
    applicationsRequest.flush(applicationsPage());
    jobsRequest.flush(
      { message: 'Internal Server Error' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar as vagas. Tente novamente.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('500');
    expect(fixture.nativeElement.textContent).not.toContain('/api/jobs');
    expect(fixture.nativeElement.querySelector('.retry-button')).not.toBeNull();
  });

  it('keeps the filters when the feed is opened again after the detail', () => {
    loadJobs();

    const chips = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.chip'));
    chips.find((chip) => chip.textContent?.trim() === 'CLT')?.click();
    fixture.detectChanges();
    http
      .expectOne((request) => request.url === '/api/jobs/search' && request.params.get('contractType') === 'CLT')
      .flush(response);
    http
      .expectOne((request) => request.url === '/api/users/me/applications')
      .flush(applicationsPage());
    fixture.detectChanges();

    fixture.destroy();

    const reopened = TestBed.createComponent(JobsFeed);
    reopened.detectChanges();
    http
      .expectOne((request) => request.url === '/api/jobs/search' && request.params.get('contractType') === 'CLT')
      .flush(response);
    http
      .expectOne((request) => request.url === '/api/users/me/applications')
      .flush(applicationsPage('job-applied'));
    reopened.detectChanges();

    const activeChip = Array.from(
      (reopened.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.chip--active'),
    ).find((chip) => chip.textContent?.trim() === 'CLT');

    expect(activeChip).not.toBeUndefined();
  });
});
