import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render user panel and 4 nav links', () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="user-name"]')?.textContent).toContain('Julian Rossi');
    expect(el.querySelector('[data-testid="user-role"]')?.textContent).toContain('EXECUTIVE CHEF');
    const links = fixture.debugElement.queryAll(By.css('.nav-link'));
    expect(links.length).toBe(4);
  });
});
