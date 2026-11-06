import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { isApiError } from '../../../core/models/api-error.model';
import { Job } from '../../../core/models/jobs.model';
import { ProfessionalPreferences } from '../../../core/models/professional-preferences.model';
import { ehErroApi } from '../../../core/models/erro-api.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService } from '../../../core/services/auth.service';
import { JobsService } from '../../../core/services/jobs.service';
import { ProfessionalPreferencesService } from '../../../core/services/professional-preferences.service';

type FeedFilter = 'para-voce' | 'CLT' | 'PJ' | null;

@Component({
  selector: 'app-jobs-feed',
  imports: [FormsModule],
  templateUrl: './jobs-feed.html',
  styleUrl: './jobs-feed.scss',
})
export class JobsFeed {
  private readonly jobsService = inject(JobsService);
  private readonly applicationsService = inject(ApplicationsService);
  private readonly authService = inject(AuthService);
  private readonly professionalPreferencesService = inject(ProfessionalPreferencesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly jobs = signal<Job[]>([]);
  protected readonly totalJobs = signal(0);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly activeFilter = signal<FeedFilter>('para-voce');
  protected readonly submittedQuery = signal('');
  protected readonly quickFiltersVisible = signal(true);
  protected readonly applyingIds = signal(new Set<string>());
  protected readonly appliedIds = signal(new Set<string>());
  protected readonly applicationErrors = signal(new Map<string, string>());
  protected searchInput = '';

  protected readonly visibleJobs = computed(() => {
    const query = this.submittedQuery().toLocaleLowerCase('pt-BR');
    const filter = this.activeFilter();
    const preferences =
      filter === 'para-voce'
        ? this.professionalPreferencesService.getForEmail(this.authService.getUser()?.email)
        : null;

    return this.jobs().filter((job) => {
      const matchesQuery =
        !query ||
        job.title.toLocaleLowerCase('pt-BR').includes(query) ||
        job.restaurant.restaurantName.toLocaleLowerCase('pt-BR').includes(query);
      const matchesContract =
        filter === 'CLT' || filter === 'PJ' ? job.contractType === filter : true;
      const matchesPreferences =
        filter !== 'para-voce' || this.matchesPreferences(job, preferences);

      return matchesQuery && matchesContract && matchesPreferences;
    });
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.load();
    }
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      jobs: this.jobsService.list(),
      applications: this.applicationsService.listMine(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobs, applications }) => {
          this.jobs.set(jobs.data);
          this.totalJobs.set(jobs.total);
          this.loading.set(false);
          this.appliedIds.set(
            new Set([
              ...applications.map((application) => application.jobId),
              ...jobs.data
                .filter((job) => job.hasApplied || job.application)
                .map((job) => job.id),
            ]),
          );
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(this.errorMessage(error, 'load'));
        },
      });
  }

  protected search(): void {
    this.submittedQuery.set(this.searchInput.trim());
  }

  protected selectFilter(filter: Exclude<FeedFilter, null>): void {
    this.activeFilter.update((current) => (current === filter ? null : filter));
  }

  protected toggleQuickFilters(): void {
    this.quickFiltersVisible.update((visible) => !visible);
  }

  protected apply(job: Job): void {
    if (this.hasApplied(job) || this.applyingIds().has(job.id)) {
      return;
    }

    this.applyingIds.update((ids) => new Set(ids).add(job.id));
    this.applicationErrors.update((errors) => {
      const updated = new Map(errors);
      updated.delete(job.id);
      return updated;
    });

    this.applicationsService
      .apply(job.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.appliedIds.update((ids) => new Set(ids).add(job.id));
          this.applyingIds.update((ids) => {
            const updated = new Set(ids);
            updated.delete(job.id);
            return updated;
          });
        },
        error: (error: unknown) => {
          this.applyingIds.update((ids) => {
            const updated = new Set(ids);
            updated.delete(job.id);
            return updated;
          });
          this.applicationErrors.update((errors) =>
            new Map(errors).set(job.id, this.errorMessage(error, 'apply')),
          );
        },
      });
  }

  protected hasApplied(job: Job): boolean {
    return Boolean(job.hasApplied || job.application || this.appliedIds().has(job.id));
  }

  protected isApplying(jobId: string): boolean {
    return this.applyingIds().has(jobId);
  }

  protected applicationError(jobId: string): string | undefined {
    return this.applicationErrors().get(jobId);
  }

  protected restaurantInitial(job: Job): string {
    return job.restaurant.restaurantName.trim().charAt(0).toLocaleUpperCase('pt-BR');
  }

  protected formatSalary(salary: string | null): string {
    if (!salary) {
      return 'A combinar';
    }

    const amount = Number(salary);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
      : salary;
  }

  protected formatDistance(distanceKm: number): string {
    return `${distanceKm.toFixed(1)} KM`;
  }

  private matchesPreferences(job: Job, preferences: ProfessionalPreferences | null): boolean {
    if (!preferences) {
      return true;
    }

    const searchableJob = this.normalizeText(
      [job.title, job.description, job.requirements ?? ''].join(' '),
    );
    const preferredRoles = [preferences.mainRole, ...preferences.interestedRoles]
      .map((role) => this.normalizeText(role))
      .filter(Boolean);
    const matchesRole =
      preferredRoles.length === 0 || preferredRoles.some((role) => searchableJob.includes(role));
    const expectedContract =
      preferences.contractType === 'Freelancer' ? 'FREELANCER' : preferences.contractType;

    return matchesRole && job.contractType === expectedContract;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  private errorMessage(error: unknown, action: 'load' | 'apply'): string {
    const apiError = isApiError(error) ? error : ehErroApi(error) ? error : null;
    if (!apiError) {
      return action === 'load'
        ? 'Não foi possível carregar as vagas. Tente novamente.'
        : 'Não foi possível enviar sua candidatura. Tente novamente.';
    }

    switch (apiError.status) {
      case 0:
        return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
      case 400:
        return action === 'load'
          ? 'Não foi possível buscar as vagas. Tente novamente.'
          : 'Confira seus dados e tente enviar a candidatura novamente.';
      case 401:
        return 'Sua sessão expirou. Entre novamente para continuar.';
      case 403:
        return 'Você não tem permissão para realizar esta ação.';
      case 404:
        return action === 'load'
          ? 'Não foi possível encontrar as vagas. Tente novamente.'
          : 'Esta vaga não está mais disponível.';
      case 409:
        return 'Esta vaga não está mais disponível para candidatura.';
      case 429:
        return 'Muitas tentativas. Aguarde um instante e tente novamente.';
      default:
        return action === 'load'
          ? 'Não foi possível carregar as vagas. Tente novamente.'
          : 'Não foi possível enviar sua candidatura. Tente novamente.';
    }
  }
}
