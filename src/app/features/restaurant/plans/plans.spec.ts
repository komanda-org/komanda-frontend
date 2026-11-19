import { TestBed } from '@angular/core/testing';
import { Plans } from './plans';

describe('Plans', () => {
  it('lists the three plans and keeps subscription disabled until it exists', () => {
    TestBed.configureTestingModule({ imports: [Plans] });
    const fixture = TestBed.createComponent(Plans);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const cards = el.querySelectorAll('[data-testid="plan-card"]');
    expect(cards).toHaveLength(3);
    expect(cards[1].textContent).toContain('Mais popular');
    expect(Array.from(el.querySelectorAll<HTMLButtonElement>('.plan__cta')).every((b) => b.disabled)).toBe(true);
  });
});
