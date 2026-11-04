import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { erroApiInterceptor } from '../../../core/http/erro-api.interceptor';
import { ApplicationStatus, MyApplication } from '../../../core/models/applications.model';
import {
  MyApplications,
  countByTab,
  describeError,
  filterByTab,
  toBadge,
} from './my-applications';

function application(id: string, status: ApplicationStatus): MyApplication {
  return {
    id,
    status,
    createdAt: '2026-10-12T15:00:00Z',
    job: {
      id: `job-${id}`,
      title: `Cargo ${id}`,
      restaurant: { restaurantName: `Restaurante ${id}`, logoUrl: null },
    },
  };
}

const SAMPLE: MyApplication[] = [
  application('1', 'MATCHED'),
  application('2', 'PENDING'),
  application('3', 'REJECTED'),
  application('4', 'PENDING'),
];

describe('MyApplications — funcoes puras', () => {
  it('conta candidaturas por aba', () => {
    expect(countByTab(SAMPLE)).toEqual({ ALL: 4, MATCH: 1, PENDING: 2, REJECTED: 1 });
  });

  it('filtra por aba e devolve tudo em ALL', () => {
    expect(filterByTab(SAMPLE, 'PENDING').map((a) => a.id)).toEqual(['2', '4']);
    expect(filterByTab(SAMPLE, 'ALL')).toHaveLength(4);
  });

  it('mapeia status da API para o selo', () => {
    expect(toBadge('MATCHED')).toEqual({ label: 'MATCH', tone: 'match' });
    expect(toBadge('PENDING')).toEqual({ label: 'PENDENTE', tone: 'pending' });
    expect(toBadge('REJECTED')).toEqual({ label: 'NÃO APROVADO', tone: 'rejected' });
  });

  it('traduz erro sem expor status HTTP', () => {
    for (const status of [0, 401, 500, 418]) {
      const message = describeError({ status, mensagens: ['x'] });
      expect(message).not.toMatch(/\d{3}/);
    }
    expect(describeError(new Error('qualquer'))).toContain('Tente de novo');
  });
});

describe('MyApplications', () => {
  let fixture: ComponentFixture<MyApplications>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const cards = () => Array.from(el().querySelectorAll<HTMLElement>('[data-testid="application-card"]'));

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(MyApplications);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function respond(list: MyApplication[]): Promise<void> {
    http.expectOne('/api/users/me/applications').flush(list);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MyApplications],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([erroApiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('mostra as abas com a contagem real e o subtitulo', async () => {
    await render();
    await respond(SAMPLE);

    const tabs = Array.from(el().querySelectorAll('[role="tab"]')).map((t) => t.textContent?.trim());
    expect(tabs).toEqual(['TODOS(4)', 'MATCH(1)', 'PENDENTE(2)', 'RECUSADO(1)']);
    expect(el().querySelector('[data-testid="subtitle"]')?.textContent).toContain('4 oportunidades ativas');
  });

  it('filtra a lista ao trocar de aba, sem nova requisicao', async () => {
    await render();
    await respond(SAMPLE);
    expect(cards()).toHaveLength(4);

    el().querySelector<HTMLButtonElement>('[data-testid="tab-PENDING"]')!.click();
    fixture.detectChanges();

    expect(cards()).toHaveLength(2);
    expect(el().querySelector('[data-testid="tab-PENDING"]')?.classList).toContain('tab--active');
  });

  it('cartao recusado: selo, cargo tachado, esmaecido e sem botao', async () => {
    await render();
    await respond(SAMPLE);

    const rejected = cards()[2];
    expect(rejected.classList).toContain('card--rejected');
    expect(getComputedStyle(rejected).opacity).toBe('0.55');
    expect(getComputedStyle(cards()[1]).opacity).not.toBe('0.55');
    expect(rejected.querySelector('[data-testid="card-badge"]')?.textContent).toContain('NÃO APROVADO');
    expect(rejected.querySelector('[data-testid="card-role"]')?.classList).toContain('role--struck');
    expect(rejected.querySelector('button')).toBeNull();
  });

  it('cartao pendente mostra a faixa de espera; match mostra o botao', async () => {
    await render();
    await respond(SAMPLE);

    expect(cards()[1].querySelector('[data-testid="card-waiting"]')?.textContent).toContain(
      'Aguardando aprovação do restaurante',
    );
    expect(cards()[0].querySelector('[data-testid="open-chat-btn"]')).not.toBeNull();
  });

  it('ABRIR CHAT navega para a conversa', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await render();
    await respond(SAMPLE);

    el().querySelector<HTMLButtonElement>('[data-testid="open-chat-btn"]')!.click();

    expect(navigate).toHaveBeenCalledWith(['/mensagens'], { queryParams: { application: '1' } });
  });

  it('estado vazio leva a /vagas', async () => {
    await render();
    await respond([]);

    const cta = el().querySelector<HTMLAnchorElement>('[data-testid="empty-cta"]');
    expect(cta?.getAttribute('href')).toBe('/vagas');
    expect(el().querySelector('[role="tab"]')).toBeNull();
  });

  it('falha mostra frase acionavel e tenta de novo', async () => {
    await render();
    http
      .expectOne('/api/users/me/applications')
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="error"]')?.textContent).not.toMatch(/500/);

    el().querySelector<HTMLButtonElement>('[data-testid="retry-btn"]')!.click();
    await respond(SAMPLE);

    expect(cards()).toHaveLength(4);
  });
});
