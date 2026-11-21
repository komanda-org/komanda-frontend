import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { CreateJobPayload } from '../../../core/models/restaurant-jobs.model';
import { RestaurantJobsService } from '../../../core/services/restaurant-jobs.service';
import { JobForm, JobFormValue } from '../job-form/job-form';
import { describeRestaurantError } from '../restaurant-errors';

export function toPayload(value: JobFormValue): CreateJobPayload {
  const payload: CreateJobPayload = {
    title: value.title.trim(),
    description: value.description.trim(),
    contractType: value.contractType,
    urgent: value.urgent,
  };
  if (value.shifts.length > 0) {
    payload.shifts = value.shifts;
  }
  const requirements = value.requirements.trim();
  if (requirements) {
    payload.requirements = requirements;
  }
  // A API so aceita ate 2 casas decimais.
  if (value.salary !== null && Number.isFinite(value.salary)) {
    payload.salary = Math.round(value.salary * 100) / 100;
  }
  return payload;
}

@Component({
  selector: 'app-new-job',
  imports: [JobForm],
  templateUrl: './new-job.html',
  styleUrl: './new-job.scss',
})
export class NewJob {
  private readonly jobsService = inject(RestaurantJobsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected submit(value: JobFormValue): void {
    this.submitting.set(true);
    this.submitError.set(null);
    this.jobsService
      .create(toPayload(value))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/my-jobs');
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.submitError.set(describeRestaurantError(error, 'create'));
        },
      });
  }
}
