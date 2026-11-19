import { TestBed } from '@angular/core/testing';
import { TOAST_DURATION_MS, ToastService } from '../../core/services/toast.service';
import { Toast } from './toast';

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the message and hides it after a few seconds', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(Toast);
    const service = TestBed.inject(ToastService);
    const el = fixture.nativeElement as HTMLElement;

    service.show('Vaga atualizada');
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="toast"]')?.textContent).toContain('Vaga atualizada');
    expect(el.querySelector('[role="status"]')).not.toBeNull();

    vi.advanceTimersByTime(TOAST_DURATION_MS);
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="toast"]')).toBeNull();
  });

  it('can be dismissed by the close button', () => {
    const fixture = TestBed.createComponent(Toast);
    TestBed.inject(ToastService).show('Vaga atualizada');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="toast"]')).toBeNull();
  });
});
