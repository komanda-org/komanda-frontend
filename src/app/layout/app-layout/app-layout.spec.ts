import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppLayout } from './app-layout';

@Component({ template: '' })
class Blank {}

function touch(target: Element, type: string, x: number, y: number): void {
  const event = new Event(type, { bubbles: true });
  const points = [{ clientX: x, clientY: y }];
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : points });
  Object.defineProperty(event, 'changedTouches', { value: points });
  target.dispatchEvent(event);
}

function swipe(target: Element, fromX: number, toX: number, dy = 0): void {
  touch(target, 'touchstart', fromX, 300);
  touch(target, 'touchend', toX, 300 + dy);
}

describe('AppLayout', () => {
  let fixture: ComponentFixture<AppLayout>;
  let mobile: boolean;
  const el = () => fixture.nativeElement as HTMLElement;
  const content = () => el().querySelector('[data-testid="content"]')!;
  const isOpen = () => el().querySelector('app-sidebar')!.classList.contains('sidebar--open');

  beforeEach(async () => {
    mobile = true;
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: mobile, media: query }));
    await TestBed.configureTestingModule({
      imports: [AppLayout],
      providers: [
        provideRouter([{ path: 'outra', component: Blank }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => ({ id: 'r1', role: 'RESTAURANTE' }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('opens the menu with a left-to-right swipe and closes it with the opposite one', () => {
    swipe(content(), 20, 200);
    fixture.detectChanges();
    expect(isOpen()).toBe(true);
    expect(el().querySelector('[data-testid="drawer-backdrop"]')).not.toBeNull();

    swipe(content(), 200, 20);
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });

  it('ignores short, vertical or desktop gestures', () => {
    swipe(content(), 20, 50);
    swipe(content(), 20, 200, 250);
    mobile = false;
    swipe(content(), 20, 200);
    fixture.detectChanges();

    expect(isOpen()).toBe(false);
  });

  it('does not steal the drag from form controls like the distance slider', () => {
    const range = document.createElement('input');
    range.type = 'range';
    content().appendChild(range);

    swipe(range, 20, 200);
    fixture.detectChanges();

    expect(isOpen()).toBe(false);
  });

  it('closes on backdrop click, Escape and navigation', async () => {
    const reopen = () => {
      swipe(content(), 20, 200);
      fixture.detectChanges();
      expect(isOpen()).toBe(true);
    };

    reopen();
    (el().querySelector('[data-testid="drawer-backdrop"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(isOpen()).toBe(false);

    reopen();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(isOpen()).toBe(false);

    reopen();
    await TestBed.inject(Router).navigateByUrl('/outra');
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
  });
});
