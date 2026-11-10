import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiError, isApiError } from '../../../core/models/api-error.model';
import { Job } from '../../../core/models/jobs.model';
import { ProfessionalPreferences } from '../../../core/models/professional-preferences.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService } from '../../../core/services/auth.service';
import { JobsService } from '../../../core/services/jobs.service';
import { Coordinates, LocationService } from '../../../core/services/location.service';
import { ProfessionalPreferencesService } from '../../../core/services/professional-preferences.service';

type FeedFilter = 'para-voce' | 'CLT' | 'PJ' | 'FREELANCER' | 'ESTAGIO' | null;

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
  private readonly locationService = inject(LocationService);
  private readonly professionalPreferencesService = inject(ProfessionalPreferencesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private userCoordinatesPromise: Promise<Coordinates | null> | null = null;
  private requestVersion = 0;

  protected readonly jobs = signal<Job[]>([]);
  protected readonly totalJobs = signal(0);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly activeFilter = signal<FeedFilter>('para-voce');
  protected readonly selectedShift = signal<string | null>(null);
  protected readonly minSalary = signal<number | null>(null);
  protected readonly maxDistanceKm = signal<number | null>(null);
  protected readonly skip = signal(0);
  protected readonly take = signal(20);
  protected readonly submittedQuery = signal('');
  protected readonly quickFiltersVisible = signal(true);
  protected readonly applyingIds = signal(new Set<string>());
  protected readonly appliedIds = signal(new Set<string>());
  protected readonly applicationErrors = signal(new Map<string, string>());
  protected searchInput = '';

  protected readonly visibleJobs = computed(() => {
    const query = this.submittedQuery().toLocaleLowerCase('pt-BR');
    const filter = this.activeFilter();
    const maxDistance = this.maxDistanceKm();
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
        filter === 'CLT' ||
        filter === 'PJ' ||
        filter === 'FREELANCER' ||
        filter === 'ESTAGIO'
          ? job.contractType === filter
          : true;
      const matchesPreferences =
        filter !== 'para-voce' || this.matchesPreferences(job, preferences);
      const matchesDistance =
        maxDistance === null || (job.distanceKm !== null &&
          job.distanceKm !== undefined &&
          job.distanceKm <= maxDistance);

      return matchesQuery && matchesContract && matchesPreferences && matchesDistance;
    });
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.load();
    }
  }

  protected load(): void {
    this.skip.set(0);
    this.jobs.set([]);
    this.loading.set(true);
    this.loadingMore.set(false);
    this.loadError.set(null);
    this.requestPage(0, false);
  }

  protected search(): void {
    this.submittedQuery.set(this.searchInput.trim());
    this.load();
  }

  protected selectFilter(filter: Exclude<FeedFilter, null>): void {
    this.activeFilter.update((current) => (current === filter ? null : filter));
    this.load();
  }

  protected setShift(value: string): void {
    const shift = value || null;
    if (shift !== this.selectedShift()) {
      this.selectedShift.set(shift);
      this.load();
    }
  }

  protected setMinSalary(value: number | string | null): void {
    const parsedValue = value === null || value === '' ? null : Number(value);
    const salary = parsedValue !== null && Number.isFinite(parsedValue) ? parsedValue : null;
    if (salary !== this.minSalary()) {
      this.minSalary.set(salary);
      this.load();
    }
  }

  protected setMaxDistance(value: number | string | null): void {
    const parsedValue = value === null || value === '' ? null : Number(value);
    const distance = parsedValue !== null && Number.isFinite(parsedValue) ? parsedValue : null;
    this.maxDistanceKm.set(distance);
  }

  protected loadMore(): void {
    if (this.loading() || this.loadingMore() || this.jobs().length >= this.totalJobs()) {
      return;
    }

    this.loadingMore.set(true);
    const nextSkip = this.skip();
    this.skip.update((current) => current + this.take());
    this.requestPage(nextSkip, true);
  }

  protected clearFilters(): void {
    this.searchInput = '';
    this.submittedQuery.set('');
    this.activeFilter.set('para-voce');
    this.selectedShift.set(null);
    this.minSalary.set(null);
    this.maxDistanceKm.set(null);
    this.load();
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

  private requestPage(pageSkip: number, append: boolean): void {
    const requestVersion = ++this.requestVersion;
    const selectedFilter = this.activeFilter();
    const contractType =
      selectedFilter === 'CLT' ||
      selectedFilter === 'PJ' ||
      selectedFilter === 'FREELANCER' ||
      selectedFilter === 'ESTAGIO'
        ? selectedFilter
        : undefined;

    forkJoin({
      jobs: this.jobsService.search({
        query: this.submittedQuery(),
        contractType,
        shift: this.selectedShift() ?? undefined,
        minSalary: this.minSalary() ?? undefined,
        skip: pageSkip,
        take: this.take(),
      }),
      applications: this.applicationsService.listMine(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobs, applications }) => {
          if (requestVersion !== this.requestVersion) {
            return;
          }

          this.jobs.update((current) =>
            append ? [...current, ...jobs.data] : jobs.data,
          );
          this.totalJobs.set(jobs.total);
          this.skip.set(jobs.skip + jobs.data.length);
          this.loading.set(false);
          this.loadingMore.set(false);
          this.appliedIds.update(
            (current) =>
              new Set([
                ...current,
                ...applications.map((application) => application.jobId),
                ...jobs.data
                  .filter((job) => job.hasApplied || job.application)
                  .map((job) => job.id),
              ]),
          );
          void this.enrichDistances(jobs.data);
        },
        error: (error: unknown) => {
          if (requestVersion !== this.requestVersion) {
            return;
          }
          this.loading.set(false);
          this.loadingMore.set(false);
          this.loadError.set(this.errorMessage(error, 'load'));
        },
      });
  }

  private async enrichDistances(jobs: Job[]): Promise<void> {
    try {
      this.userCoordinatesPromise ??= this.locationService.getUserCoordinates();
      const userCoordinates = await this.userCoordinatesPromise;
      const distances = new Map<string, number | null>();

      await Promise.all(
        jobs.map(async (job) => {
          const restaurantCoordinates = userCoordinates
            ? await this.locationService.getRestaurantCoordinates(
                job.restaurant.zipCode,
                job.restaurant.address,
              )
            : null;
          distances.set(
            job.id,
            userCoordinates && restaurantCoordinates
              ? this.locationService.calculateDistanceKm(userCoordinates, restaurantCoordinates)
              : job.distanceKm ?? null,
          );
        }),
      );

      this.jobs.update((current) =>
        current.map((job) =>
          distances.has(job.id) ? { ...job, distanceKm: distances.get(job.id) ?? null } : job,
        ),
      );
    } catch (error: unknown) {
      console.warn('Não foi possível calcular a distância das vagas.', error);
    }
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
    const matchesContract =
      !preferences.contractType || job.contractType === expectedContract;

    return matchesRole && matchesContract;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  private errorMessage(error: unknown, action: 'load' | 'apply'): string {
    const apiError: ApiError | null = isApiError(error) ? error : null;
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
