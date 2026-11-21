import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BottomNav } from '../bottom-nav/bottom-nav';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

export const MOBILE_QUERY = '(max-width: 768px)';
export const SWIPE_MIN_PX = 60;

interface Point {
  x: number;
  y: number;
}

// Arrastar em campo, slider ou lista com rolagem lateral e do proprio elemento, nao do menu.
function ignoresSwipe(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    if (el.matches('input, textarea, select, [contenteditable="true"]')) {
      return true;
    }
    if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) {
      return true;
    }
  }
  return false;
}

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Header, Sidebar, BottomNav],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
  host: { '(document:keydown.escape)': 'closeDrawer()' },
})
export class AppLayout {
  protected readonly drawerOpen = signal(false);
  private swipeStart: Point | null = null;

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeDrawer());

    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    // Listener passivo: binding de template bloquearia a rolagem ate o handler rodar.
    afterNextRender(() => {
      const options = { passive: true };
      const start = (event: TouchEvent) => this.onTouchStart(event);
      const end = (event: TouchEvent) => this.onTouchEnd(event);
      const cancel = () => (this.swipeStart = null);
      host.addEventListener('touchstart', start, options);
      host.addEventListener('touchend', end, options);
      host.addEventListener('touchcancel', cancel, options);
      destroyRef.onDestroy(() => {
        host.removeEventListener('touchstart', start);
        host.removeEventListener('touchend', end);
        host.removeEventListener('touchcancel', cancel);
      });
    });
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  private onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    const usable =
      event.touches.length === 1 && matchMedia(MOBILE_QUERY).matches && !ignoresSwipe(event.target);
    this.swipeStart = usable ? { x: touch.clientX, y: touch.clientY } : null;
  }

  private onTouchEnd(event: TouchEvent): void {
    const start = this.swipeStart;
    const touch = event.changedTouches[0];
    this.swipeStart = null;
    if (!start || !touch) {
      return;
    }
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Gesto tem de ser claramente horizontal, senao seria so rolagem da pagina.
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) {
      return;
    }
    this.drawerOpen.set(dx > 0);
  }
}
