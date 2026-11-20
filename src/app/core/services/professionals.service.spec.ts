import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProfessionalsService } from './professionals.service';

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProfessionalsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the public profile by id', () => {
    service.getById('p1').subscribe();

    const request = http.expectOne('/api/professionals/p1');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('pages the reviews with skip and take, within the limit of 50', () => {
    service.listReviews('p1').subscribe();
    service.listReviews('p1', 10, 500).subscribe();

    const [first, second] = http.match((req) => req.url === '/api/users/p1/reviews');
    expect(first.request.params.get('skip')).toBe('0');
    expect(first.request.params.get('take')).toBe('10');
    expect(second.request.params.get('skip')).toBe('10');
    expect(second.request.params.get('take')).toBe('50');
    first.flush({ data: [], total: 0, skip: 0, take: 10, averageRating: null });
    second.flush({ data: [], total: 0, skip: 10, take: 50, averageRating: null });
  });
});
