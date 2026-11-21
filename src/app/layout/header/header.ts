import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Notifications } from '../notifications/notifications';

@Component({
  selector: 'app-header',
  imports: [Notifications],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly notificationsOpen = signal(false);

  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}
