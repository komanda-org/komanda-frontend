import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JobShift } from '../../../core/models/jobs.model';
import { RestaurantJob, UpdateJobPayload } from '../../../core/models/restaurant-jobs.model';
import { RestaurantJobsService } from '../../../core/services/restaurant-jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { FROM_PREVIEW } from '../job-preview/preview-origin';
import { JobForm, JobFormValue } from '../job-form/job-form';
import { describeRestaurantError } from '../restaurant-errors';

export const JOB_UPDATED_TOAST = 'Vaga atualizada';

function toSalary(value: number | string | null): number | null {
  if (value === null || value === '') {
    return null;
  }
  const amount = Number(value);
  // A API so aceita ate 2 casas decimais.
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

export function toFormValue(job: RestaurantJob): JobFormValue {
  return {
    title: job.title,
    shifts: [...(job.shifts ?? [])],
    contractType: job.contractType,
    salary: toSalary(job.salary),
    description: job.description,
    requirements: job.requirements ?? '',
    urgent: job.urgent,
  };
}

function sameShifts(a: readonly JobShift[], b: readonly JobShift[]): boolean {
  return a.length === b.length && a.every((shift) => b.includes(shift));
}

/** So o que mudou em relacao a vaga carregada; opcional esvaziado vira null. */
export function changedFields(job: RestaurantJob, value: JobFormValue): UpdateJobPayload {
  const changes: UpdateJobPayload = {};
  const title = value.title.trim();
  if (title !== job.title) {
    changes.title = title;
  }
  const description = value.description.trim();
  if (description !== job.description) {
    changes.description = description;
  }
  const requirements = value.requirements.trim() || null;
  if (requirements !== (job.requirements || null)) {
    changes.requirements = requirements;
  }
  const salary = toSalary(value.salary);
  if (salary !== toSalary(job.salary)) {
    changes.salary = salary;
  }
  if (value.contractType !== job.contractType) {
    changes.contractType = value.contractType;
  }
  if (!sameShifts(value.shifts, job.shifts ?? [])) {
    changes.shifts = value.shifts;
  }
  if (value.urgent !== job.urgent) {
    changes.urgent = value.urgent;
  }
  return changes;
}

@Component({
  selector: 'app-edit-job',
  imports: [JobForm, RouterLink],
  templateUrl: './edit-job.html',
  styleUrl: './edit-job.scss',
})
export class EditJob {
  private readonly jobsService = inject(RestaurantJobsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly jobId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private returnUrl = '/my-jobs';

  protected readonly job = signal<RestaurantJob | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly initial = computed(() => {
    const job = this.job();
    return job ? toFormValue(job) : null;
  });

  constructor() {
    // A lista manda a vaga no state; ao recarregar a pagina o state some e buscamos de novo.
    const state = this.router.getCurrentNavigation()?.extras.state;
    const fromList = state?.['job'] as RestaurantJob | undefined;
    if (state?.['from'] === FROM_PREVIEW) {
      this.returnUrl = `/my-jobs/${this.jobId}/preview`;
    }
    if (fromList?.id === this.jobId) {
      this.job.set(fromList);
    } else {
      afterNextRender(() => this.load());
    }
  }

  protected load(): void {
    this.loadError.set(null);
    this.jobsService
      .listMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          const job = jobs.find((item) => item.id === this.jobId);
          if (job) {
            this.job.set(job);
          } else {
            this.loadError.set('Não encontramos esta vaga entre as suas. Ela pode ter sido removida.');
          }
        },
        error: (error: unknown) => this.loadError.set(describeRestaurantError(error, 'load')),
      });
  }

  protected save(value: JobFormValue): void {
    const job = this.job();
    if (!job || this.submitting()) {
      return;
    }
    const changes = changedFields(job, value);
    if (Object.keys(changes).length === 0) {
      this.submitError.set('Nenhuma alteração para salvar.');
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.jobsService
      .updateJob(job.id, changes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.show(JOB_UPDATED_TOAST);
          void this.router.navigateByUrl(this.returnUrl);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.submitError.set(describeRestaurantError(error, 'edit'));
        },
      });
  }
}
