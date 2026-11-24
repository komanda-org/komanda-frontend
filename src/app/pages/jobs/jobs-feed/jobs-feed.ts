import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, PLATFORM_ID, computed, inject, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiError, isApiError } from '../../../core/models/api-error.model';
import { Job } from '../../../core/models/jobs.model';
import { ProfessionalPreferences } from '../../../core/models/professional-preferences.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuthService } from '../../../core/services/auth.service';
import { FeedFilter, JobsFeedFiltersService } from '../../../core/services/jobs-feed-filters.service';
import { JobsService } from '../../../core/services/jobs.service';
import { LocationService, UserLocation } from '../../../core/services/location.service';
import { ProfessionalPreferencesService } from '../../../core/services/professional-preferences.service';
import { shiftsLabel } from '../../../core/utils/job-labels';

type LocationStatus = 'pending' | UserLocation['status'];

export const DISTANCE_MIN_KM = 5;
export const DISTANCE_MAX_KM = 100;
export const DISTANCE_STEP_KM = 5;
// Ultima posicao da barra, depois dos 100 km: sem filtro de distancia.
export const DISTANCE_NO_LIMIT = DISTANCE_MAX_KM + DISTANCE_STEP_KM;

export function toMaxDistance(value: number | string | null): number | null {
  const km = value === null || value === '' ? NaN : Number(value);
  if (!Number.isFinite(km) || km > DISTANCE_MAX_KM) {
    return null;
  }
  return Math.max(DISTANCE_MIN_KM, km);
}

// Quanto a primeira busca espera a posicao do navegador. Se o pedido de
// permissao ficar sem resposta, a lista carrega sem distancia e atualiza depois.
export const LOCATION_WAIT_MS = 1500;

@Component({
  selector: 'app-jobs-feed',
  imports: [FormsModule, RouterLink],
  templateUrl: './jobs-feed.html',
  styleUrl: './jobs-feed.scss',
})
export class JobsFeed {
  private readonly jobsService = inject(JobsService);
  private readonly applicationsService = inject(ApplicationsService);
  private readonly authService = inject(AuthService);
  private readonly locationService = inject(LocationService);
  private readonly professionalPreferencesService = inject(ProfessionalPreferencesService);
  private readonly filters = inject(JobsFeedFiltersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private userLocation: UserLocation | null = null;
  private locationWait: Promise<void> | null = null;
  private locationTimedOut = false;
  private destroyed = false;
  private requestVersion = 0;

  protected readonly jobs = signal<Job[]>([]);
  protected readonly totalJobs = signal(0);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly activeFilter = this.filters.activeFilter;
  protected readonly shiftsLabel = shiftsLabel;
  protected readonly selectedShift = this.filters.selectedShift;
  protected readonly minSalary = this.filters.minSalary;
  protected readonly maxDistanceKm = this.filters.maxDistanceKm;
  protected readonly skip = signal(0);
  protected readonly take = signal(20);
  protected readonly submittedQuery = this.filters.submittedQuery;
  protected readonly quickFiltersVisible = signal(true);
  protected readonly applyingIds = signal(new Set<string>());
  protected readonly appliedIds = signal(new Set<string>());
  protected readonly applicationErrors = signal(new Map<string, string>());
  protected readonly locationStatus = signal<LocationStatus>('pending');
  /** Busca nova com a lista atual ainda na tela (troca de raio). */
  protected readonly refreshing = signal(false);
  /** Posicao do slider enquanto a pessoa arrasta; vira filtro ao soltar. */
  protected readonly draftDistanceKm = linkedSignal(() => this.maxDistanceKm());

  protected get searchInput(): string {
    return this.filters.searchInput;
  }

  protected set searchInput(value: string) {
    this.filters.searchInput = value;
  }

  protected readonly locationBlocked = computed(
    () => this.locationStatus() === 'denied' || this.locationStatus() === 'unavailable',
  );
  protected readonly distanceMin = DISTANCE_MIN_KM;
  protected readonly distanceMax = DISTANCE_MAX_KM;
  protected readonly distanceStep = DISTANCE_STEP_KM;
  protected readonly noLimit = DISTANCE_NO_LIMIT;
  protected readonly distanceLabel = computed(() => {
    const km = this.draftDistanceKm();
    return km === null ? 'Sem limite' : `até ${km} km`;
  });
  protected readonly distanceActive = computed(
    () => this.maxDistanceKm() !== null && this.locationStatus() === 'granted',
  );

  private readonly filteredJobs = computed(() => {
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
        filter === 'CLT' ||
        filter === 'PJ' ||
        filter === 'FREELANCER' ||
        filter === 'ESTAGIO'
          ? job.contractType === filter
          : true;
      const matchesPreferences =
        filter !== 'para-voce' || this.matchesPreferences(job, preferences);

      return matchesQuery && matchesContract && matchesPreferences;
    });
  });

  protected readonly visibleJobs = this.filteredJobs;

  protected readonly totalLabel = computed(() => {
    const total = this.totalJobs();
    const where = this.distanceActive() ? `até ${this.maxDistanceKm()} km` : 'perto de você';
    return `${total} ${total === 1 ? 'vaga' : 'vagas'} ${where}`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
    if (isPlatformBrowser(this.platformId)) {
      this.load();
    }
  }

  /** `keepList`: busca de novo sem trocar a lista pelo "Carregando", para nao piscar. */
  protected load(keepList = false): void {
    this.skip.set(0);
    if (keepList && !this.loading() && !this.loadError()) {
      this.refreshing.set(true);
    } else {
      this.jobs.set([]);
      this.loading.set(true);
    }
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

  protected previewDistance(value: number | string | null): void {
    this.draftDistanceKm.set(toMaxDistance(value));
  }

  // So busca ao soltar o slider: arrastar de 5 a 100 km nao dispara 20 buscas.
  protected commitDistance(): void {
    const km = this.draftDistanceKm();
    if (km !== this.maxDistanceKm()) {
      this.maxDistanceKm.set(km);
      this.load(true);
    }
  }

  protected loadMore(): void {
    if (
      this.loading() ||
      this.loadingMore() ||
      this.refreshing() ||
      this.jobs().length >= this.totalJobs()
    ) {
      return;
    }

    this.loadingMore.set(true);
    const nextSkip = this.skip();
    this.skip.update((current) => current + this.take());
    this.requestPage(nextSkip, true);
  }

  protected clearFilters(): void {
    this.filters.reset();
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

  // Cor pelo id, nao pela posicao: assim nao troca quando o filtro esconde cards.
  protected avatarVariant(job: Job): number {
    let hash = 0;
    for (const char of job.id) {
      hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }
    return Math.abs(hash) % 4;
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
    if (this.userLocation || this.locationTimedOut) {
      this.fetchPage(requestVersion, pageSkip, append);
      return;
    }
    void this.waitForLocation().then(() => {
      if (requestVersion === this.requestVersion && !this.destroyed) {
        this.fetchPage(requestVersion, pageSkip, append);
      }
    });
  }

  private waitForLocation(): Promise<void> {
    this.locationWait ??= new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.locationTimedOut = true;
        resolve();
      }, LOCATION_WAIT_MS);

      this.locationService
        .getUserLocation()
        .catch((): UserLocation => ({ status: 'unavailable' }))
        .then((location) => {
          clearTimeout(timer);
          const arrivedLate = this.locationTimedOut;
          this.userLocation = location;
          this.locationStatus.set(location.status);
          if (location.status !== 'granted') {
            this.maxDistanceKm.set(null);
          }
          resolve();
          // A lista ja veio sem distancia: busca de novo com a posicao.
          if (arrivedLate && location.status === 'granted' && !this.destroyed) {
            this.load(true);
          }
        });
    });
    return this.locationWait;
  }

  private distanceParams(): { lat?: number; lng?: number; maxDistanceKm?: number } {
    const location = this.userLocation;
    if (location?.status !== 'granted') {
      return {};
    }
    const { lat, lng } = location.coordinates;
    return { lat, lng, maxDistanceKm: this.maxDistanceKm() ?? undefined };
  }

  private fetchPage(requestVersion: number, pageSkip: number, append: boolean): void {
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
        ...this.distanceParams(),
        skip: pageSkip,
        take: this.take(),
      }),
      applications: this.applicationsService.list(),
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
          this.refreshing.set(false);
          this.appliedIds.update(
            (current) =>
              new Set([
                ...current,
                ...applications.data.map((application) => application.job.id),
                ...jobs.data
                  .filter((job) => job.hasApplied || job.application)
                  .map((job) => job.id),
              ]),
          );
        },
        error: (error: unknown) => {
          if (requestVersion !== this.requestVersion) {
            return;
          }
          this.loading.set(false);
          this.loadingMore.set(false);
          this.refreshing.set(false);
          this.loadError.set(this.errorMessage(error, 'load'));
        },
      });
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
