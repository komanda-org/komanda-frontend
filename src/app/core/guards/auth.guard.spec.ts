import { PLATFORM_ID } from '@angular/core';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../services/auth.service';
import { authChildGuard, authGuard } from './auth.guard';

const TOKEN_KEY = 'komanda.accessToken';

function run(): ReturnType<typeof authGuard> {
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

@Component({ template: '' })
class TestPage {}

describe('auth guards', () => {
  afterEach(() => localStorage.removeItem(TOKEN_KEY));

  describe('authGuard (unit)', () => {
    it('lets the user through with a session', () => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      localStorage.setItem(TOKEN_KEY, 'abc');

      expect(run()).toBe(true);
    });

    it('redirects to /login without a session', () => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });

      const result = run();
      expect(result instanceof UrlTree).toBe(true);
      expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
    });

    it('redirects to /login when the stored token is empty', () => {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      localStorage.setItem(TOKEN_KEY, '');

      const result = run();
      expect(result instanceof UrlTree).toBe(true);
    });

    it('never redirects during server rendering', () => {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'server' }],
      });

      expect(run()).toBe(true);
    });
  });

  describe('authGuard + authChildGuard (integration)', () => {
    let isAuthenticated: ReturnType<typeof vi.fn>;
    let router: Router;

    beforeEach(() => {
      isAuthenticated = vi.fn().mockReturnValue(false);
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            { path: 'login', component: TestPage },
            { path: 'protected', component: TestPage, canActivate: [authGuard] },
            {
              path: 'app',
              component: TestPage,
              canActivateChild: [authChildGuard],
              children: [
                { path: 'a', component: TestPage },
                { path: 'b', component: TestPage },
              ],
            },
          ]),
          { provide: AuthService, useValue: { isAuthenticated } },
        ],
      });
      router = TestBed.inject(Router);
    });

    it('redirects unauthenticated navigation to login', async () => {
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/protected');

      expect(router.url).toBe('/login');
    });

    it('allows authenticated navigation', async () => {
      isAuthenticated.mockReturnValue(true);
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/protected');

      expect(router.url).toBe('/protected');
    });

    it('redirects unauthenticated navigation to a child route', async () => {
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/app/a');

      expect(router.url).toBe('/login');
    });

    it('re-checks auth when navigating between children', async () => {
      isAuthenticated.mockReturnValue(true);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/app/a');

      // Sessao some (logout em outra aba) e a proxima navegacao entre telas cai no login.
      isAuthenticated.mockReturnValue(false);
      await harness.navigateByUrl('/app/b');

      expect(router.url).toBe('/login');
    });
  });
});
