import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { ReviewsService } from '../../../core/services/reviews.service';
import { ReviewDialog, ReviewDialogResult } from './review-dialog';

@Component({
  selector: 'app-review-button',
  imports: [ReviewDialog],
  template: `
    @if (reviewed()) {
      <button type="button" class="review-btn review-btn--done" disabled data-testid="reviewed">
        Avaliado ✓
      </button>
    } @else {
      <button #trigger type="button" class="review-btn" (click)="open.set(true)" data-testid="review-btn">
        {{ label() }}
      </button>
    }
    @if (open()) {
      <app-review-dialog
        [jobId]="jobId()"
        [receiverId]="receiverId()"
        [receiverName]="receiverName()"
        [heading]="label()"
        (closed)="onClosed($event)"
      />
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .review-btn {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      justify-content: center;
      padding: 0.55rem 1rem;
      color: var(--k-ouro);
      background: transparent;
      border: 1px solid rgb(242 202 80 / 50%);
      border-radius: var(--k-raio);
      font: inherit;
      font-size: var(--k-t-xs);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: rgb(242 202 80 / 8%);
      }

      &:focus-visible {
        outline: 2px solid var(--k-ouro);
        outline-offset: 3px;
      }

      &--done {
        color: var(--k-texto-fraco);
        border-color: var(--k-linha);
        cursor: default;
      }
    }
  `,
})
export class ReviewButton {
  private readonly reviews = inject(ReviewsService);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly jobId = input.required<string>();
  readonly receiverId = input.required<string>();
  readonly receiverName = input.required<string>();
  readonly label = input.required<string>();

  protected readonly open = signal(false);
  protected readonly reviewed = computed(() =>
    this.reviews.isReviewed(this.jobId(), this.receiverId()),
  );

  protected onClosed(result: ReviewDialogResult): void {
    this.open.set(false);
    // Devolve o foco ao botao que abriu o dialogo (some quando vira "Avaliado").
    if (result === 'cancelled') {
      queueMicrotask(() => this.trigger()?.nativeElement.focus());
    }
  }
}
