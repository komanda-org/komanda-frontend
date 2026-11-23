import { TestBed } from '@angular/core/testing';
import { Plans } from './plans';

describe('Plans', () => {
  function render() {
    TestBed.configureTestingModule({ imports: [Plans] });
    const fixture = TestBed.createComponent(Plans);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('lists the three plans with prices and enabled select buttons', () => {
    const { el } = render();

    const cards = el.querySelectorAll('[data-testid="plan-card"]');
    expect(cards).toHaveLength(3);
    expect(cards[1].textContent).toContain('Mais popular');
    expect(cards[1].textContent).toContain('R$ 89,90');
    expect(cards[2].textContent).toContain('R$ 199,90');
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('.plan__cta'));
    expect(buttons.every((b) => !b.disabled)).toBe(true);
    expect(el.querySelector('[data-testid="plan-selection"]')).toBeNull();
  });

  it('marks the chosen plan only on screen, without changing the account plan', () => {
    const { fixture, el } = render();

    el.querySelectorAll<HTMLButtonElement>('.plan__cta')[2].click();
    fixture.detectChanges();

    const cards = el.querySelectorAll('[data-testid="plan-card"]');
    expect(cards[2].classList).toContain('plan--selected');
    expect(cards[2].querySelector('.plan__cta')?.textContent).toContain('Selecionado');
    expect(cards[0].classList).not.toContain('plan--selected');
    const status = el.querySelector('[data-testid="plan-selection"]');
    expect(status?.textContent).toContain('Empresarial');
    expect(status?.textContent).toContain('não foi alterado');
  });
});
