import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { apiErrorInterceptor } from '../../core/http/api-error.interceptor';
import { Login } from './login';

interface Internals {
  readonly form: FormGroup;
  submit(): void;
}

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Internals;
  let httpTestingController: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance as unknown as Internals;
    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  it('applies the email and password validations before submitting', () => {
    component.form.setValue({ email: 'not-an-email', password: 'short' });

    component.submit();

    expect(component.form.invalid).toBe(true);
    expect(component.form.controls['email'].errors?.['email']).toBe(true);
    expect(component.form.controls['password'].errors?.['minlength']).toBeTruthy();
    httpTestingController.expectNone('/api/auth/login');
  });

  it('sends valid credentials and navigates to the dashboard after success', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.form.setValue({ email: 'person@example.com', password: 'password123' });

    component.submit();

    const request = httpTestingController.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'person@example.com',
      password: 'password123',
    });
    request.flush({
      access_token: 'token',
      user: { id: 'user-id', role: 'PROFISSIONAL' },
    });

    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  });

  it('shows a localized message when the API rejects the password', () => {
    component.form.setValue({ email: 'person@example.com', password: 'password123' });

    component.submit();

    httpTestingController
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid password' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Senha incorreta.');
  });

  it('explains the cooldown when the API rate limit is reached', () => {
    component.form.setValue({ email: 'person@example.com', password: 'password123' });

    component.submit();

    httpTestingController
      .expectOne('/api/auth/login')
      .flush({ message: 'Too Many Requests' }, { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Muitas tentativas. Aguarde um minuto antes de tentar novamente.',
    );
  });
});
