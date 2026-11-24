import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChatListItem } from '../../models/messaging/chat.model';
import { MessageResponse } from '../../models/messaging/message.model';
import { AuthService } from '../auth.service';
import { MessagingService, SOCKET_FACTORY } from './messaging.service';

type Handler = (...args: any[]) => void;

/** Socket falso: guarda os emits e deixa o teste disparar eventos do servidor. */
class FakeSocket {
  connected = false;
  readonly emitted: { event: string; data: any }[] = [];
  private readonly handlers = new Map<string, Handler[]>();
  ackWith: (event: string, data: any) => unknown = () => ({ ok: true, messages: [], hasMore: false });

  on(event: string, handler: Handler): this {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    if (event === 'connect') {
      queueMicrotask(() => {
        this.connected = true;
        handler();
      });
    }
    return this;
  }

  once(event: string, handler: Handler): this {
    return this.on(event, handler);
  }

  emit(event: string, data: any, ack?: Handler): this {
    this.emitted.push({ event, data });
    ack?.(this.ackWith(event, data));
    return this;
  }

  fire(event: string, payload: unknown): void {
    (this.handlers.get(event) ?? []).forEach((handler) => handler(payload));
  }

  disconnect(): void {
    this.connected = false;
  }
}

const message = (id: string, jobId: string, professionalId: string, senderId = 'other'): MessageResponse => ({
  id,
  jobId,
  professionalId,
  senderId,
  content: `Mensagem ${id}`,
  createdAt: '2026-11-20T12:00:00.000Z',
});

const chat = (jobId: string, professionalId: string, name: string): ChatListItem => ({
  jobId,
  professionalId,
  jobTitle: 'Garçom',
  otherPartyName: name,
  otherPartyPhoto: null,
  otherPartyRole: 'PROFISSIONAL',
  unreadCount: 0,
});

describe('MessagingService', () => {
  let service: MessagingService;
  let socket: FakeSocket;

  function setup(user: { id: string; role: 'PROFISSIONAL' | 'RESTAURANTE' }): void {
    socket = new FakeSocket();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SOCKET_FACTORY, useValue: () => socket },
        { provide: AuthService, useValue: { getToken: () => 'tok', getUser: () => user } },
      ],
    });
    service = TestBed.inject(MessagingService);
  }

  const lastEmit = (event: string) => [...socket.emitted].reverse().find((e) => e.event === event)?.data;
  const unread = () => Object.fromEntries(service.chats().map((c) => [`${c.jobId}:${c.professionalId}`, c.unreadCount]));

  describe('as a restaurant', () => {
    beforeEach(() => setup({ id: 'r1', role: 'RESTAURANTE' }));

    it('sends the professionalId in join, send, history and leave', async () => {
      await service.joinChat('j1', 'p2');
      socket.ackWith = (event) =>
        event === 'chat:send' ? { ok: true, message: message('m1', 'j1', 'p2', 'r1') } : { ok: true, messages: [] };
      await service.sendMessage('j1', 'p2', 'Olá');
      await service.loadHistory('j1', 'p2', new Date('2026-11-20T12:00:00.000Z'));
      await service.leaveChat('j1', 'p2');

      expect(lastEmit('chat:join')).toEqual({ jobId: 'j1', professionalId: 'p2', take: 20 });
      expect(lastEmit('chat:send')).toEqual({ jobId: 'j1', professionalId: 'p2', content: 'Olá' });
      expect(lastEmit('chat:history')).toMatchObject({ jobId: 'j1', professionalId: 'p2' });
      expect(lastEmit('chat:leave')).toEqual({ jobId: 'j1', professionalId: 'p2' });
    });

    it('keeps messages of the other professional of the same job out of the open chat', async () => {
      await service.joinChat('j1', 'p1');

      socket.fire('chat:message', message('m1', 'j1', 'p1'));
      socket.fire('chat:message', message('m2', 'j1', 'p2'));

      expect(service.currentChatMessages().map((m) => m.id)).toEqual(['m1']);
      expect(service.messages().map((m) => m.id)).toEqual(['m1']);
    });

    it('counts unread messages per conversation, not per job', async () => {
      service.addChat(chat('j1', 'p1', 'Ana'));
      service.addChat(chat('j1', 'p2', 'Bruno'));
      await service.joinChat('j1', 'p1');

      socket.fire('chat:message', message('m1', 'j1', 'p2'));
      socket.fire('chat:message', message('m2', 'j1', 'p2'));
      socket.fire('chat:message', message('m3', 'j1', 'p1'));

      expect(unread()).toEqual({ 'j1:p1': 0, 'j1:p2': 2 });
    });

    it('applies presence only for the open conversation', async () => {
      await service.joinChat('j1', 'p1');

      socket.fire('chat:presence', { jobId: 'j1', professionalId: 'p2', online: true });
      expect(service.otherPartyOnline()).toBe(false);

      socket.fire('chat:presence', { jobId: 'j1', professionalId: 'p1', online: true });
      expect(service.otherPartyOnline()).toBe(true);
    });

    it('treats the same job with two professionals as two chats', () => {
      service.addChat(chat('j1', 'p1', 'Ana'));
      service.addChat(chat('j1', 'p2', 'Bruno'));
      service.addChat(chat('j1', 'p1', 'Ana de novo'));

      expect(service.chats().map((c) => c.otherPartyName)).toEqual(['Ana', 'Bruno']);
    });
  });

  describe('as a professional', () => {
    beforeEach(() => setup({ id: 'p9', role: 'PROFISSIONAL' }));

    it('always uses the logged professional id', async () => {
      await service.joinChat('j1', 'qualquer');

      expect(lastEmit('chat:join')).toEqual({ jobId: 'j1', take: 20 });
      expect(service.currentChat()).toEqual({ jobId: 'j1', professionalId: 'p9' });
    });

    it('sends only the jobId in send, history and leave', async () => {
      await service.joinChat('j1', 'qualquer');
      socket.ackWith = (event) =>
        event === 'chat:send' ? { ok: true, message: message('m1', 'j1', 'p9', 'p9') } : { ok: true, messages: [] };
      await service.sendMessage('j1', 'qualquer', 'Oi');
      await service.loadHistory('j1', 'qualquer', new Date('2026-11-20T12:00:00.000Z'));
      await service.leaveChat('j1', 'qualquer');

      expect(lastEmit('chat:send')).toEqual({ jobId: 'j1', content: 'Oi' });
      expect(lastEmit('chat:history')).not.toHaveProperty('professionalId');
      expect(lastEmit('chat:leave')).toEqual({ jobId: 'j1' });
    });
  });
});
