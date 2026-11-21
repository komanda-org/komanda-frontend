import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { isApiError } from '../../../core/models/api-error.model';
import { map } from 'rxjs';
import {
  Experience,
  ProfessionalProfile,
  Review,
  requireProfessional,
} from '../../../core/models/profile.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { mobilityLabel, workModelLabel } from '../profile-labels';

type LoadState = 'loading' | 'error' | 'ready';
export type StarFill = 'full' | 'half' | 'empty';

export function sortExperiences(list: readonly Experience[]): Experience[] {
  return [...list].sort((a, b) => {
    if ((a.endDate === null) !== (b.endDate === null)) {
      return a.endDate === null ? -1 : 1;
    }
    return b.startDate.localeCompare(a.startDate) || (b.endDate ?? '').localeCompare(a.endDate ?? '');
  });
}

// Datas sem hora viram meia-noite UTC; ler em UTC evita "2019" virar "2018" no Brasil em 1/jan.
function year(isoDate: string): number {
  return new Date(isoDate).getUTCFullYear();
}

export function formatPeriod(start: string, end: string | null): string {
  return `${year(start)} - ${end === null ? 'Presente' : year(end)}`;
}

export function formatRating(rating: number): string {
  return rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatLocation(profile: ProfessionalProfile): string | null {
  const cityState = [profile.city, profile.state].filter(Boolean).join(', ');
  return cityState || profile.neighborhood || null;
}

export function averageRating(reviews: readonly Review[]): number | null {
  if (reviews.length === 0) {
    return null;
  }
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export function starFills(rating: number): StarFill[] {
  return [1, 2, 3, 4, 5].map((position) => {
    if (rating >= position) return 'full';
    if (rating >= position - 0.5) return 'half';
    return 'empty';
  });
}

export function describeDeleteError(error: unknown): string {
  const status = isApiError(error) ? error.status : -1;

  switch (status) {
    case 0:
      return 'Não conseguimos conectar. Verifique sua internet e tente de novo.';
    case 401:
      return 'Sua sessão expirou. Entre novamente para excluir sua conta.';
    case 404:
      return 'Esta conta já foi excluída.';
    case 500:
    case 502:
    case 503:
      return 'Nosso serviço está instável agora. Tente de novo em instantes.';
    default:
      return 'Não foi possível excluir sua conta. Tente de novo.';
  }
}

export function describeError(error: unknown): string {
  const status = isApiError(error) ? error.status : -1;

  switch (status) {
    case 0:
      return 'Não conseguimos conectar. Verifique sua internet e tente de novo.';
    case 401:
      return 'Sua sessão expirou. Entre novamente para ver seu perfil.';
    case 403:
      return 'Esta conta não tem acesso ao perfil profissional. Entre com sua conta de profissional.';
    case 404:
      return 'Não encontramos seu perfil. Entre novamente ou fale com o suporte.';
    case 500:
    case 502:
    case 503:
      return 'Nosso serviço está instável agora. Tente de novo em instantes.';
    default:
      return 'Não foi possível carregar seu perfil. Tente de novo.';
  }
}

@Component({
  selector: 'app-professional-profile',
  imports: [RouterLink],
  templateUrl: './professional-profile.html',
  styleUrl: './professional-profile.scss',
})
export class ProfessionalProfilePage {
  private readonly service = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatPeriod = formatPeriod;
  protected readonly formatRating = formatRating;
  protected readonly starFills = starFills;
  protected readonly workModelLabel = workModelLabel;
  protected readonly mobilityLabel = mobilityLabel;

  protected readonly state = signal<LoadState>('loading');
  protected readonly errorMessage = signal('');
  /** 401: tentar de novo falharia para sempre; o caminho e entrar de novo. */
  protected readonly sessionExpired = signal(false);
  protected readonly profile = signal<ProfessionalProfile | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly reviewsState = signal<LoadState>('loading');
  protected readonly reviews = signal<Review[]>([]);

  protected readonly experiences = computed(() => sortExperiences(this.profile()?.experiences ?? []));
  protected readonly location = computed(() => {
    const profile = this.profile();
    return profile ? formatLocation(profile) : null;
  });
  protected readonly rating = computed(() => averageRating(this.reviews()));

  constructor() {
    // `state` da navegacao so existe durante ela; some no F5.
    const state = this.router.getCurrentNavigation()?.extras.state as { notice?: string } | undefined;
    this.notice.set(state?.notice ?? null);
    // A rota e pre-renderizada no build (Node, sem API): a chamada so roda no browser.
    afterNextRender(() => this.load());
  }

  protected load(): void {
    this.state.set('loading');

    this.service
      .getMe()
      .pipe(map(requireProfessional), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.state.set('ready');
          this.loadReviews();
        },
        error: (error: unknown) => {
          this.errorMessage.set(describeError(error));
          this.sessionExpired.set(isApiError(error) && error.status === 401);
          this.state.set('error');
        },
      });
  }

  protected loadReviews(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }

    this.reviewsState.set('loading');

    this.service
      .listReviews(profile.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviews) => {
          this.reviews.set([...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
          this.reviewsState.set('ready');
        },
        error: () => this.reviewsState.set('error'),
      });
  }

  protected askDelete(): void {
    this.deleteError.set(null);
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(): void {
    if (this.deleting()) {
      return;
    }
    this.deleteError.set(null);
    this.confirmingDelete.set(false);
  }

  protected confirmDelete(): void {
    if (this.deleting()) {
      return;
    }

    this.deleteError.set(null);
    this.deleting.set(true);

    this.service
      .deleteAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finishDeletion('Sua conta foi excluída.'),
        error: (error: unknown) => {
          this.deleting.set(false);
          // 404: a conta ja estava excluida, entao o objetivo do usuario foi cumprido.
          if (isApiError(error) && error.status === 404) {
            this.finishDeletion('Esta conta já foi excluída.');
            return;
          }
          this.deleteError.set(describeDeleteError(error));
        },
      });
  }

  private finishDeletion(message: string): void {
    this.deleting.set(false);
    this.confirmingDelete.set(false);
    this.auth.logout();
    void this.router.navigateByUrl('/login', { state: { mensagem: message } });
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }
}
