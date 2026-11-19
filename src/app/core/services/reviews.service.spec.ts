import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let http: HttpTestingController;
  let userId: string;

  beforeEach(() => {
    userId = 'u1';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => ({ id: userId, role: 'PROFISSIONAL' }) } },
      ],
    });
    service = TestBed.inject(ReviewsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the review body as the API expects', () => {
    service.create({ jobId: 'j1', receiverId: 'r1', rating: 4, comment: 'Ótima equipe' }).subscribe();

    const request = http.expectOne('/api/users/reviews');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ jobId: 'j1', receiverId: 'r1', rating: 4, comment: 'Ótima equipe' });
    request.flush({ id: 'rev1' });
  });

  it('remembers what the logged user already reviewed, per job and receiver', () => {
    service.markReviewed('j1', 'r1');

    expect(service.isReviewed('j1', 'r1')).toBe(true);
    expect(service.isReviewed('j2', 'r1')).toBe(false);

    userId = 'u2';
    expect(service.isReviewed('j1', 'r1')).toBe(false);
  });
});
