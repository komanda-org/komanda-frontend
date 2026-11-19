import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { RestaurantJob } from '../../../core/models/restaurant-jobs.model';
import { ToastService } from '../../../core/services/toast.service';
import { FROM_PREVIEW } from '../job-preview/preview-origin';
import { EditJob, JOB_UPDATED_TOAST, changedFields, toFormValue } from './edit-job';

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
  urgent: false,
  createdAt: '2026-11-19T12:00:00.000Z',
};

describe('changedFields', () => {
  it('returns nothing when the form still matches the job', () => {
    expect(changedFields(JOB, toFormValue(JOB))).toEqual({});
  });

  it('sends only what changed and turns emptied optional fields into null', () => {
    const value = {
      ...toFormValue(JOB),
      title: '  Chef de Partida ',
      requirements: '   ',
      salary: null,
      urgent: true,
    };

    expect(changedFields(JOB, value)).toEqual({
      title: 'Chef de Partida',
      requirements: null,
      salary: null,
      urgent: true,
    });
  });

  it('treats a salary sent as text by the API as the same number', () => {
    const job = { ...JOB, salary: '2400.00' };
    expect(changedFields(job, toFormValue(job))).toEqual({});
  });
});

describe('EditJob', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const el = () => harness.routeNativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(id: string) =>
    el().querySelector<T>(`[data-testid="${id}"]`);

  function type(id: string, value: string): void {
    const input = q<HTMLInputElement>(id)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit(): void {
    q<HTMLButtonElement>('publish-btn')!.click();
    harness.detectChanges();
  }

  async function openWithState(job: RestaurantJob = JOB): Promise<void> {
    harness = await RouterTestingHarness.create();
    await TestBed.inject(Router).navigate(['/my-jobs', job.id, 'edit'], { state: { job } });
    harness.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'my-jobs', component: Blank },
          { path: 'my-jobs/:id/edit', component: EditJob },
          { path: 'my-jobs/:id/preview', component: Blank },
        ]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fills the form with the job carried by the list, with the shift read-only', async () => {
    await openWithState();

    expect(q<HTMLInputElement>('title-input')!.value).toBe('Cozinheiro de Linha');
    expect(q<HTMLTextAreaElement>('requirements-input')!.value).toBe('Experiência com grelha');
    expect(q<HTMLInputElement>('salary-input')!.value).toBe('2400');
    expect(q('shift-readonly')!.textContent).toContain('Noite');
    expect(q('publish-btn')!.textContent).toContain('Salvar alterações');
  });

  it('loads the job from my jobs when the page is opened directly', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/my-jobs/j1/edit', EditJob);
    harness.detectChanges();
    await harness.fixture.whenStable();

    http
      .expectOne((r) => r.url === '/api/users/me/jobs')
      .flush({ data: [{ ...JOB, id: 'j0' }, JOB], total: 2, skip: 0, take: 50 });
    harness.detectChanges();

    expect(q<HTMLInputElement>('title-input')!.value).toBe('Cozinheiro de Linha');
  });

  it('does not open the form for a closed job', async () => {
    await openWithState({ ...JOB, status: 'ENCERRADA' });

    expect(q('closed')!.textContent).toContain('não pode mais ser editada');
    expect(el().querySelector('form')).toBeNull();
  });

  it('blocks a title shorter than the API accepts', async () => {
    await openWithState();

    type('title-input', 'Chef');
    submit();

    expect(el().textContent).toContain('O cargo deve ter entre 5 e 100 caracteres.');
    http.expectNone('/api/jobs/j1');
  });

  it('sends only the changed fields, shows the toast and returns to my jobs', async () => {
    await openWithState();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    type('title-input', 'Chef de Partida');
    type('salary-input', '');
    q<HTMLButtonElement>('contract-PJ')!.click();
    submit();

    const request = http.expectOne('/api/jobs/j1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ title: 'Chef de Partida', salary: null, contractType: 'PJ' });
    expect(q<HTMLButtonElement>('publish-btn')!.disabled).toBe(true);
    request.flush({ ...JOB, title: 'Chef de Partida', salary: null, contractType: 'PJ' });

    expect(TestBed.inject(ToastService).message()).toBe(JOB_UPDATED_TOAST);
    expect(navigate).toHaveBeenCalledWith('/my-jobs');
  });

  it('returns to the preview when it was opened from there', async () => {
    harness = await RouterTestingHarness.create();
    await TestBed.inject(Router).navigate(['/my-jobs', 'j1', 'edit'], {
      state: { job: JOB, from: FROM_PREVIEW },
    });
    harness.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    type('title-input', 'Chef de Partida');
    submit();
    http.expectOne('/api/jobs/j1').flush({ ...JOB, title: 'Chef de Partida' });

    expect(navigate).toHaveBeenCalledWith('/my-jobs/j1/preview');
  });

  it('does not call the API when nothing changed', async () => {
    await openWithState();

    submit();

    expect(q('submit-error')!.textContent).toContain('Nenhuma alteração para salvar.');
    http.expectNone('/api/jobs/j1');
  });

  it('shows the API reason when the job was closed meanwhile (422)', async () => {
    await openWithState();

    type('title-input', 'Chef de Partida');
    submit();
    http
      .expectOne('/api/jobs/j1')
      .flush(
        { message: 'Não é possível editar uma vaga encerrada' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    harness.detectChanges();

    expect(q('submit-error')!.textContent).toContain('Não é possível editar uma vaga encerrada.');
  });

  it('asks to try again on a concurrent change (409) and keeps the form', async () => {
    await openWithState();

    type('title-input', 'Chef de Partida');
    submit();
    http.expectOne('/api/jobs/j1').flush(null, { status: 409, statusText: 'Conflict' });
    harness.detectChanges();

    const message = q('submit-error')!.textContent ?? '';
    expect(message).toContain('Tente novamente');
    expect(message).not.toContain('409');
    expect(q<HTMLButtonElement>('publish-btn')!.disabled).toBe(false);
  });

  it('shows the validation messages sent by the API (400)', async () => {
    await openWithState();

    type('title-input', 'Chef de Partida');
    submit();
    http
      .expectOne('/api/jobs/j1')
      .flush(
        { message: ['O salário não pode ser negativo'] },
        { status: 400, statusText: 'Bad Request' },
      );
    harness.detectChanges();

    expect(q('submit-error')!.textContent).toContain('O salário não pode ser negativo.');
  });
});
