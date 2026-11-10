import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MensagensChat } from './mensagens-chat';
import { MessagingService } from '../../../core/services/messaging/messaging.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router, ActivatedRoute, ActivatedRouteSnapshot, ParamMap } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { signal, Signal } from '@angular/core';
import { MessageResponse } from '../../../core/models/messaging/message.model';

function createMockParamMap(jobId: string | null): ParamMap {
  const keysList = jobId ? [jobId] : [];
  return {
    get: vi.fn().mockReturnValue(jobId),
    has: vi.fn().mockReturnValue(jobId !== null),
    getAll: vi.fn().mockReturnValue(keysList),
    keys: keysList,
  };
}

function createMockRouteSnapshot(jobId: string | null): ActivatedRouteSnapshot {
  return {
    paramMap: createMockParamMap(jobId),
    url: [],
    params: jobId ? { jobId } : {},
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
    queryParamMap: createMockParamMap(null),
    title: undefined,
    toString: () => '/mensagens' + (jobId ? '/' + jobId : ''),
  } as ActivatedRouteSnapshot;
}

describe('MensagensChat', () => {
  let component: MensagensChat;
  let fixture: ComponentFixture<MensagensChat>;
  let mockMessagingService: Partial<MessagingService>;
  let mockAuthService: Partial<AuthService>;
  let mockRouter: Partial<Router>;
  let mockRoute: Partial<ActivatedRoute>;

  const mockMessages: MessageResponse[] = [
    {
      id: 'msg-1',
      jobId: 'job-1',
      senderId: 'user-1',
      content: 'Olá, tudo bem?',
      createdAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: 'msg-2',
      jobId: 'job-1',
      senderId: 'user-2',
      content: 'Tudo ótimo! E com você?',
      createdAt: new Date('2024-01-15T10:05:00Z'),
    },
    {
      id: 'msg-3',
      jobId: 'job-1',
      senderId: 'user-1',
      content: 'Também estou bem.',
      createdAt: new Date('2024-01-15T10:10:00Z'),
    },
  ];

  beforeEach(async () => {
    const messagesSignal = signal<MessageResponse[]>(mockMessages);
    const currentJobIdSignal = signal<string>('job-1');
    const hasMoreSignal = signal(false);
    const connectingSignal = signal(false);
    const errorSignal = signal<string | null>(null);
    const connectedSignal = signal(true);
    const otherPartyOnlineSignal = signal(true);

    mockMessagingService = {
      chats: signal([]),
      messages: messagesSignal,
      currentJobId: currentJobIdSignal,
      hasMore: hasMoreSignal,
      connecting: connectingSignal,
      error: errorSignal,
      connected: connectedSignal,
      otherPartyOnline: otherPartyOnlineSignal,
      connect: vi.fn(),
      leaveChat: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(mockMessages[0]),
      loadHistory: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
      joinChat: vi.fn().mockResolvedValue({ messages: mockMessages, hasMore: false }),
      clearError: vi.fn(),
    };

    mockAuthService = {
      getUser: vi.fn().mockReturnValue({ id: 'user-1', role: 'PROFISSIONAL' }),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockRoute = {
      snapshot: createMockRouteSnapshot('job-1'),
    };

    await TestBed.configureTestingModule({
      imports: [MensagensChat],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MessagingService, useValue: mockMessagingService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MensagensChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call messagingService.connect on init', () => {
    expect(mockMessagingService.connect).toHaveBeenCalled();
  });

  it('should call messagingService.leaveChat on destroy', () => {
    component.ngOnDestroy();
    expect(mockMessagingService.leaveChat).toHaveBeenCalledWith('job-1');
  });

  it('should send message when sendMessage is called', async () => {
    component.newMessage.set('Nova mensagem');
    await component.sendMessage();

    expect(mockMessagingService.sendMessage).toHaveBeenCalledWith('job-1', 'Nova mensagem');
    expect(component.newMessage()).toBe('');
  });

  it('should not send empty message', async () => {
    component.newMessage.set('   ');
    await component.sendMessage();

    expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
  });

  it('should not send message when already sending', async () => {
    component.sending.set(true);
    component.newMessage.set('Nova mensagem');
    await component.sendMessage();

    expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
  });

  it('should format time correctly', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = component.formatTime(date);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should format date correctly for today', () => {
    const today = new Date();
    const result = component.formatDate(today);
    expect(result).toBe('Hoje');
  });

  it('should format date correctly for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = component.formatDate(yesterday);
    expect(result).toBe('Ontem');
  });

  it('should format date correctly for older dates', () => {
    const olderDate = new Date('2024-01-10T10:00:00Z');
    const result = component.formatDate(olderDate);
    expect(result).toBe('10/01/2024');
  });

  it('should get initials from name', () => {
    expect(component.getInitials('João Silva')).toBe('JS');
    expect(component.getInitials('Maria')).toBe('M');
  });

  it('should get user display name based on role', () => {
    expect(component.getUserDisplayName()).toBe('Profissional');
  });

  it('should detect new date groups correctly', () => {
    // The component's chatMessages are based on mockMessages which have ids msg-1, msg-2, msg-3
    // We need to test with messages from the actual chatMessages
    const chatMessages = component.chatMessages();

    // First message should always be a new date group
    expect(component.isNewDateGroup(chatMessages[0])).toBe(true);
    // Same date should not be new group
    expect(component.isNewDateGroup(chatMessages[1])).toBe(false);
    // Same date should not be new group
    expect(component.isNewDateGroup(chatMessages[2])).toBe(false);
  });

  it('should track messages by id', () => {
    const msg: MessageResponse = { id: 'msg-1', jobId: 'job-1', senderId: 'user-1', content: 'test', createdAt: new Date() };
    expect(component.trackByMessageId(0, msg)).toBe('msg-1');
  });
});