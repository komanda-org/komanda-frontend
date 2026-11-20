import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isApiError } from '../../../core/models/api-error.model';
import { ApplicationStatus } from '../../../core/models/applications.model';
import { PublicProfessionalProfile, Review } from '../../../core/models/profile.model';
import { ApplicantProfessional } from '../../../core/models/restaurant-jobs.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProfessionalsService } from '../../../core/services/professionals.service';
import { RestaurantJobsService } from '../../../core/services/restaurant-jobs.service';
import { apiMessage } from '../../../core/utils/describe-error';
import { formatRating, starFills } from '../../../core/utils/rating';
import { relativeTime } from '../../../core/utils/relative-time';
import { initials } from '../../../core/utils/text';
import { mobilityLabel, workModelLabel } from '../../profile/profile-labels';
import { describeRestaurantError } from '../../restaurant/restaurant-errors';

/** O que o pipeline manda pelo state ao abrir o perfil de um candidato. */
export interface CandidateProfileState {
  professional: ApplicantProfessional;
  jobId: string;
  applicationId: string;
  status: ApplicationStatus;
}

type LoadState = 'loading' | 'error' | 'ready';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDENTE: 'Aguardando sua decisão',
  APROVADA: 'Aprovado',
  REJEITADA: 'Recusado',
};

// Datas sem hora chegam como meia-noite UTC; ler em UTC evita "mar" virar "fev" no Brasil.
export function monthYear(iso: string): string {
  const date = new Date(iso);
  return `${MONTHS[date.getUTCMonth()]}/${date.getUTCFullYear()}`;
}

export function experiencePeriod(start: string, end: string | null): string {
  return `${monthYear(start)} – ${end ? monthYear(end) : 'atual'}`;
}

export function ratingSummary(average: number, count: number): string {
  return `${formatRating(average)} · ${count} ${count === 1 ? 'avaliação' : 'avaliações'}`;
}

export function locationLabel(profile: PublicProfessionalProfile): string | null {
  return [profile.city, profile.state].filter(Boolean).join('/') || null;
}

/** Perfil montado so com o resumo da candidatura: usado enquanto carrega ou se GET /professionals/:id falhar. */
export function profileFromSummary(summary: ApplicantProfessional): PublicProfessionalProfile {
  return {
    id: summary.id,
    fullName: summary.fullName,
    profilePhoto: summary.profilePhoto,
    mainRole: summary.mainRole,
    interestedRoles: [],
    specialties: [],
    experienceSummary: summary.experienceSummary,
    city: null,
    state: null,
    neighborhood: null,
    workModels: [],
    mobility: null,
    averageRating: summary.averageRating,
    reviewsCount: 0,
    memberSince: null,
    experiences: [],
  };
}

export function describeProfileError(error: unknown): string {
  switch (isApiError(error) ? error.status : -1) {
    case 0:
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    case 400:
    case 404:
      return 'Não encontramos este profissional.';
    default:
      return 'Não foi possível carregar o perfil. Tente novamente.';
  }
}

@Component({
  selector: 'app-candidate-profile',
  imports: [RouterLink],
  templateUrl: './candidate-profile.html',
  styleUrl: './candidate-profile.scss',
})
export class CandidateProfile {
  private readonly professionals = inject(ProfessionalsService);
  private readonly jobsService = inject(RestaurantJobsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isRestaurant = inject(AuthService).getUser()?.role === 'RESTAURANTE';
  private readonly professionalId: string;

  protected readonly jobId: string | null;
  protected readonly initials = initials;
  protected readonly formatRating = formatRating;
  protected readonly starFills = starFills;
  protected readonly relativeTime = relativeTime;
  protected readonly experiencePeriod = experiencePeriod;
  protected readonly workModelLabel = workModelLabel;
  protected readonly mobilityLabel = mobilityLabel;
  protected readonly statusLabels = APPLICATION_STATUS_LABELS;

  protected readonly summary = signal<ApplicantProfessional | null>(null);
  protected readonly application = signal<{ id: string; status: ApplicationStatus } | null>(null);
  private readonly full = signal<PublicProfessionalProfile | null>(null);
  private readonly profileLoading = signal(true);
  private readonly applicantLoading = signal(false);
  protected readonly profileError = signal<string | null>(null);

  protected readonly reviews = signal<Review[]>([]);
  protected readonly reviewsTotal = signal(0);
  private readonly reviewsAverage = signal<number | null>(null);
  protected readonly reviewsState = signal<LoadState>('loading');
  protected readonly loadingMoreReviews = signal(false);
  protected readonly moreReviewsError = signal<string | null>(null);

  protected readonly deciding = signal(false);
  protected readonly decisionError = signal<string | null>(null);
  /** 422: a vaga foi encerrada; a decisao nao e mais possivel. */
  protected readonly decisionLocked = signal(false);

  protected readonly profile = computed(() => {
    const summary = this.summary();
    return this.full() ?? (summary ? profileFromSummary(summary) : null);
  });
  protected readonly view = computed<LoadState>(() => {
    if (this.profile()) {
      return 'ready';
    }
    return this.profileLoading() || this.applicantLoading() ? 'loading' : 'error';
  });
  protected readonly location = computed(() => {
    const profile = this.profile();
    return profile ? locationLabel(profile) : null;
  });
  // A pagina de avaliacoes e a fonte mais fresca; o perfil serve ate ela chegar.
  protected readonly rating = computed(() => {
    if (this.reviewsState() === 'ready') {
      return { average: this.reviewsAverage(), count: this.reviewsTotal() };
    }
    const profile = this.profile();
    return { average: profile?.averageRating ?? null, count: profile?.reviewsCount ?? 0 };
  });
  protected readonly ratingText = computed(() => {
    const { average, count } = this.rating();
    return average === null || count === 0 ? null : ratingSummary(average, count);
  });
  protected readonly hasMoreReviews = computed(() => this.reviews().length < this.reviewsTotal());
  protected readonly backQuery = computed(() => (this.jobId ? { job: this.jobId } : null));

  constructor() {
    const route = inject(ActivatedRoute).snapshot;
    this.professionalId = route.paramMap.get('id') ?? '';
    // O state so existe durante a navegacao; no F5 sobra o ?job= da URL.
    const state = inject(Router).getCurrentNavigation()?.extras.state as CandidateProfileState | undefined;
    const fromList = state?.professional?.id === this.professionalId ? state : undefined;
    this.jobId = route.queryParamMap.get('job') ?? fromList?.jobId ?? null;
    if (fromList) {
      this.summary.set(fromList.professional);
      this.application.set({ id: fromList.applicationId, status: fromList.status });
    }
    afterNextRender(() => this.load());
  }

  protected load(): void {
    this.loadProfile();
    this.loadReviews();
    if (!this.application() && this.jobId && this.isRestaurant) {
      this.loadApplication(this.jobId);
    }
  }

  protected loadReviews(): void {
    this.reviewsState.set('loading');
    this.moreReviewsError.set(null);
    this.professionals
      .listReviews(this.professionalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.reviews.set(page.data);
          this.reviewsTotal.set(page.total);
          this.reviewsAverage.set(page.averageRating);
          this.reviewsState.set('ready');
        },
        error: () => this.reviewsState.set('error'),
      });
  }

  protected loadMoreReviews(): void {
    if (this.loadingMoreReviews()) {
      return;
    }
    this.loadingMoreReviews.set(true);
    this.moreReviewsError.set(null);
    this.professionals
      .listReviews(this.professionalId, this.reviews().length)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const known = new Set(this.reviews().map((review) => review.id));
          this.reviews.update((list) => [...list, ...page.data.filter((review) => !known.has(review.id))]);
          this.reviewsTotal.set(page.total);
          this.reviewsAverage.set(page.averageRating);
          this.loadingMoreReviews.set(false);
        },
        error: () => {
          this.loadingMoreReviews.set(false);
          this.moreReviewsError.set('Não foi possível carregar mais avaliações. Tente novamente.');
        },
      });
  }

  protected decide(status: ApplicationStatus): void {
    const application = this.application();
    if (!application || !this.jobId || this.deciding()) {
      return;
    }
    this.deciding.set(true);
    this.decisionError.set(null);
    this.jobsService
      .updateApplicantStatus(this.jobId, application.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deciding.set(false);
          this.application.set({ ...application, status });
        },
        error: (error: unknown) => {
          this.deciding.set(false);
          if (isApiError(error) && error.status === 422) {
            this.decisionLocked.set(true);
            this.decisionError.set(apiMessage(error) ?? 'Esta vaga foi encerrada e não aceita mais decisões.');
            return;
          }
          this.decisionError.set(describeRestaurantError(error, 'decide'));
        },
      });
  }

  private loadProfile(): void {
    this.profileLoading.set(true);
    this.profileError.set(null);
    this.professionals
      .getById(this.professionalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.full.set(profile);
          this.profileLoading.set(false);
        },
        // Com o resumo da candidatura a tela segue de pe; sem ele, view() vira 'error'.
        error: (error: unknown) => {
          this.profileError.set(describeProfileError(error));
          this.profileLoading.set(false);
        },
      });
  }

  /** F5 apaga o state: busca a candidatura na lista da vaga para ter resumo e status de novo. */
  private loadApplication(jobId: string): void {
    this.applicantLoading.set(true);
    this.jobsService
      .listApplicants(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (applicants) => {
          const found = applicants.find((item) => item.professional.id === this.professionalId);
          if (found) {
            this.summary.set(found.professional);
            this.application.set({ id: found.applicationId, status: found.status });
          }
          this.applicantLoading.set(false);
        },
        error: () => this.applicantLoading.set(false),
      });
  }
}
