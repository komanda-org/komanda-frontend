import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../../../core/http/api-error.interceptor';
import {
  ApplicationStatus,
  MyApplication,
  MyApplicationsPage,
} from '../../../core/models/applications.model';
import {
  MyApplications,
  countByTab,
  describeApplicationsError,
  filterByTab,
  formatDate,
  toBadge,
} from './my-applications';

// Mesmo formato de MyApplicationDto no komanda-api.
function application(id: string, status: ApplicationStatus): MyApplication {
  return {
    applicationId: id,
    status,
    applicationDate: '2026-10-12T15:00:00.000Z',
    job: { id: `job-${id}`, title: `Cargo ${id}` },
    restaurant: { id: `rest-${id}`, name: `Restaurante ${id}` },
  };
}

function page(data: MyApplication[]): MyApplicationsPage {
  return { data, total: data.length, skip: 0, take: 50 };
}

const SAMPLE: MyApplication[] = [
  application('1', 'APROVADA'),
  application('2', 'PENDENTE'),
  application('3', 'REJEITADA'),
  application('4', 'PENDENTE'),
];

describe('MyApplications — funcoes puras', () => {
  it('conta candidaturas por aba', () => {
    expect(countByTab(SAMPLE)).toEqual({ ALL: 4, MATCH: 1, PENDING: 2, REJECTED: 1 });
  });

  it('filtra por aba e devolve tudo em ALL', () => {
    expect(filterByTab(SAMPLE, 'PENDING').map((a) => a.applicationId)).toEqual(['2', '4']);
    expect(filterByTab(SAMPLE, 'ALL')).toHaveLength(4);
  });

  it('mapeia o enum CandidaturaStatus da API para o selo', () => {
    expect(toBadge('APROVADA')).toEqual({ label: 'MATCH', tone: 'match' });
    expect(toBadge('PENDENTE')).toEqual({ label: 'PENDENTE', tone: 'pending' });
    expect(toBadge('REJEITADA')).toEqual({ label: 'NÃO APROVADO', tone: 'rejected' });
  });

  it('formata a data em UTC, qualquer que seja o fuso da maquina', () => {
    expect(formatDate('2026-10-12T15:00:00Z')).toBe('12 OUT');
    expect(formatDate('2026-03-05T15:00:00Z')).toBe('5 MAR');
    // Em horario local (Brasil, -03:00) viraria 30/09; em UTC continua 1/10.
    expect(formatDate('2026-10-01T01:00:00Z')).toBe('1 OUT');
  });

  it('traduz erros normalizados (ApiError) com o assunto da tela', () => {
    expect(describeApplicationsError({ status: 401, messages: ['x'] })).toContain(
      'Sua sessão expirou',
    );
    expect(describeApplicationsError({ status: 503, messages: ['x'] })).toContain('instável');
    expect(describeApplicationsError(new Error('qualquer'))).toContain('Tente de novo');
  });
});

describe('MyApplications', () => {
  let fixture: ComponentFixture<MyApplications>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const cards = () =>
    Array.from(el().querySelectorAll<HTMLElement>('[data-testid="application-card"]'));
  const expectList = (): TestRequest =>
    http.expectOne((req) => req.url === '/api/users/me/applications');

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(MyApplications);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function respond(list: MyApplication[]): Promise<void> {
    expectList().flush(page(list));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function fail(status: number): Promise<void> {
    expectList().flush({ message: 'boom' }, { status, statusText: 'Erro' });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MyApplications],
      providers: [
        provideRouter([]),
        // O mesmo interceptor registrado em app.config.ts.
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pede a maior pagina aceita pela API', async () => {
    await render();
    const req = expectList();

    expect(req.request.params.get('take')).toBe('50');
    expect(req.request.params.get('skip')).toBe('0');
    req.flush(page([]));
  });

  it('mostra as abas com a contagem real e o subtitulo', async () => {
    await render();
    await respond(SAMPLE);

    const tabs = Array.from(el().querySelectorAll('[role="tab"]')).map((t) =>
      t.textContent?.trim(),
    );
    expect(tabs).toEqual(['TODOS(4)', 'MATCH(1)', 'PENDENTE(2)', 'RECUSADO(1)']);
    expect(el().querySelector('[data-testid="subtitle"]')?.textContent).toContain(
      '4 oportunidades ativas',
    );
  });

  it('cartao mostra nome do restaurante, inicial e data', async () => {
    await render();
    await respond(SAMPLE);

    const first = cards()[0];
    expect(first.querySelector('[data-testid="card-restaurant"]')?.textContent?.trim()).toBe(
      'Restaurante 1',
    );
    expect(first.querySelector('.logo')?.textContent?.trim()).toBe('R');
    expect(first.querySelector('[data-testid="card-date"]')?.textContent?.trim()).toBe('12 OUT');
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
    expect(rejected.querySelector('[data-testid="card-badge"]')?.textContent).toContain(
      'NÃO APROVADO',
    );
    expect(rejected.querySelector('[data-testid="card-role"]')?.classList).toContain(
      'role--struck',
    );
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

  it('ABRIR CHAT navega para a conversa da vaga', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await render();
    await respond(SAMPLE);

    el().querySelector<HTMLButtonElement>('[data-testid="open-chat-btn"]')!.click();

    expect(navigate).toHaveBeenCalledWith(['/mensagens', 'job-1']);
  });

  it('estado vazio leva a /vagas', async () => {
    await render();
    await respond([]);

    const cta = el().querySelector<HTMLAnchorElement>('[data-testid="empty-cta"]');
    expect(cta?.getAttribute('href')).toBe('/vagas');
    expect(el().querySelector('[role="tab"]')).toBeNull();
  });

  it('401 passando pelo interceptor real mostra "sessao expirou"', async () => {
    await render();
    await fail(401);

    expect(el().querySelector('[data-testid="error"]')?.textContent).toContain(
      'Sua sessão expirou',
    );
  });

  it('falha mostra frase acionavel e tenta de novo', async () => {
    await render();
    await fail(500);

    const error = el().querySelector('[data-testid="error"]')?.textContent ?? '';
    expect(error).toContain('instável');
    expect(error).not.toMatch(/500/);

    el().querySelector<HTMLButtonElement>('[data-testid="retry-btn"]')!.click();
    await respond(SAMPLE);

    expect(cards()).toHaveLength(4);
  });
});
