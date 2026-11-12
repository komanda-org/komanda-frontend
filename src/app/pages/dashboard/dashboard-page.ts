import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Placeholder landing page after a successful login. The real dashboard is
 * out of scope for the login task — this only proves the redirect and the
 * stored session work end to end.
 */
@Component({
  selector: 'app-dashboard-page',
  template: `
    <main class="dashboard">
      <h1>Bem-vindo{{ user()?.role ? ', ' + roleLabel() : '' }}!</h1>
      <p>Você entrou no Komanda.</p>
      <button type="button" (click)="logout()">Sair</button>
    </main>
  `,
})
export class DashboardPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Sessao invalida ou ausente: nao mostra o dashboard como se estivesse conectado.
    if (!this.authService.isAuthenticated()) {
      void this.router.navigate(['/login']);
    }
  }

  protected user() {
    return this.authService.getUser();
  }

  protected roleLabel(): string {
    return this.user()?.role === 'RESTAURANTE' ? 'Restaurante' : 'Profissional';
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
