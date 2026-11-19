import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { isApiError } from '../../../core/models/api-error.model';
import { Job } from '../../../core/models/jobs.model';
import { APPLICATIONS_MAX_TAKE, ApplicationsService } from '../../../core/services/applications.service';
import { JobsService } from '../../../core/services/jobs.service';
import { JobView } from '../../../shared/jobs/job-view/job-view';

export function describeLoadError(error: unknown): string {
  switch (isApiError(error) ? error.status : -1) {
    case 0:
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    case 401:
      return 'Sua sessão expirou. Entre novamente para ver a vaga.';
    case 403:
      return 'Esta conta não tem acesso às vagas. Entre com sua conta de profissional.';
    case 404:
      return 'Não encontramos esta vaga. Ela pode ter sido encerrada. Abra a vaga a partir da lista.';
    default:
      return 'Não foi possível carregar a vaga. Tente novamente.';
  }
}

export function describeApplyError(error: unknown): string {
  switch (isApiError(error) ? error.status : -1) {
    case 0:
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    case 401:
      return 'Sua sessão expirou. Entre novamente para continuar.';
    case 403:
      return 'Você não tem permissão para se candidatar.';
    case 404:
    case 409:
      return 'Esta vaga não está mais disponível para candidatura.';
    case 429:
      return 'Muitas tentativas. Aguarde um instante e tente novamente.';
    default:
      return 'Não foi possível enviar sua candidatura. Tente novamente.';
  }
}

@Component({
  selector: 'app-job-detail',
  imports: [RouterLink, JobView],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.scss',
})
export class JobDetail {
  private readonly jobsService = inject(JobsService);
  private readonly applicationsService = inject(ApplicationsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly jobId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly job = signal<Job | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly applied = signal(false);
  protected readonly applying = signal(false);
  protected readonly applyError = signal<string | null>(null);
  protected readonly shareMessage = signal<string | null>(null);

  constructor() {
    // history.state e a sessao so existem no navegador.
    afterNextRender(() => this.load());
  }

  protected load(): void {
    this.loadError.set(null);
    this.loadAppliedStatus();

    const fromList = (history.state as { job?: Job } | null)?.job;
    if (fromList?.id === this.jobId) {
      this.show(fromList);
      return;
    }

    this.loading.set(true);
    this.jobsService
      .getById(this.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job) => this.show(job),
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(describeLoadError(error));
        },
      });
  }

  protected apply(): void {
    const job = this.job();
    if (!job || this.applied() || this.applying()) {
      return;
    }
    this.applying.set(true);
    this.applyError.set(null);
    this.applicationsService
      .apply(job.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.applying.set(false);
          this.applied.set(true);
        },
        error: (error: unknown) => {
          this.applying.set(false);
          this.applyError.set(describeApplyError(error));
        },
      });
  }

  protected async share(): Promise<void> {
    const job = this.job();
    if (!job) {
      return;
    }
    const url = location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: job.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.shareMessage.set('Link da vaga copiado.');
    } catch {
      // Cancelar o compartilhamento nativo tambem cai aqui; nao e erro para o usuario.
      if (typeof navigator.share !== 'function') {
        this.shareMessage.set('Não foi possível copiar o link. Copie pela barra de endereço.');
      }
    }
  }

  private show(job: Job): void {
    this.job.set(job);
    this.loading.set(false);
    if (job.hasApplied || job.application) {
      this.applied.set(true);
    }
  }

  private loadAppliedStatus(): void {
    this.applicationsService
      .list(0, APPLICATIONS_MAX_TAKE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (page.data.some((application) => application.job.id === this.jobId)) {
            this.applied.set(true);
          }
        },
        // Sem a lista, o botao continua ativo e a API recusa duplicata com 409.
        error: () => undefined,
      });
  }
}
