import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // O App tem um <router-outlet> no template: sem um Router configurado
      // o TestBed nao consegue nem criar o componente.
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            getUser: () => ({ id: 'restaurant-id', role: 'RESTAURANTE' }),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('opens the restaurant dashboard route', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/dashboard');

    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(harness.routeNativeElement?.textContent).toContain('Bem-vindo, Restaurante!');
  });
});
