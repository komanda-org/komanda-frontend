import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { JobOverview } from '../../../core/models/restaurant-jobs.model';
import { RestaurantJobsService } from '../../../core/services/restaurant-jobs.service';
import { greetingFor } from '../../../core/utils/greeting';
import { jobMeta, jobStatusLabel } from '../../../core/utils/job-labels';
import { DeleteAccount } from '../../../shared/ui/delete-account/delete-account';
import { describeRestaurantError } from '../restaurant-errors';

const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

@Component({
  selector: 'app-restaurant-dashboard',
  imports: [RouterLink, DeleteAccount],
  templateUrl: './restaurant-dashboard.html',
  styleUrl: './restaurant-dashboard.scss',
})
export class RestaurantDashboard {
  private readonly jobsService = inject(RestaurantJobsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly overview = signal<JobOverview[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly greeting = signal('Olá');
  protected readonly today = signal('');
  protected readonly now = signal(0);
  protected readonly confirmingId = signal<string | null>(null);
  protected readonly closingId = signal<string | null>(null);
  protected readonly closeError = signal<{ jobId: string; message: string } | null>(null);

  protected readonly jobMeta = jobMeta;
  protected readonly jobStatusLabel = jobStatusLabel;

  protected readonly activeJobs = computed(() =>
    this.overview().filter(({ job }) => job.status !== 'ENCERRADA'),
  );

  protected readonly stats = computed(() => {
    const applicants = this.activeJobs().flatMap(({ applicants }) => applicants);
    return {
      pending: applicants.filter((a) => a.status === 'PENDENTE').length,
      matches: applicants.filter((a) => a.status === 'APROVADA').length,
      openJobs: this.activeJobs().filter(({ job }) => job.status === 'ABERTA').length,
    };
  });

  protected readonly stalePending = computed(() => {
    const limit = this.now() - STALE_AFTER_MS;
    return this.activeJobs().flatMap(({ job, applicants }) =>
      applicants
        .filter((a) => a.status === 'PENDENTE' && Date.parse(a.applicationDate) < limit)
        .map(() => job.id),
    );
  });

  protected readonly maxApplicants = computed(() =>
    Math.max(1, ...this.activeJobs().map(({ applicants }) => applicants.length)),
  );

  constructor() {
    // Hora local e sessao so existem no navegador.
    afterNextRender(() => {
      const now = new Date();
      this.now.set(now.getTime());
      this.greeting.set(greetingFor(now.getHours()));
      this.today.set(
        new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(now),
      );
      this.load();
    });
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

  protected pendingOf(item: JobOverview): number {
    return item.applicants.filter((a) => a.status === 'PENDENTE').length;
  }

  protected barWidth(item: JobOverview): number {
    return Math.round((item.applicants.length / this.maxApplicants()) * 100);
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
