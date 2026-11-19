import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../core/http/api-error.interceptor';
import { ForgotPassword, describeRecoverError } from './forgot-password';

describe('ForgotPassword', () => {
  let fixture: ComponentFixture<ForgotPassword>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(id: string) =>
    el().querySelector<T>(`[data-testid="${id}"]`);

  function submitEmail(email: string): void {
    const input = q<HTMLInputElement>('email-input')!;
    input.value = email;
    input.dispatchEvent(new Event('input'));
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(ForgotPassword);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('blocks an invalid e-mail before calling the API', () => {
    submitEmail('nao-e-email');

    expect(el().textContent).toContain('Informe um e-mail válido.');
    http.expectNone('/api/auth/recover-password');
  });

  it('sends the e-mail, disables the button meanwhile and shows the neutral confirmation', () => {
    submitEmail(' pessoa@komanda.dev ');

    const request = http.expectOne('/api/auth/recover-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'pessoa@komanda.dev' });
    expect(q<HTMLButtonElement>('submit')!.disabled).toBe(true);
    expect(q('submit')!.textContent).toContain('Enviando');

    request.flush({ message: 'Se o e-mail constar em nossa base, as instruções foram enviadas' });
    fixture.detectChanges();

    expect(q('sent')!.textContent).toContain('Se houver uma conta com esse e-mail');
    expect(q('sent')!.textContent).toContain('caixa de spam');
    expect(q('back-to-login')!.getAttribute('href')).toBe('/login');
    expect(el().querySelector('form')).toBeNull();
  });

  it('explains the rate limit and keeps the form', () => {
    submitEmail('pessoa@komanda.dev');
    http
      .expectOne('/api/auth/recover-password')
      .flush({ message: 'Too Many Requests' }, { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();

    expect(q('error')!.textContent).toContain('Muitas tentativas. Aguarde um minuto e tente de novo.');
    expect(q<HTMLButtonElement>('submit')!.disabled).toBe(false);
  });

  it('never says the e-mail was not found nor shows an HTTP status', () => {
    for (const status of [0, 400, 404, 429, 500]) {
      const message = describeRecoverError({ status, messages: ['User not found'] });
      expect(message).not.toMatch(/não encontrad|\d{3}/i);
    }
  });
});
