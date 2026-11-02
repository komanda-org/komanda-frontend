import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Header } from './header';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Header] }).compileComponents();
    fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
  });

  it('shows the notification bell and unread indicator', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('[data-testid="notifications-btn"]')).not.toBeNull();
    expect(nativeElement.querySelector('.bell img')?.getAttribute('src')).toBe('/icons/bell.svg');
    expect(nativeElement.querySelector('.badge')).not.toBeNull();
  });
});
