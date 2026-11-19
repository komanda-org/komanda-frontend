import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { RestaurantMe } from '../../../core/models/profile.model';
import { RestaurantJob } from '../../../core/models/restaurant-jobs.model';
import { JobPreview, previewNotice, toJobPreview } from './job-preview';
import { FROM_PREVIEW } from './preview-origin';

@Component({ template: '' })
class Blank {}

const JOB: RestaurantJob = {
  id: 'j1',
  title: 'Cozinheiro de Linha',
  description: 'Preparo das praças quentes no turno da noite.',
  requirements: 'Experiência com grelha',
  salary: 2400,
  contractType: 'CLT',
  shift: 'NOITE',
  status: 'ABERTA',
  urgent: true,
  createdAt: '2026-11-19T12:00:00.000Z',
};

const ME: RestaurantMe = {
  role: 'RESTAURANTE',
  id: 'rest-1',
  email: 'restaurante.teste@komanda.dev',
  restaurantName: 'Cantina Bella Massa',
  cnpj: '11222333000181',
  cuisineType: 'Italiana',
  description: 'Cantina italiana',
  address: 'Rua das Flores, 123',
  phone: '(11) 98765-4321',
  zipCode: '01001-000',
  logoUrl: null,
  averageRating: 4.5,
  plan: 'FREE',
};

const page = (data: RestaurantJob[]) => ({ data, total: data.length, skip: 0, take: 50 });

describe('toJobPreview', () => {
  it('builds the restaurant block from /users/me and turns the salary into text', () => {
    const job = toJobPreview(JOB, ME);

    expect(job.restaurantId).toBe('rest-1');
    expect(job.restaurant).toEqual({
      restaurantName: 'Cantina Bella Massa',
      logoUrl: null,
      address: 'Rua das Flores, 123',
      zipCode: '01001-000',
      cuisineType: 'Italiana',
      averageRating: 4.5,
    });
    expect(job.salary).toBe('2400');
    expect(job.hasApplied).toBe(false);
    expect(job.application).toBeNull();
    expect(toJobPreview({ ...JOB, salary: null }, ME).salary).toBeNull();
  });

  it('only warns when the job is hidden from professionals', () => {
    expect(previewNotice('ABERTA')).toBeNull();
    expect(previewNotice('PAUSADA')).toBe('Esta vaga está pausada e não aparece para profissionais.');
    expect(previewNotice('ENCERRADA')).toContain('encerrada');
  });
});

describe('JobPreview', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const el = () => harness.routeNativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(id: string) =>
    el().querySelector<T>(`[data-testid="${id}"]`);

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  async function openWithState(job: RestaurantJob = JOB): Promise<void> {
    harness = await RouterTestingHarness.create();
    await TestBed.inject(Router).navigate(['/my-jobs', job.id, 'preview'], { state: { job } });
    await settle();
    http.expectOne('/api/users/me').flush(ME);
    await settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'my-jobs', component: Blank },
          { path: 'my-jobs/:id/preview', component: JobPreview },
          { path: 'my-jobs/:id/edit', component: Blank },
        ]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders the job from the navigation state with the professional layout and the notice', async () => {
    await openWithState();
    http.expectNone((r) => r.url === '/api/users/me/jobs');

    expect(q('preview-banner')?.textContent).toContain(
      'Pré-visualização: é assim que os profissionais veem sua vaga.',
    );
    expect(q('preview-notice')).toBeNull();
    expect(q('job-title')?.textContent).toContain('Cozinheiro de Linha');
    expect(q('restaurant-name')?.textContent).toContain('Cantina Bella Massa');
    expect(q('urgent-badge')).not.toBeNull();
    expect(q('job-requirements')?.textContent).toContain('grelha');
    expect(q('job-salary')?.textContent?.replace(/\s/g, ' ')).toContain('R$ 2.400,00');
  });

  it('loads the job from /users/me/jobs when opened directly', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/my-jobs/j1/preview', JobPreview);
    await settle();
    http.expectOne((r) => r.url === '/api/users/me/jobs').flush(page([{ ...JOB, id: 'j0' }, JOB]));
    http.expectOne('/api/users/me').flush(ME);
    await settle();

    expect(q('job-title')?.textContent).toContain('Cozinheiro de Linha');
  });

  it('keeps Candidatar-se disabled and never calls the API', async () => {
    await openWithState();

    const apply = q<HTMLButtonElement>('apply-btn')!;
    expect(apply.disabled).toBe(true);
    apply.click();
    http.expectNone((r) => r.url.includes('/applications'));
  });

  it('offers "Editar vaga" with the job and the way back to the preview', async () => {
    await openWithState();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    const edit = q<HTMLAnchorElement>('preview-edit')!;
    expect(edit.getAttribute('href')).toBe('/my-jobs/j1/edit');
    edit.click();

    expect(navigate.mock.calls[0][1]?.state).toEqual({ job: JOB, from: FROM_PREVIEW });
  });

  it('warns about a paused job and still lets it be edited', async () => {
    await openWithState({ ...JOB, status: 'PAUSADA' });

    expect(q('preview-notice')?.textContent).toContain('pausada e não aparece para profissionais');
    expect(q('preview-edit')).not.toBeNull();
  });

  it('hides "Editar vaga" for a closed job', async () => {
    await openWithState({ ...JOB, status: 'ENCERRADA' });

    expect(q('preview-notice')?.textContent).toContain('encerrada');
    expect(q('preview-edit')).toBeNull();
  });

  it('shows "Vaga não encontrada" for an id outside my jobs', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/my-jobs/nope/preview', JobPreview);
    await settle();
    http.expectOne((r) => r.url === '/api/users/me/jobs').flush(page([JOB]));
    http.expectOne('/api/users/me').flush(ME);
    await settle();

    expect(q('not-found')?.textContent).toContain('Vaga não encontrada');
    expect(q('job-title')).toBeNull();
  });

  it('shows an actionable error and retries', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/my-jobs/j1/preview', JobPreview);
    await settle();
    http.expectOne('/api/users/me').flush(ME);
    http.expectOne((r) => r.url === '/api/users/me/jobs').flush(null, { status: 500, statusText: 'Error' });
    await settle();

    expect(q('load-error')?.textContent).not.toMatch(/500/);
    (q('load-error')!.querySelector('button') as HTMLButtonElement).click();
    await settle();
    http.expectOne((r) => r.url === '/api/users/me/jobs').flush(page([JOB]));
    http.expectOne('/api/users/me').flush(ME);
    await settle();

    expect(q('job-title')?.textContent).toContain('Cozinheiro de Linha');
  });
});
