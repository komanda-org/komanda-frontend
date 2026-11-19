import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { AuthUser } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { homeFor, roleGuard } from './role.guard';

describe('roleGuard', () => {
  function run(user: AuthUser | null, role: AuthUser['role']): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { getUser: () => user } }],
    });
    return TestBed.runInInjectionContext(
      () => roleGuard(role)({} as never, {} as never) as boolean | UrlTree,
    );
  }

  const url = (result: boolean | UrlTree) =>
    result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;

  it('lets the matching role through', () => {
    expect(run({ id: 'r1', role: 'RESTAURANTE' }, 'RESTAURANTE')).toBe(true);
  });

  it('sends each role to its own home', () => {
    expect(url(run({ id: 'p1', role: 'PROFISSIONAL' }, 'RESTAURANTE'))).toBe('/home');
    TestBed.resetTestingModule();
    expect(url(run({ id: 'r1', role: 'RESTAURANTE' }, 'PROFISSIONAL'))).toBe('/dashboard');
  });

  it('sends a visitor without session to login', () => {
    expect(url(run(null, 'RESTAURANTE'))).toBe('/login');
  });

  it('maps roles to their home route', () => {
    expect(homeFor('RESTAURANTE')).toBe('/dashboard');
    expect(homeFor('PROFISSIONAL')).toBe('/home');
  });
});
