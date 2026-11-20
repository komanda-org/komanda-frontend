import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the first page of 20 by default', () => {
    service.list().subscribe();

    const request = http.expectOne((req) => req.url === '/api/users/me/notifications');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('skip')).toBe('0');
    expect(request.request.params.get('take')).toBe('20');
    request.flush({ data: [], total: 0, skip: 0, take: 20 });
  });

  it('keeps take within the API limit of 50', () => {
    service.list(40, 200).subscribe();

    const request = http.expectOne((req) => req.url === '/api/users/me/notifications');
    expect(request.request.params.get('skip')).toBe('40');
    expect(request.request.params.get('take')).toBe('50');
    request.flush({ data: [], total: 0, skip: 40, take: 50 });
  });

  it('marks one notification as read', () => {
    service.markAsRead('n1').subscribe();

    const request = http.expectOne('/api/users/me/notifications/n1/read');
    expect(request.request.method).toBe('PATCH');
    request.flush({ id: 'n1', read: true });
  });
});
