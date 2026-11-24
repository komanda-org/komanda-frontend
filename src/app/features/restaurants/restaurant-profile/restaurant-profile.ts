import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { homeFor } from '../../../core/guards/role.guard';
import { isApiError } from '../../../core/models/api-error.model';
import { MyApplicationJob } from '../../../core/models/applications.model';
import { Review } from '../../../core/models/profile.model';
import { OpenJob, RestaurantPublicProfile } from '../../../core/models/restaurant.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { RestaurantsService } from '../../../core/services/restaurants.service';
import { describeError } from '../../../core/utils/http-error';
import { contractLabel, formatSalary, shiftsLabel } from '../../../core/utils/job-labels';
import { formatRating, starFills } from '../../../core/utils/rating';
import { initials } from '../../../core/utils/text';
import { ReviewButton } from '../../../shared/ui/review-dialog/review-button';

type PageState = 'loading' | 'error' | 'not-found' | 'ready';
type SectionState = 'loading' | 'error' | 'ready';

export interface JobLink {
  commands: string[];
  queryParams?: Record<string, string>;
  label: string;
}

export function reviewsCountLabel(count: number): string {
  return count === 1 ? '(1 avaliação)' : `(${count} avaliações)`;
}

export function jobMetaLine(job: OpenJob): string {
  return [contractLabel(job.contractType), shiftsLabel(job.shifts)].filter(Boolean).join(' • ');
}

@Component({
  selector: 'app-restaurant-profile',
  imports: [RouterLink, ReviewButton],
  templateUrl: './restaurant-profile.html',
  styleUrl: './restaurant-profile.scss',
})
export class RestaurantProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly restaurants = inject(RestaurantsService);
  private readonly profiles = inject(ProfileService);
  private readonly applications = inject(ApplicationsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly user = inject(AuthService).getUser();

  protected readonly formatRating = formatRating;
  protected readonly starFills = starFills;
  protected readonly initials = initials;
  protected readonly formatSalary = formatSalary;
  protected readonly jobMetaLine = jobMetaLine;
  protected readonly reviewsCountLabel = reviewsCountLabel;

  // TODO API: a lista de avaliacoes nao traz o autor; rotulo fixo ate o back-end enviar o nome.
  protected readonly reviewerLabel = 'Profissional';

  protected readonly backLink = homeFor(this.user?.role);

  protected readonly restaurantId = signal('');

  protected readonly state = signal<PageState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly restaurant = signal<RestaurantPublicProfile | null>(null);

  protected readonly reviewsState = signal<SectionState>('loading');
  protected readonly reviews = signal<Review[]>([]);
  /** Vagas deste restaurante em que o profissional logado foi aprovado; sem elas nao ha avaliacao. */
  protected readonly hiredJobs = signal<MyApplicationJob[]>([]);

  protected readonly isOwner = computed(
    () => !!this.user && this.user.role === 'RESTAURANTE' && this.user.id === this.restaurantId(),
  );

  constructor() {
    // A chamada so roda no browser; e o paramMap (e nao o snapshot) recarrega ao trocar de restaurante sem sair da rota.
    afterNextRender(() => {
      this.route.paramMap
        .pipe(
          map((params) => params.get('id') ?? ''),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((id) => {
          this.restaurantId.set(id);
          this.load();
        });
    });
  }

  // /vagas/:id e so do profissional; o dono ve a vaga na pre-visualizacao de Minhas vagas.
  protected jobLink(job: OpenJob): JobLink | null {
    if (this.isOwner()) {
      return { commands: ['/my-jobs', job.id, 'preview'], label: 'Ver vaga' };
    }
    if (this.user?.role === 'PROFISSIONAL') {
      return { commands: ['/vagas', job.id], label: 'Aplicar Agora' };
    }
    return null;
  }

  protected load(): void {
    this.state.set('loading');
    this.restaurant.set(null);

    this.restaurants
      .getById(this.restaurantId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (restaurant) => {
          this.restaurant.set(restaurant);
          this.state.set('ready');
          this.loadReviews();
          this.loadHiredJobs();
        },
        error: (error: unknown) => {
          // 400 = id que nao e UUID: para quem abriu o link, e o mesmo que nao existir.
          if (isApiError(error) && (error.status === 404 || error.status === 400)) {
            this.state.set('not-found');
            return;
          }
          this.errorMessage.set(describeError(error, 'o perfil do restaurante'));
          this.state.set('error');
        },
      });
  }

  protected loadReviews(): void {
    const restaurant = this.restaurant();
    if (!restaurant) {
      return;
    }

    this.reviewsState.set('loading');

    this.profiles
      .listReviews(restaurant.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviews) => {
          this.reviews.set(reviews.filter((review) => !!review.comment));
          this.reviewsState.set('ready');
        },
        error: () => this.reviewsState.set('error'),
      });
  }

  // Falha aqui so esconde o botao de avaliar; o resto do perfil segue normal.
  private loadHiredJobs(): void {
    this.hiredJobs.set([]);
    if (this.user?.role !== 'PROFISSIONAL') {
      return;
    }
    this.applications
      .approvedJobsWith(this.restaurantId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => this.hiredJobs.set(jobs),
        error: () => this.hiredJobs.set([]),
      });
  }
}
