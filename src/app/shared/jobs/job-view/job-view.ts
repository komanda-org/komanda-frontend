import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '../../../core/models/jobs.model';
import {
  contractLabel,
  formatPublishedAt,
  formatSalary,
  shiftsLabel,
} from '../../../core/utils/job-labels';

export type JobViewMode = 'professional' | 'preview';

export const PREVIEW_APPLY_HINT = 'Indisponível na pré-visualização';

export function restaurantInitial(job: Job): string {
  return job.restaurant.restaurantName.trim().charAt(0).toLocaleUpperCase('pt-BR');
}

/** A vaga como o profissional a ve; quem usa decide o que a candidatura faz. */
@Component({
  selector: 'app-job-view',
  imports: [RouterLink],
  templateUrl: './job-view.html',
  styleUrl: './job-view.scss',
})
export class JobView {
  readonly job = input.required<Job>();
  readonly mode = input<JobViewMode>('professional');
  readonly applied = input(false);
  readonly applying = input(false);
  readonly applyError = input<string | null>(null);

  readonly apply = output<void>();

  protected readonly formatSalary = formatSalary;
  protected readonly shiftsLabel = shiftsLabel;
  protected readonly contractLabel = contractLabel;
  protected readonly formatPublishedAt = formatPublishedAt;
  protected readonly restaurantInitial = restaurantInitial;
  protected readonly previewHint = PREVIEW_APPLY_HINT;

  protected onApply(): void {
    if (this.mode() === 'professional') {
      this.apply.emit();
    }
  }
}
