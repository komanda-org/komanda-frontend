import { Location } from '@angular/common';
import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { isApiError } from '../../core/models/api-error.model';
import { Job } from '../../core/models/jobs.model';
import { AuthService } from '../../core/services/auth.service';
import { JobsService } from '../../core/services/jobs.service';
import { shiftsLabel } from '../../core/utils/job-labels';
import { ReviewDialog, ReviewDialogResult } from '../../shared/ui/review-dialog/review-dialog';

const RESTAURANT_HINT = 'A avaliação de profissionais é feita pela tela do Pipeline.';

/** Rota de apoio `avaliacoes/nova?vaga=<id>`: abre o modal sobre a tela do feed. */
@Component({
  selector: 'app-review-page',
  imports: [ReviewDialog, RouterLink],
  templateUrl: './review-page.html',
  styles: `
    .state {
      max-width: 520px;
      margin: var(--k-s-7) auto;
      padding: 0 var(--k-gutter);
      text-align: center;
    }

    .state p {
      color: var(--k-texto-fraco);
    }

    .state a {
      color: var(--k-ouro);
    }
  `,
})
export class ReviewPage {
  private readonly jobsService = inject(JobsService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly jobId = this.route.snapshot.queryParamMap.get('vaga') ?? '';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly job = signal<Job | null>(null);
  protected readonly shift = computed(() => shiftsLabel(this.job()?.shifts) ?? null);
  protected readonly professional = this.authService.getUser()?.role === 'PROFISSIONAL';

  constructor() {
    afterNextRender(() => this.load());
  }

  protected load(): void {
    if (!this.professional) {
      this.loading.set(false);
      this.error.set(RESTAURANT_HINT);
      return;
    }
    if (!this.jobId) {
      this.loading.set(false);
      this.error.set('Escolha a vaga que você quer avaliar.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.jobsService
      .getById(this.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job) => {
          this.job.set(job);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(this.describeLoadError(error));
        },
      });
  }

  protected onClosed(result: ReviewDialogResult): void {
    if (result === 'reviewed') {
      void this.router.navigateByUrl('/vagas');
      return;
    }
    // "Pular por agora" volta de onde veio; sem historico, cai no feed.
    if (history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/vagas');
  }

  private describeLoadError(error: unknown): string {
    switch (isApiError(error) ? error.status : -1) {
      case 0:
        return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
      case 400:
      case 404:
        return 'Não encontramos esta vaga. Abra a avaliação pela lista de candidaturas.';
      case 401:
        return 'Sua sessão expirou. Entre novamente para avaliar.';
      case 403:
        return 'Você só pode avaliar depois de uma contratação aprovada.';
      default:
        return 'Não foi possível abrir a avaliação. Tente novamente.';
    }
  }
}
