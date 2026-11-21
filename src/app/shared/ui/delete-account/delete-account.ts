import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { isApiError } from '../../../core/models/api-error.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ErrorCopy, describeError } from '../../../core/utils/describe-error';

export const ACCOUNT_DELETED_NOTICE = 'Sua conta foi excluída.';
export const ACCOUNT_ALREADY_DELETED_NOTICE = 'Esta conta já foi excluída.';

const ERROR_COPY: ErrorCopy = {
  fallback: 'Não foi possível excluir sua conta. Tente de novo.',
  byStatus: {
    404: 'Esta conta já foi excluída.',
  },
};

export function describeDeleteError(error: unknown): string {
  return describeError(error, ERROR_COPY);
}

@Component({
  selector: 'app-delete-account',
  templateUrl: './delete-account.html',
  styleUrl: './delete-account.scss',
})
export class DeleteAccount {
  /** O que sai do ar junto com a conta (perfil, vagas...). */
  readonly consequence = input('Sua conta perde o acesso imediatamente.');

  private readonly service = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly confirming = signal(false);
  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected askDelete(): void {
    this.errorMessage.set(null);
    this.confirming.set(true);
  }

  protected cancelDelete(): void {
    if (this.deleting()) {
      return;
    }
    this.errorMessage.set(null);
    this.confirming.set(false);
  }

  protected confirmDelete(): void {
    if (this.deleting()) {
      return;
    }

    this.errorMessage.set(null);
    this.deleting.set(true);

    this.service
      .deleteAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finishDeletion(ACCOUNT_DELETED_NOTICE),
        error: (error: unknown) => {
          this.deleting.set(false);
          // 404: a conta ja estava excluida, entao o objetivo do usuario foi cumprido.
          if (isApiError(error) && error.status === 404) {
            this.finishDeletion(ACCOUNT_ALREADY_DELETED_NOTICE);
            return;
          }
          this.errorMessage.set(describeDeleteError(error));
        },
      });
  }

  private finishDeletion(message: string): void {
    this.deleting.set(false);
    this.confirming.set(false);
    this.auth.logout();
    void this.router.navigateByUrl('/login', { state: { mensagem: message } });
  }
}
