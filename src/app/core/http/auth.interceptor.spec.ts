import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { apiErrorInterceptor } from './api-error.interceptor';
import {
  ACCOUNT_DELETED_TOAST,
  SESSION_ENDED_TOAST,
  authInterceptor,
  sessionEndedMessage,
} from './auth.interceptor';

const TOKEN_KEY = 'komanda.accessToken';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let toast: ToastService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'abc123');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    vi.spyOn(toast, 'show');
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
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
    const urls = [
      '/icons/star.svg',
      '/apiary',
      'https://cdn.example.com/x.json',
      '//cdn.example.com/y.json',
    ];
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

  it('drops the session, explains it and goes to login when the API rejects the token', () => {
    http.get('/api/users/me').subscribe({ error: () => undefined });
    backend
      .expectOne('/api/users/me')
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(toast.show).toHaveBeenCalledExactlyOnceWith(SESSION_ENDED_TOAST);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('says the account was deleted when the API says so', () => {
    http.get('/api/jobs').subscribe({ error: () => undefined });
    backend
      .expectOne('/api/jobs')
      .flush(
        { message: 'Sessão encerrada: a conta foi excluída ou desativada' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(toast.show).toHaveBeenCalledExactlyOnceWith(ACCOUNT_DELETED_TOAST);
  });

  it('shows the toast only once when several requests fail together', () => {
    const urls = ['/api/users/me', '/api/jobs', '/api/users/me/notifications'];
    urls.forEach((url) => http.get(url).subscribe({ error: () => undefined }));
    for (const url of urls) {
      backend.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' });
    }

    expect(toast.show).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('leaves the 401 of the login screen to the login screen', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    backend
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(toast.show).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the session on other failures', () => {
    http.get('/api/users/me').subscribe({ error: () => undefined });
    backend.expectOne('/api/users/me').flush(null, { status: 500, statusText: 'Server Error' });

    expect(localStorage.getItem(TOKEN_KEY)).toBe('abc123');
    expect(toast.show).not.toHaveBeenCalled();
  });
});

describe('sessionEndedMessage', () => {
  it('matches "excluída" with or without the accent', () => {
    expect(sessionEndedMessage({ status: 401, messages: ['Conta excluida'] })).toBe(ACCOUNT_DELETED_TOAST);
    expect(sessionEndedMessage({ status: 401, messages: ['Token expirado'] })).toBe(SESSION_ENDED_TOAST);
    expect(sessionEndedMessage(null)).toBe(SESSION_ENDED_TOAST);
  });
});
