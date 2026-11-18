import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../services/auth.service';
import { authChildGuard, authGuard } from './auth.guard';

@Component({ template: '' })
class TestPage {}

describe('auth guards', () => {
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
