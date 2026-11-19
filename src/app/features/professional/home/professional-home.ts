import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { isApiError } from '../../../core/models/api-error.model';
import { ApplicationStatus, MyApplication } from '../../../core/models/applications.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { JobsService } from '../../../core/services/jobs.service';
import { ProfileService } from '../../../core/services/profile.service';
import { greetingFor } from '../../../core/utils/greeting';
import { ReviewButton } from '../../../shared/ui/review-dialog/review-button';

const RECENT_LIMIT = 5;

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDENTE: 'Em análise',
  APROVADA: 'Aprovada',
  REJEITADA: 'Não selecionada',
};

export function firstName(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1) : null;
}

export function describeHomeError(error: unknown): string {
  switch (isApiError(error) ? error.status : -1) {
    case 0:
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    case 401:
      return 'Sua sessão expirou. Entre novamente para continuar.';
    case 403:
      return 'Esta conta não tem acesso à área do profissional. Entre com sua conta de profissional.';
    default:
      return 'Não foi possível carregar seu painel. Tente novamente.';
  }
}

@Component({
  selector: 'app-professional-home',
  imports: [RouterLink, ReviewButton],
  templateUrl: './professional-home.html',
  styleUrl: './professional-home.scss',
})
export class ProfessionalHome {
  private readonly applicationsService = inject(ApplicationsService);
  private readonly jobsService = inject(JobsService);
  private readonly profileService = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly applications = signal<MyApplication[]>([]);
  protected readonly openJobs = signal(0);
  protected readonly name = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly greeting = signal('Olá');
  protected readonly today = signal('');

  protected readonly stats = computed(() => {
    const list = this.applications();
    return {
      pending: list.filter((a) => a.status === 'PENDENTE').length,
      matches: list.filter((a) => a.status === 'APROVADA').length,
    };
  });

  protected readonly recent = computed(() =>
    [...this.applications()]
      .sort((a, b) => Date.parse(b.applicationDate) - Date.parse(a.applicationDate))
      .slice(0, RECENT_LIMIT),
  );

  constructor() {
    // Hora local e sessao so existem no navegador.
    afterNextRender(() => {
      const now = new Date();
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
    forkJoin({
      applications: this.applicationsService.list().pipe(map((page) => page.data)),
      openJobs: this.jobsService.search({ take: 1 }).pipe(map((page) => page.total)),
      // O nome so enfeita a saudacao: sem perfil o painel continua.
      name: this.profileService.getMe().pipe(
        map((me) => (me.role === 'RESTAURANTE' ? null : firstName(me.fullName))),
        catchError(() => of(null)),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ applications, openJobs, name }) => {
          this.applications.set(applications);
          this.openJobs.set(openJobs);
          this.name.set(name);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(describeHomeError(error));
        },
      });
  }

  protected statusLabel(status: ApplicationStatus): string {
    return STATUS_LABELS[status];
  }

  protected appliedAt(application: MyApplication): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
      new Date(application.applicationDate),
    );
  }
}
