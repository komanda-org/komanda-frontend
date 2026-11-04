import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from './api-error.interceptor';
import { authInterceptor } from './auth.interceptor';

const TOKEN_KEY = 'komanda.accessToken';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'abc123');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    localStorage.removeItem(TOKEN_KEY);
  });

  it('adds the bearer token to API requests', () => {
    http.get('/api/users/me').subscribe();
    const req = backend.expectOne('/api/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({});
  });

  it('never sends the token outside the API', () => {
    const urls = ['/icons/star.svg', '/apiary', 'https://cdn.example.com/x.json', '//cdn.example.com/y.json'];
    urls.forEach((url) => http.get(url).subscribe());
    for (const url of urls) {
      const req = backend.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    }
  });

  it('leaves the request untouched without a session', () => {
    localStorage.removeItem(TOKEN_KEY);
    http.get('/api/users/me').subscribe();
    const req = backend.expectOne('/api/users/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('drops the session when the API rejects the token', () => {
    http.get('/api/users/me').subscribe({ error: () => undefined });
    backend.expectOne('/api/users/me').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('keeps the session on other failures', () => {
    http.get('/api/users/me').subscribe({ error: () => undefined });
    backend.expectOne('/api/users/me').flush(null, { status: 500, statusText: 'Server Error' });

    expect(localStorage.getItem(TOKEN_KEY)).toBe('abc123');
  });
});
