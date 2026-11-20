import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isApiError } from '../../../core/models/api-error.model';
import { ReviewsService } from '../../../core/services/reviews.service';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorCopy, apiMessage, describeError } from '../../../core/utils/describe-error';

export const REVIEW_SENT_TOAST = 'Avaliação enviada';
export const ALREADY_REVIEWED_TOAST = 'Você já tinha avaliado nesta vaga.';
export const COMMENT_MAX = 240;
export const STARS = [1, 2, 3, 4, 5] as const;

/** Rotulo da nota abaixo das estrelas (4 = "Muito bom", como no Figma). */
const RATING_LABELS: Record<number, string> = {
  1: 'Ruim',
  2: 'Regular',
  3: 'Bom',
  4: 'Muito bom',
  5: 'Excelente',
};

export function ratingLabel(value: number): string | null {
  return RATING_LABELS[value] ?? null;
}

export type ReviewDialogResult = 'reviewed' | 'cancelled';

const ERROR_COPY: ErrorCopy = {
  fallback: 'Não foi possível enviar a avaliação. Tente de novo.',
  byStatus: {
    // O 400 da API vem em ingles (class-validator), entao fica a frase nossa.
    400: 'Confira a nota e o comentário e tente de novo.',
    401: 'Sua sessão expirou. Entre novamente para avaliar.',
    404: 'Esta vaga não existe mais.',
    429: 'Muitas tentativas. Aguarde um instante e tente de novo.',
  },
};

export function describeReviewError(error: unknown): string {
  if (isApiError(error) && error.status === 403) {
    return apiMessage(error) ?? 'Você só pode avaliar depois de uma contratação aprovada nesta vaga.';
  }
  return describeError(error, ERROR_COPY);
}

export function starsLabel(value: number): string {
  return value === 1 ? '1 estrela' : `${value} estrelas`;
}

@Component({
  selector: 'app-review-dialog',
  templateUrl: './review-dialog.html',
  styleUrl: './review-dialog.scss',
  host: { '(document:keydown.escape)': 'cancel()' },
})
export class ReviewDialog {
  private readonly reviews = inject(ReviewsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly jobId = input.required<string>();
  readonly receiverId = input.required<string>();
  readonly receiverName = input.required<string>();
  readonly jobTitle = input('');
  readonly shift = input<string | null>(null);
  readonly heading = input('Como foi a experiência?');
  readonly closed = output<ReviewDialogResult>();

  protected readonly stars = STARS;
  protected readonly starsLabel = starsLabel;
  protected readonly ratingLabel = ratingLabel;
  protected readonly commentMax = COMMENT_MAX;
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    afterNextRender(() => host.querySelector<HTMLInputElement>('input[type="radio"]')?.focus());
  }

  protected cancel(): void {
    if (this.success()) {
      this.conclude();
      return;
    }
    if (!this.submitting()) {
      this.closed.emit('cancelled');
    }
  }

  protected conclude(): void {
    this.closed.emit('reviewed');
  }

  protected submit(): void {
    if (this.submitting() || this.success()) {
      return;
    }
    const rating = this.rating();
    if (rating < 1) {
      this.error.set('Escolha uma nota de 1 a 5 estrelas antes de publicar.');
      return;
    }
    const jobId = this.jobId();
    const receiverId = this.receiverId();
    const comment = this.comment().trim();
    this.submitting.set(true);
    this.error.set(null);
    this.reviews
      .create({ jobId, receiverId, rating, ...(comment ? { comment } : {}) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.handleSuccess(REVIEW_SENT_TOAST),
        error: (error: unknown) => {
          // 409 = esta pessoa ja avaliou nesta vaga: para a tela e o mesmo que ter enviado.
          if (isApiError(error) && error.status === 409) {
            this.handleSuccess(ALREADY_REVIEWED_TOAST);
            return;
          }
          this.submitting.set(false);
          this.error.set(describeReviewError(error));
        },
      });
  }

  private handleSuccess(message: string): void {
    this.submitting.set(false);
    this.reviews.markReviewed(this.jobId(), this.receiverId());
    this.toast.show(message);
    this.success.set(true);
  }
}
