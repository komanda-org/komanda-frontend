import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AppNotification } from '../../core/models/notifications.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { describeError } from '../../core/utils/describe-error';
import { notificationRoute, unreadBadge } from '../../core/utils/notifications';
import { relativeTime } from '../../core/utils/relative-time';

export const REFRESH_INTERVAL_MS = 60_000;

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class Notifications {
  private readonly service = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly role = inject(AuthService).getUser()?.role ?? null;
  private readonly bell = viewChild.required<ElementRef<HTMLButtonElement>>('bell');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private requestVersion = 0;

  readonly openChange = output<boolean>();

  protected readonly items = signal<AppNotification[]>([]);
  protected readonly total = signal(0);
  protected readonly loaded = signal(false);
  protected readonly loading = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly markingAll = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly open = signal(false);
  protected readonly now = signal(new Date());

  protected readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);
  protected readonly badge = computed(() => unreadBadge(this.unreadCount()));
  protected readonly hasMore = computed(() => this.items().length < this.total());
  protected readonly bellLabel = computed(() => {
    const count = this.unreadCount();
    if (count === 0) {
      return 'Notificações';
    }
    return `Notificações, ${this.badge()} ${count === 1 ? 'não lida' : 'não lidas'}`;
  });
  protected readonly relativeTime = relativeTime;

  constructor() {
    // Token e document.visibilityState so existem no navegador.
    afterNextRender(() => {
      if (!this.role) {
        return;
      }
      this.refresh();
      const refreshIfVisible = () => {
        if (this.document.visibilityState === 'visible' && !this.open()) {
          this.refresh();
        }
      };
      const timer = setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
      this.document.addEventListener('visibilitychange', refreshIfVisible);
      this.destroyRef.onDestroy(() => {
        clearInterval(timer);
        this.document.removeEventListener('visibilitychange', refreshIfVisible);
      });
    });
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    this.openChange.emit(true);
    this.actionError.set(null);
    this.refresh();
    afterNextRender(() => this.panel()?.nativeElement.focus(), { injector: this.injector });
  }

  protected close(returnFocus = true): void {
    this.open.set(false);
    this.openChange.emit(false);
    if (returnFocus) {
      this.bell().nativeElement.focus();
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.contains(event.target as Node | null)) {
      this.close(false);
    }
  }

  protected onEscape(): void {
    if (this.open()) {
      this.close();
    }
  }

  protected trapFocus(event: KeyboardEvent): void {
    const panel = this.panel()?.nativeElement;
    if (event.key !== 'Tab' || !panel) {
      return;
    }
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected refresh(): void {
    const version = ++this.requestVersion;
    this.loading.set(true);
    this.loadError.set(null);
    this.service
      .list(0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (version !== this.requestVersion) {
            return;
          }
          this.items.set(page.data);
          this.total.set(page.total);
          this.now.set(new Date());
          this.loaded.set(true);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (version !== this.requestVersion) {
            return;
          }
          this.loading.set(false);
          this.loadError.set(
            describeError(error, { fallback: 'Não conseguimos carregar suas notificações. Tente de novo.' }),
          );
        },
      });
  }

  protected loadMore(): void {
    if (this.loadingMore()) {
      return;
    }
    const version = ++this.requestVersion;
    this.loadingMore.set(true);
    this.actionError.set(null);
    this.service
      .list(this.items().length)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.loadingMore.set(false);
          if (version !== this.requestVersion) {
            return;
          }
          const known = new Set(this.items().map((item) => item.id));
          this.items.update((items) => [...items, ...page.data.filter((item) => !known.has(item.id))]);
          this.total.set(page.total);
        },
        error: (error: unknown) => {
          this.loadingMore.set(false);
          this.actionError.set(
            describeError(error, { fallback: 'Não conseguimos carregar mais notificações. Tente de novo.' }),
          );
        },
      });
  }

  protected select(notification: AppNotification): void {
    if (!notification.read) {
      this.markRead(notification.id);
    }
    const route = notificationRoute(notification.title, this.role);
    if (route) {
      this.close(false);
      void this.router.navigateByUrl(route);
    }
  }

  protected markAllRead(): void {
    const unread = this.items()
      .filter((item) => !item.read)
      .map((item) => item.id);
    if (unread.length === 0 || this.markingAll()) {
      return;
    }
    // Nao ha rota em lote na API: um PATCH por aviso nao lido desta lista.
    this.markingAll.set(true);
    this.actionError.set(null);
    this.setRead(unread, true);
    forkJoin(
      unread.map((id) =>
        this.service.markAsRead(id).pipe(
          map(() => null),
          catchError(() => of(id)),
        ),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        this.markingAll.set(false);
        const failed = results.filter((id): id is string => id !== null);
        if (failed.length > 0) {
          this.setRead(failed, false);
          this.actionError.set('Não conseguimos marcar todas como lidas. Tente de novo.');
        }
      });
  }

  private markRead(id: string): void {
    this.setRead([id], true);
    this.service
      .markAsRead(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => this.setRead([id], false) });
  }

  private setRead(ids: string[], read: boolean): void {
    const targets = new Set(ids);
    this.items.update((items) => items.map((item) => (targets.has(item.id) ? { ...item, read } : item)));
  }
}
