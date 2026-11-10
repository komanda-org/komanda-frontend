import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let service: JobsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(JobsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches jobs with only the defined and non-empty parameters', () => {
    service
      .search({
        query: 'cozinheiro',
        contractType: 'CLT',
        shift: '',
        minSalary: 0,
        skip: 0,
        take: 20,
      })
      .subscribe();

    const request = http.expectOne((req) => req.url === '/api/jobs/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([
      'query',
      'contractType',
      'minSalary',
      'skip',
      'take',
    ]);
    expect(request.request.params.get('minSalary')).toBe('0');
    expect(request.request.params.has('shift')).toBe(false);
    request.flush({ data: [], total: 0, skip: 0, take: 20 });
  });
});
