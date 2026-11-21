import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { JobOverview } from '../../../core/models/restaurant-jobs.model';
import { RestaurantJobsService } from '../../../core/services/restaurant-jobs.service';
import { formatSalary, jobMeta, jobStatusLabel } from '../../../core/utils/job-labels';
import { describeRestaurantError } from '../restaurant-errors';

type Tab = 'active' | 'closed';

@Component({
  selector: 'app-my-jobs',
  imports: [RouterLink],
  templateUrl: './my-jobs.html',
  styleUrl: './my-jobs.scss',
})
export class MyJobs {
  private readonly jobsService = inject(RestaurantJobsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly overview = signal<JobOverview[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly tab = signal<Tab>('active');
  protected readonly confirmingId = signal<string | null>(null);
  protected readonly closingId = signal<string | null>(null);
  protected readonly closeError = signal<{ jobId: string; message: string } | null>(null);

  protected readonly jobMeta = jobMeta;
  protected readonly jobStatusLabel = jobStatusLabel;
  protected readonly formatSalary = formatSalary;

  protected readonly active = computed(() =>
    this.overview().filter(({ job }) => job.status !== 'ENCERRADA'),
  );
  protected readonly closed = computed(() =>
    this.overview().filter(({ job }) => job.status === 'ENCERRADA'),
  );
  protected readonly visible = computed(() =>
    this.tab() === 'active' ? this.active() : this.closed(),
  );

  constructor() {
    afterNextRender(() => this.load());
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.jobsService
      .overview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.overview.set(overview);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(describeRestaurantError(error, 'load'));
        },
      });
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.confirmingId.set(null);
  }

  protected pendingOf(item: JobOverview): number {
    return item.applicants.filter((a) => a.status === 'PENDENTE').length;
  }

  protected askClose(jobId: string): void {
    this.closeError.set(null);
    this.confirmingId.set(jobId);
  }

  protected cancelClose(): void {
    this.confirmingId.set(null);
  }

  protected confirmClose(jobId: string): void {
    this.closingId.set(jobId);
    this.jobsService
      .updateStatus(jobId, 'ENCERRADA')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.closingId.set(null);
          this.confirmingId.set(null);
          this.overview.update((items) =>
            items.map((item) =>
              item.job.id === jobId ? { ...item, job: { ...item.job, status: 'ENCERRADA' } } : item,
            ),
          );
        },
        error: (error: unknown) => {
          this.closingId.set(null);
          this.closeError.set({ jobId, message: describeRestaurantError(error, 'close') });
        },
      });
  }
}
