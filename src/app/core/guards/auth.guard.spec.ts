import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

@Component({ template: '' })
class TestPage {}

describe('authGuard', () => {
  let isAuthenticated: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(() => {
    isAuthenticated = vi.fn().mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: TestPage },
          { path: 'protected', component: TestPage, canActivate: [authGuard] },
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
});
