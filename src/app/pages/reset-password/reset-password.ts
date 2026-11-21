import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isApiError } from '../../core/models/api-error.model';
import { AuthService } from '../../core/services/auth.service';
import { Campo } from '../../shared/ui/campo';
import { Moldura } from '../../shared/ui/moldura';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const PASSWORD_CHANGED_NOTICE = 'Senha alterada. Entre com a nova senha.';

// No proprio campo de confirmacao: o <app-campo> so exibe erro de controle invalido.
export function matchesPassword(confirmation: AbstractControl): ValidationErrors | null {
  const password = confirmation.parent?.get('password')?.value as string | undefined;
  return confirmation.value && confirmation.value !== password ? { mismatch: true } : null;
}

export type ResetFailure = { message: string; linkInvalid: boolean };

export function describeResetError(error: unknown): ResetFailure {
  const status = isApiError(error) ? error.status : -1;

  switch (status) {
    case 0:
      return {
        message: 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.',
        linkInvalid: false,
      };
    case 400:
      return {
        message: `A senha deve ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`,
        linkInvalid: false,
      };
    case 401:
      // A API ja manda o motivo pronto em portugues ("Este link expirou. Peca um novo.").
      return {
        message: (isApiError(error) && error.messages[0]) || 'Este link não é mais válido. Peça um novo.',
        linkInvalid: true,
      };
    case 429:
      return { message: 'Muitas tentativas. Aguarde um minuto e tente de novo.', linkInvalid: false };
    default:
      return {
        message: 'Não foi possível alterar a senha agora. Tente de novo em instantes.',
        linkInvalid: false,
      };
  }
}

@Component({
  selector: 'app-reset-password',
  imports: [Campo, Moldura, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  // Fica so em memoria: nada de localStorage nem console.
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token')?.trim() ?? '';

  protected readonly passwordMin = PASSWORD_MIN;
  protected readonly passwordMax = PASSWORD_MAX;
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly invalidLink = signal<string | null>(
    this.token ? null : 'Link inválido. Peça um novo link para redefinir sua senha.',
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    password: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN), Validators.maxLength(PASSWORD_MAX)],
    ],
    confirmation: ['', [Validators.required, matchesPassword]],
  });

  constructor() {
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.confirmation.updateValueAndValidity({ emitEvent: false }));
  }

  protected passwordError(): string | null {
    const control = this.form.controls.password;
    if (!control.touched || control.valid) {
      return null;
    }
    return control.errors?.['required']
      ? 'Informe a nova senha.'
      : `A senha deve ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`;
  }

  protected confirmationError(): string | null {
    const control = this.form.controls.confirmation;
    if (!control.touched || control.valid) {
      return null;
    }
    return control.errors?.['required'] ? 'Confirme a nova senha.' : 'As senhas não são iguais.';
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting() || !this.token) {
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    this.authService
      .resetPassword(this.token, this.form.controls.password.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/login', { state: { mensagem: PASSWORD_CHANGED_NOTICE } });
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          const failure = describeResetError(error);
          if (failure.linkInvalid) {
            this.invalidLink.set(failure.message);
          } else {
            this.errorMessage.set(failure.message);
          }
        },
      });
  }
}
