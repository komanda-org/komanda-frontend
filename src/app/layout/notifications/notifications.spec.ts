import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../core/http/api-error.interceptor';
import { UserRole } from '../../core/models/auth.model';
import { AppNotification } from '../../core/models/notifications.model';
import { AuthService } from '../../core/services/auth.service';
import { Notifications, REFRESH_INTERVAL_MS } from './notifications';

const LIST_URL = '/api/users/me/notifications';

function notification(id: string, title: string, read = false): AppNotification {
  return { id, title, message: `Mensagem ${id}`, read, createdAt: new Date().toISOString() };
}

const APPROVED = notification('n1', 'Candidatura aprovada: Garçom');
const OLD_MESSAGE = notification('n2', 'Nova mensagem de Ana', true);

describe('Notifications', () => {
  let fixture: ComponentFixture<Notifications>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(id: string) =>
    el().querySelector<T>(`[data-testid="${id}"]`);
  const bell = () => q<HTMLButtonElement>('notifications-btn')!;
  const items = () => Array.from(el().querySelectorAll<HTMLButtonElement>('[data-testid="notification-item"]'));

  async function setup(role: UserRole = 'PROFISSIONAL'): Promise<void> {
    TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => ({ id: 'u1', role }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Notifications);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function flushList(data: AppNotification[], total = data.length, skip = 0): void {
    http
      .expectOne((req) => req.url === LIST_URL && req.params.get('skip') === String(skip))
      .flush({ data, total, skip, take: 20 });
    fixture.detectChanges();
  }

  async function openPanel(data: AppNotification[], total = data.length): Promise<void> {
    bell().click();
    fixture.detectChanges();
    flushList(data, total);
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('shows the badge only while there is an unread notification', async () => {
    await setup();
    flushList([APPROVED, OLD_MESSAGE]);

    expect(q('notifications-badge')!.textContent?.trim()).toBe('1');
    expect(bell().getAttribute('aria-label')).toBe('Notificações, 1 não lida');

    await openPanel([APPROVED, OLD_MESSAGE]);
    q<HTMLButtonElement>('notifications-read-all')!.click();
    fixture.detectChanges();
    http.expectOne(`${LIST_URL}/n1/read`).flush({ ...APPROVED, read: true });

    expect(q('notifications-badge')).toBeNull();
    expect(bell().getAttribute('aria-label')).toBe('Notificações');
  });

  it('has no badge when everything was read', async () => {
    await setup();
    flushList([OLD_MESSAGE]);

    expect(q('notifications-badge')).toBeNull();
  });

  it('opens the panel with the empty state', async () => {
    await setup();
    flushList([]);

    await openPanel([]);

    expect(bell().getAttribute('aria-expanded')).toBe('true');
    expect(q('notifications-panel')).not.toBeNull();
    expect(q('notifications-empty')!.textContent).toContain('Nenhuma notificação por enquanto');
  });

  it('closes with Escape and gives the focus back to the bell', async () => {
    await setup();
    flushList([]);
    await openPanel([APPROVED]);

    expect(document.activeElement).toBe(q('notifications-panel'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(q('notifications-panel')).toBeNull();
    expect(document.activeElement).toBe(bell());
  });

  it('closes when clicking outside, but not when clicking inside', async () => {
    await setup();
    flushList([]);
    await openPanel([OLD_MESSAGE]);

    q('notifications-panel')!.click();
    fixture.detectChanges();
    expect(q('notifications-panel')).not.toBeNull();

    document.body.click();
    fixture.detectChanges();
    expect(q('notifications-panel')).toBeNull();
  });

  it('keeps the focus inside the panel while it is open', async () => {
    await setup();
    flushList([]);
    await openPanel([APPROVED]);

    const last = items()[0];
    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(q('notifications-read-all'));
  });

  it('marks the notification as read and opens Matches for an approved application', async () => {
    await setup();
    flushList([APPROVED]);
    await openPanel([APPROVED]);

    expect(items()[0].classList).toContain('item--unread');
    items()[0].click();
    fixture.detectChanges();

    const request = http.expectOne(`${LIST_URL}/n1/read`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ ...APPROVED, read: true });
    fixture.detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/matches');
    expect(q('notifications-panel')).toBeNull();
    expect(q('notifications-badge')).toBeNull();
  });

  it('opens the pipeline for a new application on the restaurant side, without patching read ones', async () => {
    await setup('RESTAURANTE');
    flushList([]);
    await openPanel([notification('n3', 'Nova candidatura: Garçom', true)]);

    items()[0].click();

    http.expectNone(`${LIST_URL}/n3/read`);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/pipeline');
  });

  it('marks all unread ones in parallel and restores those that failed', async () => {
    await setup();
    const unread = [APPROVED, notification('n4', 'Vaga encerrada: Garçom')];
    flushList([]);
    await openPanel([...unread, OLD_MESSAGE]);

    q<HTMLButtonElement>('notifications-read-all')!.click();
    fixture.detectChanges();
    http.expectNone(`${LIST_URL}/n2/read`);
    http.expectOne(`${LIST_URL}/n1/read`).flush({ ...APPROVED, read: true });
    http
      .expectOne(`${LIST_URL}/n4/read`)
      .flush({ message: 'Notificação não encontrada' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(q('notifications-badge')!.textContent?.trim()).toBe('1');
    expect(q('notifications-action-error')!.textContent).toContain('Não conseguimos marcar todas');
  });

  it('loads the next page with "Carregar mais"', async () => {
    await setup();
    flushList([]);
    await openPanel([APPROVED], 2);

    q<HTMLButtonElement>('notifications-more')!.click();
    fixture.detectChanges();
    flushList([OLD_MESSAGE], 2, 1);

    expect(items()).toHaveLength(2);
    expect(q('notifications-more')).toBeNull();
  });

  it('shows an actionable message, without the status, when the list fails', async () => {
    await setup();
    flushList([]);
    bell().click();
    fixture.detectChanges();
    http
      .expectOne((req) => req.url === LIST_URL)
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const message = q('notifications-error')!.textContent ?? '';
    expect(message).toContain('Tente de novo');
    expect(message).not.toContain('500');
  });

  it('refreshes every minute only while the tab is visible', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await setup();
    flushList([]);

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    flushList([APPROVED]);
    expect(q('notifications-badge')).not.toBeNull();

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    http.expectNone((req) => req.url === LIST_URL);
    visibility.mockRestore();
  });
});
