import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApplicationStatus } from '../../../core/models/applications.model';
import { Applicant, RestaurantJob } from '../../../core/models/restaurant-jobs.model';
import { RestaurantJobsService } from '../../../core/services/restaurant-jobs.service';
import { contractLabel, shiftsLabel } from '../../../core/utils/job-labels';
import { formatRating } from '../../../core/utils/rating';
import { initials } from '../../../core/utils/text';
import { CandidateProfileState } from '../../professionals/candidate-profile/candidate-profile';
import { ReviewButton } from '../../../shared/ui/review-dialog/review-button';
import { describeRestaurantError } from '../restaurant-errors';

export const PIPELINE_TABS: readonly { status: ApplicationStatus; label: string }[] = [
  { status: 'PENDENTE', label: 'Pendente' },
  { status: 'APROVADA', label: 'Aprovado' },
  { status: 'REJEITADA', label: 'Recusado' },
];

export function ratingBadge(rating: number | null): string {
  return rating ? `★ ${formatRating(rating)}` : 'Novo';
}

export function appliedAtLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  if (date.toDateString() === now.toDateString()) {
    return 'Hoje';
  }
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
}

@Component({
  selector: 'app-pipeline',
  imports: [RouterLink, ReviewButton],
  templateUrl: './pipeline.html',
  styleUrl: './pipeline.scss',
})
export class Pipeline {
  private readonly jobsService = inject(RestaurantJobsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = PIPELINE_TABS;
  protected readonly initials = initials;
  protected readonly contractLabel = contractLabel;
  protected readonly ratingBadge = ratingBadge;

  protected readonly jobs = signal<RestaurantJob[]>([]);
  protected readonly selectedJobId = signal<string | null>(null);
  protected readonly applicants = signal<Applicant[]>([]);
  protected readonly tab = signal<ApplicationStatus>('PENDENTE');
  protected readonly loadingJobs = signal(true);
  protected readonly loadingApplicants = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly rowError = signal<{ id: string; message: string } | null>(null);
  protected readonly expandedId = signal<string | null>(null);
  private readonly now = new Date();

  protected readonly selectedJob = computed(
    () => this.jobs().find((job) => job.id === this.selectedJobId()) ?? null,
  );
  protected readonly visible = computed(() =>
    this.applicants().filter((applicant) => applicant.status === this.tab()),
  );
  protected readonly stats = computed(() => {
    const all = this.applicants();
    const approved = all.filter((a) => a.status === 'APROVADA').length;
    const decided = approved + all.filter((a) => a.status === 'REJEITADA').length;
    return {
      total: all.length,
      approvalRate: decided === 0 ? null : Math.round((approved / decided) * 100),
      openJobs: this.jobs().filter((job) => job.status === 'ABERTA').length,
    };
  });

  constructor() {
    afterNextRender(() => this.loadJobs());
  }

  protected count(status: ApplicationStatus): number {
    return this.applicants().filter((applicant) => applicant.status === status).length;
  }

  protected loadJobs(): void {
    this.loadingJobs.set(true);
    this.loadError.set(null);
    this.jobsService
      .listMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.loadingJobs.set(false);
          const requested = this.route.snapshot.queryParamMap.get('job');
          const initial =
            jobs.find((job) => job.id === requested) ??
            jobs.find((job) => job.status === 'ABERTA') ??
            jobs[0];
          if (initial) {
            this.selectJob(initial.id);
          }
        },
        error: (error: unknown) => {
          this.loadingJobs.set(false);
          this.loadError.set(describeRestaurantError(error, 'load'));
        },
      });
  }

  protected selectJob(jobId: string): void {
    this.selectedJobId.set(jobId);
    this.rowError.set(null);
    void this.router.navigate([], { queryParams: { job: jobId }, replaceUrl: true });
    this.loadApplicants();
  }

  protected loadApplicants(): void {
    const jobId = this.selectedJobId();
    if (!jobId) {
      return;
    }
    this.loadingApplicants.set(true);
    this.loadError.set(null);
    this.jobsService
      .listApplicants(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (applicants) => {
          this.applicants.set(applicants);
          this.loadingApplicants.set(false);
        },
        error: (error: unknown) => {
          this.applicants.set([]);
          this.loadingApplicants.set(false);
          this.loadError.set(describeRestaurantError(error, 'load'));
        },
      });
  }

  protected decide(applicant: Applicant, status: ApplicationStatus): void {
    const jobId = this.selectedJobId();
    if (!jobId || this.busyId()) {
      return;
    }
    this.busyId.set(applicant.applicationId);
    this.rowError.set(null);
    this.jobsService
      .updateApplicantStatus(jobId, applicant.applicationId, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.applicants.update((list) =>
            list.map((item) =>
              item.applicationId === applicant.applicationId ? { ...item, status } : item,
            ),
          );
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.rowError.set({
            id: applicant.applicationId,
            message: describeRestaurantError(error, 'decide'),
          });
        },
      });
  }

  protected toggleSummary(applicationId: string): void {
    this.expandedId.update((current) => (current === applicationId ? null : applicationId));
  }

  protected profileState(applicant: Applicant): CandidateProfileState {
    return {
      professional: applicant.professional,
      jobId: this.selectedJobId() ?? '',
      applicationId: applicant.applicationId,
      status: applicant.status,
    };
  }

  protected appliedAt(applicant: Applicant): string {
    return appliedAtLabel(applicant.applicationDate, this.now);
  }

  protected jobOptionLabel(job: RestaurantJob): string {
    const shift = shiftsLabel(job.shifts);
    const closed = job.status === 'ENCERRADA' ? ' (encerrada)' : '';
    return `${job.title}${shift ? ' · ' + shift : ''}${closed}`;
  }
}
