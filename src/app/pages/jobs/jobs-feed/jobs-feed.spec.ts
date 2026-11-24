import { HttpParams, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Application, Job, JobsResponse } from '../../../core/models/jobs.model';
import { LocationService, UserLocation } from '../../../core/services/location.service';
import { ProfessionalPreferencesService } from '../../../core/services/professional-preferences.service';
import { DISTANCE_NO_LIMIT, JobsFeed, LOCATION_WAIT_MS, toMaxDistance } from './jobs-feed';

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
  const location = { getUserLocation: vi.fn() };
  const GRANTED: UserLocation = { status: 'granted', coordinates: { lat: -12.97, lng: -38.5 } };

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

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.expectNone((request) => request.url.includes('brasilapi') || request.url.includes('nominatim'));
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

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  /** O feed pede a localizacao ao nascer e so depois busca as vagas. */
  async function createFeed(userLocation: UserLocation = { status: 'unavailable' }): Promise<void> {
    location.getUserLocation.mockResolvedValue(userLocation);
    fixture = TestBed.createComponent(JobsFeed);
    fixture.detectChanges();
    await settle();
  }

  /** Responde a proxima busca e devolve os parametros que ela mandou. */
  function flushSearch(data: JobsResponse, applied: string[] = []): HttpParams {
    const jobsRequest = http.expectOne((request) => request.url === '/api/jobs/search');
    expect(jobsRequest.request.method).toBe('GET');
    http
      .expectOne((request) => request.url === '/api/users/me/applications')
      .flush(applicationsPage(...applied));
    jobsRequest.flush(data);
    fixture.detectChanges();
    return jobsRequest.request.params;
  }

  async function loadJobs(
    data: JobsResponse = response,
    userLocation?: UserLocation,
  ): Promise<HttpParams> {
    await createFeed(userLocation);
    const params = flushSearch(data, ['job-applied']);
    expect(params.get('take')).toBe('20');
    expect(params.get('skip')).toBe('0');
    return params;
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const q = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const cardTitles = () =>
    Array.from(el().querySelectorAll('.job-card__title')).map((node) => node.textContent?.trim());

  /** Arrastar dispara `input`; soltar dispara `change`. */
  function dragDistance(km: string): void {
    const input = q('distance-input') as HTMLInputElement;
    input.value = km;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function releaseDistance(km: string): void {
    dragDistance(km);
    (q('distance-input') as HTMLInputElement).dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  const at = (id: string, title: string, distanceKm?: number | null): Job => {
    const job: Job = { ...jobs[1], id, title, restaurant: restaurant('Cantina Bella Massa') };
    return distanceKm === undefined ? job : { ...job, distanceKm };
  };
  const nearbyPage = [at('near', 'Pizzaiolo', 3), at('far', 'Garçom', 60), at('unknown', 'Sommelier', null)];

  describe('distance', () => {
    it('sends no location params when the location is not available', async () => {
      const params = await loadJobs(response, { status: 'unavailable' });

      expect(params.has('lat')).toBe(false);
      expect(params.has('lng')).toBe(false);
      expect(params.has('maxDistanceKm')).toBe(false);
    });

    it('sends lat/lng without a radius when the location is granted and there is no limit', async () => {
      const params = await loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 }, GRANTED);

      expect(params.get('lat')).toBe('-12.97');
      expect(params.get('lng')).toBe('-38.5');
      expect(params.has('maxDistanceKm')).toBe(false);
      expect(q('jobs-total')?.textContent).toContain('3 vagas perto de você');
    });

    it('shows the API distance, "Distância indisponível" for null and nothing when absent', async () => {
      await loadJobs(
        { data: [...nearbyPage, at('no-field', 'Barman')], total: 4, skip: 0, take: 20 },
        GRANTED,
      );

      const badgesOf = (title: string) => {
        const card = Array.from(el().querySelectorAll('.job-card')).find(
          (node) => node.querySelector('.job-card__title')?.textContent?.trim() === title,
        );
        return {
          distance: card?.querySelector('[data-testid="distance-badge"]')?.textContent?.trim(),
          unavailable: card?.querySelector('[data-testid="distance-unavailable"]')?.textContent?.trim(),
        };
      };
      expect(badgesOf('Pizzaiolo')).toEqual({ distance: '3.0 KM', unavailable: undefined });
      expect(badgesOf('Sommelier')).toEqual({ distance: undefined, unavailable: 'Distância indisponível' });
      expect(badgesOf('Barman')).toEqual({ distance: undefined, unavailable: undefined });
    });

    it('does not search while the slider is dragged, only when it is released', async () => {
      await loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 }, GRANTED);

      dragDistance('10');
      dragDistance('25');
      expect(q('distance-value')?.textContent).toBe('até 25 km');
      http.expectNone((request) => request.url === '/api/jobs/search');

      releaseDistance('10');
      const params = flushSearch({ data: [nearbyPage[0]], total: 1, skip: 0, take: 20 });
      expect(params.get('maxDistanceKm')).toBe('10');
      expect(params.get('skip')).toBe('0');
      expect(params.get('lat')).toBe('-12.97');
    });

    it('keeps the current list on screen while the new radius is being searched', async () => {
      await loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 }, GRANTED);

      releaseDistance('10');

      expect(el().querySelector('.status--loading')).toBeNull();
      expect(cardTitles()).toEqual(['Pizzaiolo', 'Garçom', 'Sommelier']);
      expect(el().querySelector('.jobs-grid')?.classList).toContain('is-refreshing');

      flushSearch({ data: [nearbyPage[0]], total: 12, skip: 0, take: 20 });

      expect(cardTitles()).toEqual(['Pizzaiolo']);
      expect(el().querySelector('.jobs-grid')?.classList).not.toContain('is-refreshing');
      expect(q('jobs-total')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('12 vagas até 10 km');
    });

    it('keeps the radius params when loading more', async () => {
      await loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 }, GRANTED);
      releaseDistance('10');
      flushSearch({ data: [nearbyPage[0]], total: 2, skip: 0, take: 20 });

      (el().querySelector('.load-more') as HTMLButtonElement).click();
      const request = http.expectOne(
        (r) => r.url === '/api/jobs/search' && r.params.get('skip') === '1',
      );
      http.expectOne((r) => r.url === '/api/users/me/applications').flush(applicationsPage());
      expect(request.request.params.get('maxDistanceKm')).toBe('10');
      expect(request.request.params.get('lat')).toBe('-12.97');
      request.flush({ data: [at('mid', 'Barman', 8)], total: 2, skip: 1, take: 20 });
      fixture.detectChanges();

      expect(cardTitles()).toEqual(['Pizzaiolo', 'Barman']);
    });

    it('suggests a larger radius when nothing is inside it', async () => {
      await loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 }, GRANTED);
      releaseDistance('5');
      flushSearch({ data: [], total: 0, skip: 0, take: 20 });

      const text = q('distance-empty')?.textContent ?? '';
      expect(text).toContain('Nenhuma vaga a até 5 km de você');
      expect(text).toContain('Aumente a distância');
      expect(text).not.toContain('carregue mais');
    });

    it('disables the distance filter and explains why when location is denied', async () => {
      const params = await loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 }, { status: 'denied' });

      expect(params.has('lat')).toBe(false);
      expect((q('distance-input') as HTMLInputElement).disabled).toBe(true);
      expect(q('distance-hint')?.textContent).toContain('Ative a localização');
      expect(q('distance-unavailable')).toBeNull();
    });

    it('loads without distance if the location takes long, then searches again with it', async () => {
      vi.useFakeTimers();
      try {
        let release: (value: UserLocation) => void = () => undefined;
        location.getUserLocation.mockReturnValue(new Promise((resolve) => (release = resolve)));
        fixture = TestBed.createComponent(JobsFeed);
        fixture.detectChanges();

        await vi.advanceTimersByTimeAsync(LOCATION_WAIT_MS - 1);
        http.expectNone((request) => request.url === '/api/jobs/search');
        await vi.advanceTimersByTimeAsync(1);
        expect(flushSearch(response).has('lat')).toBe(false);

        release(GRANTED);
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();
        expect(el().querySelector('.status--loading')).toBeNull();
        expect(flushSearch(response).get('lat')).toBe('-12.97');
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps the avatar color of a job when the list changes', async () => {
      await loadJobs({ data: nearbyPage, total: 3, skip: 0, take: 20 }, GRANTED);
      const avatarOf = (title: string) =>
        Array.from(el().querySelectorAll('.job-card'))
          .find((card) => card.querySelector('.job-card__title')?.textContent?.trim() === title)
          ?.querySelector('.restaurant__initial')?.className;
      const before = avatarOf('Sommelier');

      releaseDistance('10');
      flushSearch({ data: [nearbyPage[2]], total: 1, skip: 0, take: 20 });

      expect(avatarOf('Sommelier')).toBe(before);
    });
  });

  it('renders the greeting and total returned by the API', async () => {
    await loadJobs();

    expect(fixture.nativeElement.textContent).toContain('Olá, João');
    expect(fixture.nativeElement.textContent).toContain('12 vagas perto de você');
    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('1.2 KM');
    expect(fixture.nativeElement.textContent).toContain('Urgente');
  });

  it('shows the job shifts as a readable badge', async () => {
    await loadJobs();

    const badges = Array.from(el().querySelectorAll('.job-card')[0].querySelectorAll('.badge')).map(
      (badge) => badge.textContent?.trim(),
    );
    expect(badges).toContain('Manhã e Tarde');
  });

  it('filters by the Integral shift and no longer offers Madrugada', async () => {
    await loadJobs();

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

  it('links the restaurant name to its public profile', async () => {
    await loadJobs();

    const hrefs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="restaurant-link"]'),
    ).map((link) => link.getAttribute('href'));
    expect(hrefs[0]).toMatch(/^\/restaurantes\/restaurant-\d$/);
    expect(hrefs).toHaveLength(3);
  });

  it('loads the next server page and appends its jobs', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      ...jobs[index % jobs.length],
      id: `page-${index}`,
    }));
    await loadJobs({ data: firstPage, total: 25, skip: 0, take: 20 });

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

  it('filters by job title or restaurant after submitting the search', async () => {
    await loadJobs();

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

  it('filters by CLT and clears the filter when the selected chip is clicked again', async () => {
    await loadJobs();

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

  it('does not require a contract preference to match Para você', async () => {
    localStorage.setItem(
      'komanda.user',
      JSON.stringify({ id: 'professional-1', role: 'PROFISSIONAL', email: 'joao@example.com' }),
    );
    TestBed.inject(ProfessionalPreferencesService).saveForEmail('joao@example.com', {
      mainRole: 'Cozinheiro',
      interestedRoles: [],
    });

    await loadJobs({ ...response, data: [{ ...jobs[0], contractType: 'PJ' }] });

    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(1);
  });

  it('filters Para você by the professional role and contract preference', async () => {
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
    await loadJobs({ ...response, data: [...jobs, sameRoleWithDifferentContract] });

    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Cozinheiro de Linha');
  });

  it('sends an application once and switches the action to the submitted state', async () => {
    await loadJobs();

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

  it('links each card to the full job page', async () => {
    await loadJobs();

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '.job-card [data-testid="job-details-link"]',
    );

    expect(link?.textContent).toContain('Ver vaga completa');
    expect(link?.getAttribute('href')).toBe('/vagas/job-clt');
  });

  it('renders jobs already applied to as submitted', async () => {
    await loadJobs();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const appliedCard = Array.from(
      nativeElement.querySelectorAll<HTMLElement>('.job-card'),
    ).find((card) => card.textContent?.includes('Burguer House'));

    expect(appliedCard?.querySelector('.apply-button--applied')).not.toBeNull();
  });

  it('shows a retry action without exposing an HTTP status on load failure', async () => {
    await createFeed();
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

  it('keeps the filters when the feed is opened again after the detail', async () => {
    await loadJobs();

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
    await new Promise((resolve) => setTimeout(resolve, 0));
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
