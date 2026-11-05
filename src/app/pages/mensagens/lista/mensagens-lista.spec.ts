import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MensagensLista } from './mensagens-lista';
import { MessagingService } from '../../../core/services/messaging/messaging.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router, ActivatedRoute, ActivatedRouteSnapshot, ParamMap } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { ChatListItem } from '../../../core/models/messaging/chat.model';
import { signal } from '@angular/core';

function createMockParamMap(): ParamMap {
  return {
    get: vi.fn().mockReturnValue(null),
    has: vi.fn().mockReturnValue(false),
    getAll: vi.fn().mockReturnValue([]),
    keys: [],
  };
}

function createMockRouteSnapshot(): ActivatedRouteSnapshot {
  return {
    paramMap: createMockParamMap(),
    url: [],
    params: {},
    queryParams: {},
    fragment: null,
    data: {},
    outlet: 'primary',
    component: null,
    routeConfig: null,
    root: null as any,
    parent: null,
    firstChild: null,
    children: [],
    pathFromRoot: [],
    queryParamMap: createMockParamMap(),
    title: undefined,
    toString: () => '/mensagens',
  } as ActivatedRouteSnapshot;
}

describe('MensagensLista', () => {
  let component: MensagensLista;
  let fixture: ComponentFixture<MensagensLista>;
  let mockMessagingService: Partial<MessagingService>;
  let mockAuthService: Partial<AuthService>;
  let mockRouter: Partial<Router>;
  let mockRoute: Partial<ActivatedRoute>;

  beforeEach(async () => {
    const mockChats = signal<ChatListItem[]>([
      {
        jobId: 'job-1',
        jobTitle: 'Chef de Cozinha',
        otherPartyName: 'Restaurante Gourmet',
        otherPartyRole: 'RESTAURANTE',
        lastMessageContent: 'Olá, tudo bem?',
        lastMessageTime: new Date(),
        unreadCount: 2,
      },
      {
        jobId: 'job-2',
        jobTitle: 'Garçom',
        otherPartyName: 'João Silva',
        otherPartyRole: 'PROFISSIONAL',
        lastMessageContent: 'Tenho interesse na vaga',
        lastMessageTime: new Date(Date.now() - 3600000),
        unreadCount: 0,
      },
    ]);

    mockMessagingService = {
      chats: mockChats,
      pendingApplications: signal([]),
      connecting: signal(false),
      error: signal(null),
      connected: signal(true),
      currentJobId: signal<string | null>(null),
      connect: vi.fn(),
      disconnect: vi.fn(),
      clearError: vi.fn(),
      loadUserChats: vi.fn().mockResolvedValue([]),
      loadPendingApplications: vi.fn().mockResolvedValue(undefined),
    };

    mockAuthService = {
      getUser: vi.fn().mockReturnValue({ id: 'user-1', role: 'PROFISSIONAL' }),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockRoute = {
      snapshot: createMockRouteSnapshot(),
    };

    await TestBed.configureTestingModule({
      imports: [MensagensLista],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MessagingService, useValue: mockMessagingService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MensagensLista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call messagingService.connect on init', () => {
    expect(mockMessagingService.connect).toHaveBeenCalled();
  });

  it('should call messagingService.disconnect on destroy', () => {
    component.ngOnDestroy();
    expect(mockMessagingService.disconnect).toHaveBeenCalled();
  });

  it('should load chats and pending applications on init', () => {
    expect(mockMessagingService.loadUserChats).toHaveBeenCalled();
    expect(mockMessagingService.loadPendingApplications).toHaveBeenCalled();
  });

  it('should filter conversations by the typed term', () => {
    component.query.set('gar');
    expect(component.conversasAtivas().map((c) => c.jobId)).toEqual(['job-2']);

    component.query.set('');
    expect(component.conversasAtivas()).toHaveLength(2);
  });

  it('should format time as Figma: hour today, "Ontem", days and date', () => {
    const hoje1030 = new Date();
    hoje1030.setHours(10, 30, 0, 0);
    expect(component.formatTime(hoje1030)).toBe('10:30');

    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    expect(component.formatTime(ontem)).toBe('Ontem');

    const tresDias = new Date();
    tresDias.setDate(tresDias.getDate() - 3);
    expect(component.formatTime(tresDias)).toBe('3d');

    const duasSemanas = new Date();
    duasSemanas.setDate(duasSemanas.getDate() - 14);
    const esperado = duasSemanas.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    expect(component.formatTime(duasSemanas)).toBe(esperado);
  });

  it('should get initials from name', () => {
    expect(component.getInitials('João Silva')).toBe('JS');
    expect(component.getInitials('Maria')).toBe('M');
    expect(component.getInitials('Ana Paula Souza')).toBe('AP');
  });
});