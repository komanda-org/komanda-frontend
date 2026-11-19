import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ProfessionalProfile } from '../../core/models/profile.model';
import { AuthService } from '../../core/services/auth.service';
import { Sidebar } from './sidebar';

const ME: ProfessionalProfile = {
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
  it('shows the restaurant navigation without asking for a professional profile', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => ({ id: 'r1', role: 'RESTAURANTE' }) } },
      ],
    }).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await fixture.whenStable();

    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.nav-link'),
    ).map((link) => link.textContent?.trim());
    expect(labels).toEqual(['Início', 'Vagas', 'Mensagens', 'Pipeline', 'Planos']);
    expect(fixture.nativeElement.querySelector('[data-testid="user-role"]')?.textContent).toContain(
      'Restaurante',
    );
    http.expectNone('/api/users/me');
    http.verify();
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
