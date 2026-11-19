import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ProfessionalProfile } from '../../core/models/profile.model';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { initials } from '../../core/utils/text';

interface NavItem {
  path: string;
  label: string;
  testid: string;
  icon: string;
  exact: boolean;
}

const PROFESSIONAL_NAV: NavItem[] = [
  { path: '/home', label: 'Início', testid: 'nav-home', icon: '/icons/home.svg', exact: true },
  { path: '/vagas', label: 'Vagas', testid: 'nav-vagas', icon: '/icons/vagas.svg', exact: false },
  { path: '/matches', label: 'Matches', testid: 'nav-matches', icon: '/icons/matches.svg', exact: true },
  { path: '/mensagens', label: 'Mensagens', testid: 'nav-mensagens', icon: '/icons/mensagens.svg', exact: false },
  { path: '/perfil', label: 'Perfil', testid: 'nav-perfil', icon: '/icons/perfil.svg', exact: true },
];

const RESTAURANT_NAV: NavItem[] = [
  { path: '/dashboard', label: 'Início', testid: 'nav-dashboard', icon: '/icons/home.svg', exact: true },
  { path: '/my-jobs', label: 'Vagas', testid: 'nav-my-jobs', icon: '/icons/vagas.svg', exact: false },
  { path: '/mensagens', label: 'Mensagens', testid: 'nav-mensagens', icon: '/icons/mensagens.svg', exact: false },
  { path: '/pipeline', label: 'Pipeline', testid: 'nav-pipeline', icon: '/icons/pipeline.svg', exact: true },
  { path: '/plans', label: 'Planos', testid: 'nav-plans', icon: '/icons/planos.svg', exact: true },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly profileService = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly role = signal(inject(AuthService).getUser()?.role ?? null);
  protected readonly profile = signal<ProfessionalProfile | null>(null);
  protected readonly initials = computed(() => initials(this.profile()?.fullName ?? ''));
  protected readonly nav = computed(() =>
    this.role() === 'RESTAURANTE' ? RESTAURANT_NAV : PROFESSIONAL_NAV,
  );

  constructor() {
    // Token so existe no navegador; no servidor a chamada sairia sem Authorization.
    afterNextRender(() => {
      // TODO API: restaurante nao tem GET do proprio cadastro; /users/me so atende profissional.
      if (this.role() !== 'PROFISSIONAL') {
        return;
      }
      this.profileService
        .getMe()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (profile) => this.profile.set(profile),
          // Sem perfil (rede fora, cadastro incompleto) o painel so fica sem nome.
          error: () => this.profile.set(null),
        });
    });
  }
}
