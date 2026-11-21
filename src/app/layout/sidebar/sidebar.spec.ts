import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ProfessionalMe, RestaurantMe } from '../../core/models/profile.model';
import { AuthService } from '../../core/services/auth.service';
import { Sidebar } from './sidebar';

const RESTAURANT_ME: RestaurantMe = {
  role: 'RESTAURANTE',
  id: 'r1',
  email: 'restaurante.teste@komanda.dev',
  restaurantName: 'Cantina Bella Massa',
  cnpj: '11222333000181',
  cuisineType: 'Italiana',
  description: 'Cantina italiana',
  address: 'Rua das Flores, 123',
  phone: '(11) 98765-4321',
  zipCode: '01001-000',
  logoUrl: null,
  averageRating: null,
  plan: 'FREE',
};

const ME: ProfessionalMe = {
  role: 'PROFISSIONAL',
  id: 'u1',
  fullName: 'Jose Ravani',
  mainRole: 'Sushiman',
  profilePhoto: null,
  experienceSummary: null,
  specialties: [],
  neighborhood: null,
  city: null,
  state: null,
  experiences: [],
  availability: null,
};

describe('Sidebar (restaurante)', () => {
  let fixture: ComponentFixture<Sidebar>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const labels = () =>
    Array.from(el().querySelectorAll('.nav-link')).map((link) => link.textContent?.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => ({ id: 'r1', role: 'RESTAURANTE' }) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('hides Perfil until /me answers, then points it at the restaurant public profile', async () => {
    expect(labels()).toEqual(['Início', 'Vagas', 'Mensagens', 'Pipeline', 'Planos']);
    expect(el().querySelector('[data-testid="nav-perfil"]')).toBeNull();

    http.expectOne('/api/users/me').flush(RESTAURANT_ME);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(labels()).toEqual(['Início', 'Vagas', 'Mensagens', 'Pipeline', 'Planos', 'Perfil']);
    expect(el().querySelector('[data-testid="nav-perfil"]')?.getAttribute('href')).toBe('/restaurantes/r1');
  });

  it('shows the restaurant name, initials and logo', async () => {
    http.expectOne('/api/users/me').flush({ ...RESTAURANT_ME, logoUrl: '/logo.png' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="user-name"]')?.textContent).toContain('Cantina Bella Massa');
    expect(el().querySelector('[data-testid="user-role"]')?.textContent).toContain('Restaurante');
    expect(el().querySelector('[data-testid="user-avatar"] img')?.getAttribute('src')).toBe('/logo.png');
  });

  it('falls back to initials without a logo', async () => {
    http.expectOne('/api/users/me').flush(RESTAURANT_ME);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('.avatar-initials')?.textContent).toContain('CM');
  });

  it('keeps the navigation without Perfil when /me fails', async () => {
    http.expectOne('/api/users/me').flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(labels()).toHaveLength(5);
    expect(el().querySelector('[data-testid="user-role"]')?.textContent).toContain('Restaurante');
  });
});

describe('Sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => ({ id: 'u1', role: 'PROFISSIONAL' }) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('shows the logged professional name, role and initials', async () => {
    http.expectOne('/api/users/me').flush(ME);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="user-name"]')?.textContent).toContain('Jose Ravani');
    expect(el().querySelector('[data-testid="user-role"]')?.textContent).toContain('Sushiman');
    expect(el().querySelector('.avatar-initials')?.textContent).toContain('JR');
    const labels = fixture.debugElement.queryAll(By.css('.nav-link')).map((link) =>
      (link.nativeElement as HTMLElement).textContent?.trim(),
    );
    expect(labels).toEqual(['Início', 'Vagas', 'Matches', 'Mensagens', 'Perfil']);
    expect(el().querySelector('[data-testid="nav-perfil"]')?.getAttribute('href')).toBe('/perfil');
  });

  it('uses the profile photo when there is one', async () => {
    http.expectOne('/api/users/me').flush({ ...ME, profilePhoto: '/foto.jpg' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="user-avatar"] img')?.getAttribute('src')).toBe('/foto.jpg');
  });

  it('keeps the navigation without a name when the profile fails to load', async () => {
    http.expectOne('/api/users/me').flush(null, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="user-name"]')).toBeNull();
    expect(fixture.debugElement.queryAll(By.css('.nav-link')).length).toBe(5);
  });
});
