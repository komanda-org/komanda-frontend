import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { isApiError } from '../../core/models/api-error.model';
import { translateLoginError } from '../../core/http/translate-login-error';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
  });

  protected emailError(): string | null {
    const control = this.form.controls.email;

    if (!control.touched || control.valid) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Email é obrigatório';
    }

    return 'Email deve ser válido';
  }

  protected passwordError(): string | null {
    const control = this.form.controls.password;

    if (!control.touched || control.valid) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Senha é obrigatória';
    }

    return 'Senha deve ter no mínimo 8 caracteres';
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    // Without this, a never-touched invalid field would just do nothing on
    // "Entrar" — no error visible, no request sent.
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.goToDashboard(),
        error: (error: unknown) => this.handleError(error),
      });
  }

  /**
   * `navigate()` resolves `false` when the navigation is cancelled (a guard
   * blocking it, for instance) and rejects when it fails outright — a lazy
   * chunk that won't load. Ignoring the promise leaves the button stuck on
   * "Entrando..." forever, so both cases hand control back to the user.
   */
  private async goToDashboard(): Promise<void> {
    try {
      if (await this.router.navigate(['/dashboard'])) {
        return;
      }
    } catch {
      // Same recovery as a cancelled navigation.
    }

    this.submitting.set(false);
    this.errorMessage.set('Não foi possível abrir o painel. Tente novamente.');
  }

  private handleError(error: unknown): void {
    this.submitting.set(false);

    // The interceptor normalizes everything that comes from the API. Landing
    // here with something else means it's a bug on our side, not the network.
    if (!isApiError(error)) {
      this.errorMessage.set('Algo deu errado ao entrar. Tente novamente.');
      return;
    }

    this.errorMessage.set(translateLoginError(error));
  }
}
