import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Placeholder: the login page links here, but "esqueci minha senha" is its
 * own feature and out of scope for this task.
 */
@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink],
  template: `
    <main class="forgot-password">
      <h1>Recuperação de senha</h1>
      <p>Essa etapa ainda não está disponível.</p>
      <a routerLink="/login">Voltar ao login</a>
    </main>
  `,
})
export class ForgotPassword {}
