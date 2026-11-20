import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Header } from './header';

describe('Header', () => {
  const authService = { logout: vi.fn(), getUser: () => ({ id: 'u1', role: 'PROFISSIONAL' }) };

  beforeEach(async () => {
    authService.logout.mockReset();
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('shows the notification bell, without a badge before anything is loaded', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('[data-testid="notifications-btn"]')).not.toBeNull();
    expect(nativeElement.querySelector('.bell img')?.getAttribute('src')).toBe('/icons/bell.svg');
    expect(nativeElement.querySelector('[data-testid="notifications-badge"]')).toBeNull();
  });

  it('renders a logout button', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="logout-btn"]')?.textContent).toContain(
      'Sair',
    );
  });

  it('clears the session and navigates to login when clicked', () => {
    const fixture = TestBed.createComponent(Header);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="logout-btn"]').click();

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
