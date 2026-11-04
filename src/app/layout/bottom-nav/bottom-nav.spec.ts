import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BottomNav } from './bottom-nav';

@Component({ template: '' })
class Blank {}

describe('BottomNav', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BottomNav],
      providers: [provideRouter([{ path: 'perfil', component: Blank }])],
    });
  });

  it('renders the 4 nav links', () => {
    const fixture = TestBed.createComponent(BottomNav);
    fixture.detectChanges();
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('a.item');
    expect(Array.from(links).map((l) => l.textContent?.trim())).toEqual([
      'Vagas',
      'Matches',
      'Mensagens',
      'Perfil',
    ]);
  });

  it('marks the current route as active', async () => {
    const fixture = TestBed.createComponent(BottomNav);
    await TestBed.inject(Router).navigateByUrl('/perfil');
    fixture.detectChanges();
    await fixture.whenStable();

    const active = (fixture.nativeElement as HTMLElement).querySelector('a.active');
    expect(active?.getAttribute('data-testid')).toBe('bottom-nav-perfil');
    expect(active?.getAttribute('aria-current')).toBe('page');
  });
});
