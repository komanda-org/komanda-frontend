import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ApplicationStatus, MyApplication } from '../../../core/models/applications.model';
import { ehErroApi } from '../../../core/models/erro-api.model';
import { ApplicationsService } from '../../../core/services/applications.service';

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
  { key: 'MATCH', label: 'MATCH', status: 'MATCHED' },
  { key: 'PENDING', label: 'PENDENTE', status: 'PENDING' },
  { key: 'REJECTED', label: 'RECUSADO', status: 'REJECTED' },
];

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function toBadge(status: ApplicationStatus): Badge {
  switch (status) {
    case 'MATCHED':
      return { label: 'MATCH', tone: 'match' };
    case 'PENDING':
      return { label: 'PENDENTE', tone: 'pending' };
    case 'REJECTED':
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

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function describeError(error: unknown): string {
  const status = ehErroApi(error) ? error.status : -1;

  switch (status) {
    case 0:
      return 'Não conseguimos conectar. Verifique sua internet e tente de novo.';
    case 401:
    case 403:
      return 'Sua sessão expirou. Entre novamente para ver suas candidaturas.';
    case 500:
    case 502:
    case 503:
      return 'Nosso serviço está instável agora. Tente de novo em instantes.';
    default:
      return 'Não foi possível carregar suas candidaturas. Tente de novo.';
  }
}

@Component({
  selector: 'app-my-applications',
  imports: [RouterLink],
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

    this.service
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.applications.set(list);
          this.state.set('ready');
        },
        error: (error: unknown) => {
          this.errorMessage.set(describeError(error));
          this.state.set('error');
        },
      });
  }

  protected selectTab(tab: TabKey): void {
    this.activeTab.set(tab);
  }

  protected openChat(application: MyApplication): void {
    // TODO: destino final da conversa fecha com a Tarefa 5.
    void this.router.navigate(['/mensagens'], { queryParams: { application: application.id } });
  }

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }
}
