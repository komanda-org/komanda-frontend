import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Header } from './header';

describe('Header', () => {
  const authService = { logout: vi.fn() };
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    authService.logout.mockReset();
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();
    fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
  });

  it('shows the notification bell and unread indicator', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('[data-testid="notifications-btn"]')).not.toBeNull();
    expect(nativeElement.querySelector('.bell img')?.getAttribute('src')).toBe('/icons/bell.svg');
    expect(nativeElement.querySelector('.badge')).not.toBeNull();
  });

  it('renders a logout button', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="logout-btn"]')?.textContent).toContain(
      'Sair',
    );
  });

  it('clears the session and navigates to login when clicked', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.nativeElement.querySelector('[data-testid="logout-btn"]').click();

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
