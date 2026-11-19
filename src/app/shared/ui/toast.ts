import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

// A regiao live fica sempre no DOM: leitor de tela so anuncia texto que entra num live ja existente.
@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-region" role="status" aria-live="polite">
      @if (toast.message(); as message) {
        <div class="toast" data-testid="toast">
          <span>{{ message }}</span>
          <button type="button" class="toast__close" aria-label="Fechar aviso" (click)="toast.dismiss()">
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-region {
      position: fixed;
      bottom: var(--k-s-6, 24px);
      left: 50%;
      z-index: 200;
      transform: translateX(-50%);
      width: max-content;
      max-width: calc(100vw - 32px);
    }

    .toast {
      display: flex;
      align-items: center;
      gap: var(--k-s-3, 12px);
      padding: 0.8rem 1rem;
      color: var(--k-texto);
      background: var(--k-superficie-2, #222);
      border: 1px solid var(--k-ouro);
      border-radius: var(--k-raio, 4px);
      box-shadow: 0 8px 24px rgb(0 0 0 / 45%);
      font-size: var(--k-t-sm, 14px);
    }

    .toast__close {
      padding: 0 4px;
      color: var(--k-texto-fraco);
      background: none;
      border: 0;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }
  `,
})
export class Toast {
  protected readonly toast = inject(ToastService);
}
