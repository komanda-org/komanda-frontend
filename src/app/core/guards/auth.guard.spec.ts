import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';

const TOKEN_KEY = 'komanda.accessToken';

function run(): ReturnType<typeof authGuard> {
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('authGuard', () => {
  afterEach(() => localStorage.removeItem(TOKEN_KEY));

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

  it('never redirects during server rendering', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'server' }],
    });

    expect(run()).toBe(true);
  });
});
