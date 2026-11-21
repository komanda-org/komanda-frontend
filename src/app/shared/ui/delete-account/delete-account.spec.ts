import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import {
  ACCOUNT_ALREADY_DELETED_NOTICE,
  ACCOUNT_DELETED_NOTICE,
  DeleteAccount,
  describeDeleteError,
} from './delete-account';

describe('DeleteAccount', () => {
  let fixture: ComponentFixture<DeleteAccount>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = (testid: string) => el().querySelector(`[data-testid="${testid}"]`)?.textContent?.trim();

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function start(consequence?: string): Promise<void> {
    fixture = TestBed.createComponent(DeleteAccount);
    if (consequence !== undefined) {
      fixture.componentRef.setInput('consequence', consequence);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function open(): Promise<void> {
    el().querySelector<HTMLButtonElement>('[data-testid="delete-account-btn"]')!.click();
    await settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeleteAccount],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps the trigger in place and announces the confirmation', async () => {
    await start();
    const trigger = el().querySelector<HTMLButtonElement>('[data-testid="delete-account-btn"]')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    await settle();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(text('delete-confirm')).toContain('permanente');
    expect(el().querySelector('[data-testid="delete-confirm"] .warning')?.getAttribute('role')).toBe('alert');
  });

  it('shows the consequence passed by the screen', async () => {
    await start('Suas vagas também saem do ar.');
    await open();

    expect(text('delete-confirm')).toContain('Suas vagas também saem do ar.');
  });

  it('cancels without sending a request and returns focus to the trigger', async () => {
    await start();
    await open();

    const trigger = el().querySelector<HTMLButtonElement>('[data-testid="delete-account-btn"]')!;
    const cancel = el().querySelector<HTMLButtonElement>('[data-testid="cancel-delete-account"]')!;
    cancel.focus();
    cancel.click();
    await settle();

    expect(el().querySelector('[data-testid="delete-confirm"]')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('gives each instance its own confirmation id', () => {
    const first = TestBed.createComponent(DeleteAccount);
    const second = TestBed.createComponent(DeleteAccount);
    first.detectChanges();
    second.detectChanges();

    const ids = [first, second].map((instance) =>
      instance.nativeElement
        .querySelector('[data-testid="delete-account-btn"]')
        .getAttribute('aria-controls'),
    );

    expect(ids[0]).not.toBe(ids[1]);
  });

  it('deletes the account after confirmation, clears the session and goes to login', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const logout = vi.spyOn(auth, 'logout');
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await start();
    await open();
    el().querySelector<HTMLButtonElement>('[data-testid="confirm-delete-account"]')!.click();
    await settle();

    expect(text('confirm-delete-account')).toBe('Excluindo…');

    http
      .expectOne({ method: 'DELETE', url: '/api/users/me' })
      .flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/login', {
      state: { mensagem: ACCOUNT_DELETED_NOTICE },
    });
  });

  it('sends a single request when the confirm button is clicked twice', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const logout = vi.spyOn(auth, 'logout');
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await start();
    await open();
    const confirm = el().querySelector<HTMLButtonElement>('[data-testid="confirm-delete-account"]')!;
    confirm.click();
    confirm.click();
    await settle();

    http
      .expectOne({ method: 'DELETE', url: '/api/users/me' })
      .flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(logout).toHaveBeenCalledOnce();
  });

  it('keeps the account and shows actionable copy when deletion fails', async () => {
    const auth = TestBed.inject(AuthService);
    const logout = vi.spyOn(auth, 'logout');

    await start();
    await open();
    el().querySelector<HTMLButtonElement>('[data-testid="confirm-delete-account"]')!.click();
    await settle();

    http
      .expectOne({ method: 'DELETE', url: '/api/users/me' })
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(text('delete-error')).toContain('Tente de novo');
    expect(text('delete-error')).not.toMatch(/500/);
    expect(logout).not.toHaveBeenCalled();
    expect(
      el().querySelector<HTMLButtonElement>('[data-testid="confirm-delete-account"]')!.disabled,
    ).toBe(false);
  });

  it('treats an already deleted account as success', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const logout = vi.spyOn(auth, 'logout');
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await start();
    await open();
    el().querySelector<HTMLButtonElement>('[data-testid="confirm-delete-account"]')!.click();
    await settle();

    http
      .expectOne({ method: 'DELETE', url: '/api/users/me' })
      .flush({ message: 'Conta não encontrada' }, { status: 404, statusText: 'Not Found' });
    await settle();

    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/login', {
      state: { mensagem: ACCOUNT_ALREADY_DELETED_NOTICE },
    });
  });

  it('never exposes the HTTP status in the error copy', () => {
    for (const status of [0, 401, 403, 404, 500, 418]) {
      expect(describeDeleteError({ status, messages: ['x'] })).not.toMatch(/\d{3}/);
    }
  });
});
