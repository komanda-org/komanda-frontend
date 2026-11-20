import { Component, OnInit, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContractType, JobShift } from '../../../core/models/jobs.model';
import {
  CONTRACT_OPTIONS,
  FULL_DAY_SHIFT,
  SHIFT_OPTIONS,
  contractLabel,
  formatSalary,
  shiftsLabel,
} from '../../../core/utils/job-labels';

// Mesmos limites do DTO da API (POST e PATCH /jobs).
export const TITLE_MIN = 5;
export const TITLE_MAX = 100;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 2000;
export const REQUIREMENTS_MAX = 1000;

export interface JobFormValue {
  title: string;
  shifts: JobShift[];
  contractType: ContractType;
  salary: number | null;
  description: string;
  requirements: string;
  urgent: boolean;
}

export type JobFormMode = 'create' | 'edit';

/** Conta o texto sem os espacos das pontas, como a API faz depois do trim. */
export function trimmedLength(min: number, max: number): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const length = (control.value ?? '').trim().length;
    if (length === 0 && min > 0) {
      return { required: true };
    }
    return length < min || length > max ? { length: { min, max, actual: length } } : null;
  };
}

@Component({
  selector: 'app-job-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './job-form.html',
  styleUrl: './job-form.scss',
})
export class JobForm implements OnInit {
  readonly mode = input<JobFormMode>('create');
  readonly initial = input<JobFormValue | null>(null);
  readonly submitting = input(false);
  readonly submitError = input<string | null>(null);
  readonly save = output<JobFormValue>();

  protected readonly shiftOptions = SHIFT_OPTIONS;
  protected readonly contractOptions = CONTRACT_OPTIONS;
  protected readonly shiftsLabel = shiftsLabel;
  protected readonly contractLabel = contractLabel;
  protected readonly formatSalary = formatSalary;
  protected readonly limits = { TITLE_MIN, TITLE_MAX, DESCRIPTION_MAX, REQUIREMENTS_MAX };

  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', trimmedLength(TITLE_MIN, TITLE_MAX)],
    shifts: [[] as JobShift[]],
    contractType: ['CLT' as ContractType, Validators.required],
    salary: [null as number | null, Validators.min(0)],
    description: ['', trimmedLength(DESCRIPTION_MIN, DESCRIPTION_MAX)],
    requirements: ['', Validators.maxLength(REQUIREMENTS_MAX)],
    urgent: [false],
  });

  protected readonly preview = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  ngOnInit(): void {
    const initial = this.initial();
    if (initial) {
      this.form.setValue(initial);
    }
  }

  protected showError(control: 'title' | 'description' | 'salary' | 'requirements'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  protected tooLong(control: 'title' | 'description'): boolean {
    const length = this.form.controls[control].getError('length');
    return !!length && length.actual > length.max;
  }

  protected hasShift(value: JobShift): boolean {
    return this.form.controls.shifts.value.includes(value);
  }

  protected toggleShift(value: JobShift): void {
    const control = this.form.controls.shifts;
    let next: JobShift[];
    if (control.value.includes(value)) {
      next = control.value.filter((shift) => shift !== value);
    } else if (value === FULL_DAY_SHIFT) {
      next = [value];
    } else {
      const picked = [...control.value.filter((shift) => shift !== FULL_DAY_SHIFT), value];
      next = SHIFT_OPTIONS.map((option) => option.value).filter((shift) => picked.includes(shift));
    }
    control.setValue(next);
    control.markAsDirty();
  }

  protected setContract(value: ContractType): void {
    this.form.controls.contractType.setValue(value);
    this.form.controls.contractType.markAsDirty();
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.save.emit(this.form.getRawValue());
  }
}
