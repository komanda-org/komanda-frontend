import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ApplicationStatus, MyApplication } from '../../../core/models/applications.model';
import { ApplicationsService } from '../../../core/services/applications.service';
import { ErrorCopy, describeError } from '../../../core/utils/describe-error';
import { initials } from '../../../core/utils/initials';
import { ReviewButton } from '../../../shared/ui/review-dialog/review-button';

export type TabKey = 'ALL' | 'MATCH' | 'PENDING' | 'REJECTED';
type ViewState = 'loading' | 'error' | 'ready';
type BadgeTone = 'match' | 'pending' | 'rejected';

export interface Badge {
  label: string;
  tone: BadgeTone;
}

interface Tab {
  key: TabKey;
  label: string;
  status: ApplicationStatus | null;
}

const TABS: Tab[] = [
  { key: 'ALL', label: 'TODOS', status: null },
  { key: 'MATCH', label: 'MATCH', status: 'APROVADA' },
  { key: 'PENDING', label: 'PENDENTE', status: 'PENDENTE' },
  { key: 'REJECTED', label: 'RECUSADO', status: 'REJEITADA' },
];

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const ERROR_COPY: ErrorCopy = {
  fallback: 'Não foi possível carregar suas candidaturas. Tente de novo.',
  byStatus: {
    401: 'Sua sessão expirou. Entre novamente para ver suas candidaturas.',
    // A rota da API exige o papel PROFISSIONAL (@Roles): 403 = conta de restaurante.
    403: 'Esta conta não tem candidaturas. Entre com sua conta de profissional.',
  },
};

export function toBadge(status: ApplicationStatus): Badge {
  switch (status) {
    case 'APROVADA':
      return { label: 'MATCH', tone: 'match' };
    case 'PENDENTE':
      return { label: 'PENDENTE', tone: 'pending' };
    case 'REJEITADA':
      return { label: 'NÃO APROVADO', tone: 'rejected' };
  }
}

export function filterByTab(list: MyApplication[], tab: TabKey): MyApplication[] {
  const status = TABS.find((t) => t.key === tab)?.status ?? null;
  return status === null ? list : list.filter((a) => a.status === status);
}

export function countByTab(list: MyApplication[]): Record<TabKey, number> {
  return {
    ALL: list.length,
    MATCH: filterByTab(list, 'MATCH').length,
    PENDING: filterByTab(list, 'PENDING').length,
    REJECTED: filterByTab(list, 'REJECTED').length,
  };
}

/**
 * Le dia e mes em UTC (mesmo padrao do formatPeriod), para o resultado nao
 * depender do fuso da maquina que roda o codigo.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export function describeApplicationsError(error: unknown): string {
  return describeError(error, ERROR_COPY);
}

@Component({
  selector: 'app-my-applications',
  imports: [RouterLink, ReviewButton],
  templateUrl: './my-applications.html',
  styleUrl: './my-applications.scss',
})
export class MyApplications {
  private readonly service = inject(ApplicationsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = TABS;
  protected readonly toBadge = toBadge;
  protected readonly formatDate = formatDate;
  protected readonly initials = initials;

  protected readonly state = signal<ViewState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly applications = signal<MyApplication[]>([]);
  protected readonly activeTab = signal<TabKey>('ALL');

  protected readonly counts = computed(() => countByTab(this.applications()));
  protected readonly visible = computed(() => filterByTab(this.applications(), this.activeTab()));
  protected readonly total = computed(() => this.applications().length);

  constructor() {
    // A rota e pre-renderizada no build (Node, sem API): a chamada so roda no browser.
    afterNextRender(() => this.load());
  }

  protected load(): void {
    this.state.set('loading');

    // Abas e contagens sao calculadas no cliente, entao pedimos a maior pagina
    // (50). Paginacao de verdade ("carregar mais") fica para quando houver volume.
    this.service
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.applications.set(page.data);
          this.state.set('ready');
        },
        error: (error: unknown) => {
          this.errorMessage.set(describeApplicationsError(error));
          this.state.set('error');
        },
      });
  }

  protected selectTab(tab: TabKey): void {
    this.activeTab.set(tab);
  }

  protected openChat(application: MyApplication): void {
    // A conversa e indexada pela vaga: rota mensagens/:jobId.
    void this.router.navigate(['/mensagens', application.job.id]);
  }
}
