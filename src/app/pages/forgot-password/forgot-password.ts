import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { isApiError } from '../../core/models/api-error.model';
import { AuthService } from '../../core/services/auth.service';
import { Campo } from '../../shared/ui/campo';
import { Moldura } from '../../shared/ui/moldura';

// Nunca dizer "e-mail nao encontrado": a API responde 200 de proposito para nao revelar contas.
export function describeRecoverError(error: unknown): string {
  const status = isApiError(error) ? error.status : -1;

  switch (status) {
    case 0:
      return 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.';
    case 400:
      return 'Informe um e-mail válido.';
    case 429:
      return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
    default:
      return 'Não foi possível enviar o link agora. Tente de novo em instantes.';
  }
}

@Component({
  selector: 'app-forgot-password',
  imports: [Campo, Moldura, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected emailError(): string | null {
    const control = this.form.controls.email;
    if (!control.touched || control.valid) {
      return null;
    }
    return control.errors?.['required'] ? 'Informe seu e-mail.' : 'Informe um e-mail válido.';
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    this.authService
      .recoverPassword(this.form.controls.email.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.sent.set(true);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(describeRecoverError(error));
        },
      });
  }
}
