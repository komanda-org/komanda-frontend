import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Header } from './header';

describe('Header', () => {
  const authService = { logout: vi.fn() };

  beforeEach(async () => {
    authService.logout.mockReset();
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();
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
