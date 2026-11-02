import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { Application, Job, JobsResponse } from '../../../core/models/jobs.model';
import { ProfessionalPreferencesService } from '../../../core/services/professional-preferences.service';
import { JobsFeed } from './jobs-feed';

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
    restaurant: { restaurantName: 'Le Petit Bistro', logoUrl: null },
    createdAt: '2026-10-01T12:00:00.000Z',
    shift: 'NOITE',
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
    restaurant: { restaurantName: 'Pizzaria Napoli', logoUrl: null },
    createdAt: '2026-10-02T12:00:00.000Z',
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
    restaurant: { restaurantName: 'Burguer House', logoUrl: null },
    createdAt: '2026-10-03T12:00:00.000Z',
    hasApplied: true,
  },
];

describe('JobsFeed', () => {
  let fixture: ComponentFixture<JobsFeed>;
  let http: HttpTestingController;

  const response: JobsResponse = { data: jobs, total: 12, skip: 0, take: 20 };

  beforeEach(async () => {
    localStorage.removeItem('komanda.user');
    localStorage.removeItem('komanda.professionalPreferences.joao@example.com');
    await TestBed.configureTestingModule({
      imports: [JobsFeed],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JobsFeed);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function loadJobs(data: JobsResponse = response): void {
    const request = http.expectOne('/api/jobs');
    expect(request.request.method).toBe('GET');
    request.flush(data);
    fixture.detectChanges();
  }

  it('renders the greeting and total returned by the API', () => {
    loadJobs();

    expect(fixture.nativeElement.textContent).toContain('Olá, João');
    expect(fixture.nativeElement.textContent).toContain('12 vagas perto de você');
    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('1.2 KM');
    expect(fixture.nativeElement.textContent).toContain('Urgente');
  });

  it('filters by job title or restaurant after submitting the search', () => {
    loadJobs();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = 'napoli';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement.querySelector('form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
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
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(2);

    cltChip.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.job-card')).toHaveLength(3);
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

  it('renders jobs already applied to as submitted', () => {
    loadJobs();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const appliedCard = Array.from(
      nativeElement.querySelectorAll<HTMLElement>('.job-card'),
    ).find((card) => card.textContent?.includes('Burguer House'));

    expect(appliedCard?.querySelector('.apply-button--applied')).not.toBeNull();
  });

  it('shows a retry action without exposing an HTTP status on load failure', () => {
    http.expectOne('/api/jobs').flush(
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
});
