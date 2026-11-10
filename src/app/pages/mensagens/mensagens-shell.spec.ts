import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { MessagingService } from '../../core/services/messaging/messaging.service';
import { MensagensShell } from './mensagens-shell';

function createMockRoute(jobId: string | null) {
  const paramMap = {
    get: vi.fn().mockReturnValue(jobId),
    has: vi.fn().mockReturnValue(jobId !== null),
    getAll: vi.fn().mockReturnValue(jobId ? [jobId] : []),
    keys: jobId ? ['jobId'] : [],
  };
  return {
    paramMap: {
      ...paramMap,
      subscribe: (fn: (value: typeof paramMap) => void) => {
        fn(paramMap);
        return { unsubscribe: () => undefined };
      },
    },
    snapshot: { paramMap },
  } as unknown as ActivatedRoute;
}

function createMockMessaging() {
  return {
    chats: signal([]),
    messages: signal([]),
    pendingApplications: signal([]),
    connecting: signal(false),
    connected: signal(false),
    currentJobId: signal<string | null>(null),
    hasMore: signal(false),
    error: signal<string | null>(null),
    connect: vi.fn(),
    disconnect: vi.fn(),
    clearError: vi.fn(),
    loadUserChats: vi.fn().mockResolvedValue([]),
    loadPendingApplications: vi.fn().mockResolvedValue(undefined),
    joinChat: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
    leaveChat: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn(),
    loadHistory: vi.fn(),
  };
}

describe('MensagensShell', () => {
  async function setup(jobId: string | null) {
    await TestBed.configureTestingModule({
      imports: [MensagensShell],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: createMockRoute(jobId) },
        { provide: MessagingService, useValue: createMockMessaging() },
        {
          provide: AuthService,
          useValue: { getUser: vi.fn().mockReturnValue({ id: 'user-1', role: 'PROFISSIONAL' }) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MensagensShell);
    fixture.detectChanges();
    return { fixture };
  }

  it('mostra o estado vazio quando nenhuma conversa esta aberta', async () => {
    const { fixture } = await setup(null);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.selecionar')).toBeTruthy();
    expect(el.querySelector('app-mensagens-chat')).toBeNull();
    expect(el.querySelector('app-mensagens-lista')).toBeTruthy();
  });

  it('abre o chat quando ha jobId na rota', async () => {
    const { fixture } = await setup('job-1');
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('app-mensagens-chat')).toBeTruthy();
    expect(el.querySelector('.selecionar')).toBeNull();
  });
});
