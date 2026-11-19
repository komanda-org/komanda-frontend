import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { JobOverview, RestaurantJob } from '../models/restaurant-jobs.model';
import { RestaurantJobsService } from './restaurant-jobs.service';

const job = (id: string): RestaurantJob => ({
  id,
  title: 'Vaga ' + id,
  description: 'Descrição',
  requirements: null,
  salary: 1200,
  contractType: 'CLT',
  shift: 'NOITE',
  status: 'ABERTA',
  urgent: false,
  createdAt: '2026-11-19T09:20:05.805Z',
});

describe('RestaurantJobsService', () => {
  let service: RestaurantJobsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RestaurantJobsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads my jobs from the paginated data field', () => {
    let result: RestaurantJob[] = [];
    service.listMine().subscribe((jobs) => (result = jobs));

    const request = http.expectOne((r) => r.url === '/api/users/me/jobs');
    expect(request.request.params.get('take')).toBe('50');
    request.flush({ data: [job('j1')], total: 1, skip: 0, take: 50 });

    expect(result.map((j) => j.id)).toEqual(['j1']);
  });

  it('joins each job with its applicants', () => {
    let result: JobOverview[] = [];
    service.overview().subscribe((overview) => (result = overview));

    http.expectOne((r) => r.url === '/api/users/me/jobs').flush({ data: [job('j1'), job('j2')], total: 2, skip: 0, take: 50 });
    http.expectOne((r) => r.url === '/api/jobs/j1/applications').flush({ data: [], total: 0, skip: 0, take: 50 });
    http.expectOne((r) => r.url === '/api/jobs/j2/applications').flush({ data: [], total: 0, skip: 0, take: 50 });

    expect(result.map((item) => item.job.id)).toEqual(['j1', 'j2']);
  });

  it('closes a job through the status endpoint', () => {
    service.updateStatus('j1', 'ENCERRADA').subscribe();

    const request = http.expectOne('/api/jobs/j1/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'ENCERRADA' });
    request.flush(job('j1'));
  });

  it('edits a job sending only the changed fields', () => {
    service.updateJob('j1', { title: 'Chef de cozinha', salary: null }).subscribe();

    const request = http.expectOne('/api/jobs/j1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ title: 'Chef de cozinha', salary: null });
    request.flush(job('j1'));
  });

  it('updates an applicant status', () => {
    service.updateApplicantStatus('j1', 'a1', 'APROVADA').subscribe();

    const request = http.expectOne('/api/jobs/j1/applications/a1/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'APROVADA' });
    request.flush({});
  });
});
