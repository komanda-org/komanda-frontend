import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { isApiError } from '../../core/models/api-error.model';
import { translateLoginError } from '../../core/http/translate-login-error';
import { AuthService } from '../../core/services/auth.service';
import { Campo } from '../../shared/ui/campo';
import { Moldura } from '../../shared/ui/moldura';

@Component({
  selector: 'app-login',
  imports: [Campo, Moldura, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** Mensagem de sucesso que chega do cadastro. */
  protected readonly mensagem = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
  });

  constructor() {
    // `getCurrentNavigation()` so responde DURANTE a navegacao — por isso a
    // leitura acontece no construtor. `state` some no F5 e nao existe no SSR.
    const navegacao = this.router.getCurrentNavigation();
    const estado = navegacao?.extras.state as { mensagem?: string } | undefined;
    this.mensagem.set(estado?.mensagem ?? null);
  }

  protected emailError(): string | null {
    const control = this.form.controls.email;
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.errors?.['required']) {
      return 'Informe seu e-mail.';
    }
    return 'Informe um e-mail válido.';
  }

  protected passwordError(): string | null {
    const control = this.form.controls.password;
    if (!control.touched || control.valid) {
      return null;
    }
    if (control.errors?.['required']) {
      return 'Informe sua senha.';
    }
    return 'A senha deve ter pelo menos 8 caracteres.';
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    this.authService
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/dashboard');
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(
            isApiError(error)
              ? translateLoginError(error)
              : 'Não foi possível entrar. Tente novamente.',
          );
        },
      });
  }
}
