import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, map, of } from 'rxjs';
import { Job } from '../../../core/models/jobs.model';
import { RestaurantMe } from '../../../core/models/profile.model';
import { RestaurantJob } from '../../../core/models/restaurant-jobs.model';
import { ProfileService } from '../../../core/services/profile.service';
import { RestaurantJobsService } from '../../../core/services/restaurant-jobs.service';
import { jobStatusLabel } from '../../../core/utils/job-labels';
import { JobView } from '../../../shared/jobs/job-view/job-view';
import { describeRestaurantError } from '../restaurant-errors';
import { FROM_PREVIEW } from './preview-origin';

type PageState = 'loading' | 'ready' | 'not-found' | 'error';

/** Monta a vaga no formato que o profissional recebe de GET /jobs. */
export function toJobPreview(job: RestaurantJob, me: RestaurantMe): Job {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    // GET /jobs serializa o Decimal como texto; /users/me/jobs manda numero.
    salary: job.salary === null || job.salary === '' ? null : String(job.salary),
    contractType: job.contractType,
    status: job.status,
    shifts: job.shifts ?? [],
    urgent: job.urgent,
    createdAt: job.createdAt,
    restaurantId: me.id,
    restaurant: {
      restaurantName: me.restaurantName,
      logoUrl: me.logoUrl,
      address: me.address,
      zipCode: me.zipCode,
      cuisineType: me.cuisineType,
      averageRating: me.averageRating,
    },
    hasApplied: false,
    application: null,
  };
}

export function previewNotice(status: RestaurantJob['status']): string | null {
  return status === 'ABERTA'
    ? null
    : `Esta vaga está ${jobStatusLabel(status).toLocaleLowerCase('pt-BR')} e não aparece para profissionais.`;
}

@Component({
  selector: 'app-job-preview',
  imports: [JobView, RouterLink],
  templateUrl: './job-preview.html',
  styleUrl: './job-preview.scss',
})
export class JobPreview {
  private readonly jobsService = inject(RestaurantJobsService);
  private readonly profileService = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly jobId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  // O state so existe durante a navegacao; no F5 a vaga vem de /users/me/jobs.
  private readonly fromList = inject(Router).getCurrentNavigation()?.extras.state?.['job'] as
    | RestaurantJob
    | undefined;

  protected readonly state = signal<PageState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly job = signal<RestaurantJob | null>(null);
  protected readonly preview = signal<Job | null>(null);

  protected readonly notice = computed(() => {
    const job = this.job();
    return job ? previewNotice(job.status) : null;
  });
  protected readonly editable = computed(() => {
    const status = this.job()?.status;
    return status === 'ABERTA' || status === 'PAUSADA';
  });
  protected readonly fromPreview = FROM_PREVIEW;

  constructor() {
    afterNextRender(() => this.load());
  }

  protected load(): void {
    this.state.set('loading');
    const job$: Observable<RestaurantJob | null> =
      this.fromList?.id === this.jobId
        ? of(this.fromList)
        : this.jobsService.listMine().pipe(map((jobs) => jobs.find((job) => job.id === this.jobId) ?? null));

    forkJoin({ job: job$, me: this.profileService.getMe() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ job, me }) => {
          if (me.role !== 'RESTAURANTE') {
            this.fail({ status: 403, messages: [] });
            return;
          }
          if (!job) {
            this.state.set('not-found');
            return;
          }
          this.job.set(job);
          this.preview.set(toJobPreview(job, me));
          this.state.set('ready');
        },
        error: (error: unknown) => this.fail(error),
      });
  }

  private fail(error: unknown): void {
    this.errorMessage.set(describeRestaurantError(error, 'load'));
    this.state.set('error');
  }
}
