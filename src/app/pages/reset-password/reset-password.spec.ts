import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { apiErrorInterceptor } from '../../core/http/api-error.interceptor';
import { PASSWORD_CHANGED_NOTICE, ResetPassword, describeResetError } from './reset-password';

@Component({ template: '' })
class Blank {}

describe('ResetPassword', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const el = () => harness.routeNativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(id: string) =>
    el().querySelector<T>(`[data-testid="${id}"]`);

  async function open(url: string): Promise<void> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, ResetPassword);
    harness.detectChanges();
  }

  function fill(password: string, confirmation: string): void {
    for (const [id, value] of [
      ['password-input', password],
      ['confirmation-input', confirmation],
    ]) {
      const input = q<HTMLInputElement>(id)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    }
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'auth/redefinir-senha', component: ResetPassword },
          { path: 'auth/recuperar-senha', component: Blank },
          { path: 'login', component: Blank },
        ]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('shows "Link inválido" with a way to ask for a new one when there is no token', async () => {
    await open('/auth/redefinir-senha');

    expect(q('invalid-link')!.textContent).toContain('Link inválido');
    expect(q('new-link')!.getAttribute('href')).toBe('/auth/recuperar-senha');
    expect(el().querySelector('form')).toBeNull();
  });

  it('blocks short or different passwords before sending', async () => {
    await open('/auth/redefinir-senha?token=abc123');

    fill('curta', 'curta');
    expect(el().textContent).toContain('A senha deve ter entre 8 e 64 caracteres.');

    fill('SenhaNova@1', 'SenhaNova@2');
    expect(el().textContent).toContain('As senhas não são iguais.');
    http.expectNone('/api/auth/reset-password');
  });

  it('toggles both fields between hidden and visible', async () => {
    await open('/auth/redefinir-senha?token=abc123');

    q('toggle-visibility')!.click();
    harness.detectChanges();

    expect(q('password-input')!.getAttribute('type')).toBe('text');
    expect(q('confirmation-input')!.getAttribute('type')).toBe('text');
  });

  it('sends token and password, then returns to login with the success notice', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    await open('/auth/redefinir-senha?token=abc123');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    fill('SenhaNova@1', 'SenhaNova@1');
    const request = http.expectOne('/api/auth/reset-password');
    expect(request.request.body).toEqual({ token: 'abc123', password: 'SenhaNova@1' });
    expect(q<HTMLButtonElement>('submit')!.disabled).toBe(true);
    request.flush({ message: 'Senha alterada com sucesso' });

    expect(navigate).toHaveBeenCalledWith('/login', { state: { mensagem: PASSWORD_CHANGED_NOTICE } });
    expect(setItem.mock.calls.flat().join(' ')).not.toContain('abc123');
    for (const spy of logs) {
      expect(spy.mock.calls.flat().map(String).join(' ')).not.toContain('abc123');
    }
  });

  it('shows the API reason and "Pedir novo link" when the link was already used', async () => {
    await open('/auth/redefinir-senha?token=usado');

    fill('SenhaNova@1', 'SenhaNova@1');
    http
      .expectOne('/api/auth/reset-password')
      .flush(
        { message: 'Este link já foi usado. Peça um novo.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    harness.detectChanges();

    expect(q('invalid-link')!.textContent).toContain('Este link já foi usado. Peça um novo.');
    expect(q('new-link')).not.toBeNull();
  });

  it('keeps the form on a rate limit and never shows an HTTP status', () => {
    expect(describeResetError({ status: 429, messages: [] })).toEqual({
      message: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
      linkInvalid: false,
    });
    for (const status of [0, 400, 429, 500]) {
      expect(describeResetError({ status, messages: ['x'] }).message).not.toMatch(/\d{3}/);
    }
  });
});
