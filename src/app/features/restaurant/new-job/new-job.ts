import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ContractType } from '../../../core/models/jobs.model';
import { CreateJobPayload } from '../../../core/models/restaurant-jobs.model';
import { RestaurantJobsService } from '../../../core/services/restaurant-jobs.service';
import {
  CONTRACT_OPTIONS,
  SHIFT_OPTIONS,
  contractLabel,
  formatSalary,
  shiftLabel,
} from '../../../core/utils/job-labels';
import { describeRestaurantError } from '../restaurant-errors';

export function toPayload(value: {
  title: string;
  shift: string;
  contractType: ContractType;
  salary: number | null;
  description: string;
  requirements: string;
  urgent: boolean;
}): CreateJobPayload {
  const payload: CreateJobPayload = {
    title: value.title.trim(),
    description: value.description.trim(),
    contractType: value.contractType,
    urgent: value.urgent,
  };
  if (value.shift) {
    payload.shift = value.shift;
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
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './new-job.html',
  styleUrl: './new-job.scss',
})
export class NewJob {
  private readonly jobsService = inject(RestaurantJobsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly shiftOptions = SHIFT_OPTIONS;
  protected readonly contractOptions = CONTRACT_OPTIONS;
  protected readonly shiftLabel = shiftLabel;
  protected readonly contractLabel = contractLabel;
  protected readonly formatSalary = formatSalary;

  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    shift: [''],
    contractType: ['CLT' as ContractType, Validators.required],
    salary: [null as number | null, Validators.min(0)],
    description: ['', [Validators.required, Validators.minLength(20)]],
    requirements: [''],
    urgent: [false],
  });

  protected readonly preview = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected showError(control: 'title' | 'description' | 'salary'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  protected setShift(value: string): void {
    const current = this.form.controls.shift.value;
    this.form.controls.shift.setValue(current === value ? '' : value);
  }

  protected setContract(value: ContractType): void {
    this.form.controls.contractType.setValue(value);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.jobsService
      .create(toPayload(this.form.getRawValue()))
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
