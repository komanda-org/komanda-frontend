import { InjectionToken, Injectable, inject, signal, computed } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../auth.service';
import { MessageResponse } from '../../models/messaging/message.model';
import { ChatListItem, ChatRef, isSameChat } from '../../models/messaging/chat.model';

/** Forma de /users/me/applications?status=PENDENTE (KMD-79). */
export interface PendingApplication {
  applicationId: string;
  status: string;
  applicationDate: Date | string;
  job: { id: string; title: string };
  restaurant: { id: string; name: string };
}

interface ChatPayload {
  jobId: string;
  /** Obrigatorio para restaurante; para profissional a API usa o id do token. */
  professionalId?: string;
}

interface ServerToClientEvents {
  'chat:message': (message: MessageResponse) => void;
  'chat:error': (error: { statusCode: number; message: string }) => void;
  'chat:presence': (data: { jobId: string; professionalId?: string; online: boolean }) => void;
}

interface ClientToServerEvents {
  'chat:join': (data: ChatPayload & { take?: number }, ack: (response: JoinResponse) => void) => void;
  'chat:leave': (data: ChatPayload, ack: (response: { ok: boolean; error?: any }) => void) => void;
  'chat:send': (data: ChatPayload & { content: string }, ack: (response: SendResponse) => void) => void;
  'chat:history': (
    data: ChatPayload & { before?: string; take?: number },
    ack: (response: HistoryResponse) => void,
  ) => void;
}

interface JoinResponse {
  ok: boolean;
  messages?: MessageResponse[];
  hasMore?: boolean;
  error?: { statusCode: number; message: string };
}

interface SendResponse {
  ok: boolean;
  message?: MessageResponse;
  error?: { statusCode: number; message: string };
}

interface HistoryResponse {
  ok: boolean;
  messages?: MessageResponse[];
  hasMore?: boolean;
  error?: { statusCode: number; message: string };
}

/** Troca o socket.io real por um falso nos testes. */
export const SOCKET_FACTORY = new InjectionToken<typeof io>('SOCKET_FACTORY', { factory: () => io });

const byCreatedAt = (a: MessageResponse, b: MessageResponse) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

@Injectable({ providedIn: 'root' })
export class MessagingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly createSocket = inject(SOCKET_FACTORY);

  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  /** Token usado para abrir o socket atual — muda quando a sessao troca. */
  private socketToken: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private readonly _connected = signal(false);
  private readonly _currentChat = signal<ChatRef | null>(null);
  private readonly _messages = signal<MessageResponse[]>([]);
  private readonly _hasMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _chats = signal<ChatListItem[]>([]);
  private readonly _pending = signal<PendingApplication[]>([]);
  private readonly _connecting = signal(false);
  /** Se o outro participante do chat atual esta online (via presença do servidor). */
  private readonly _otherPartyOnline = signal(false);

  readonly connected = this._connected.asReadonly();
  readonly currentChat = this._currentChat.asReadonly();
  readonly messages = this._messages.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly chats = this._chats.asReadonly();
  readonly pendingApplications = this._pending.asReadonly();
  readonly connecting = this._connecting.asReadonly();
  /** Verdadeiro apenas quando o outro participante esta online. */
  readonly otherPartyOnline = this._otherPartyOnline.asReadonly();

  readonly currentChatMessages = computed(() => {
    const chat = this._currentChat();
    if (!chat) return [];
    return this._messages().filter((m) => isSameChat(m, chat));
  });

  connect(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    const token = this.authService.getToken();
    if (!token) {
      this._error.set('Usuário não autenticado');
      return Promise.resolve();
    }

    // Sessao trocou (logout + login): o socket antigo guarda o token antigo no
    // auth, e o servidor rejeita o join com ele — reconecta com o token atual.
    if (this.socket && this.socketToken !== token) {
      this.disconnect();
    }

    if (this.socket?.connected) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this._connecting.set(true);
    this._error.set(null);

    const wsUrl = environment.apiUrl.replace('/api', '');

    this.socketToken = token;
    this.socket = this.createSocket(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this._connected.set(true);
      this._connecting.set(false);
    });

    this.socket.on('disconnect', () => {
      this._connected.set(false);
      this._connecting.set(false);
    });

    this.socket.on('connect_error', (err) => {
      this._connecting.set(false);
      this._error.set(`Erro de conexão: ${err.message}`);
    });

    this.socket.on('chat:message', (message) => this.receiveMessage(message));

    this.socket.on('chat:error', (error) => {
      this._error.set(error.message);
    });

    // Presença do outro participante: o servidor avisa quando entra/sai do chat.
    this.socket.on('chat:presence', (data) => {
      if (isSameChat({ jobId: data.jobId, professionalId: data.professionalId ?? '' }, this._currentChat())) {
        this._otherPartyOnline.set(data.online);
      }
    });

    const socket = this.socket;

    this.connectionPromise = new Promise<void>((resolve) => {
      // socket.io tenta reconectar sozinho; o teto evita join pendurado.
      const timeout = setTimeout(resolve, 8000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
    }).finally(() => {
      this.connectionPromise = null;
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    this.connectionPromise = null;
    this.socketToken = null;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this._connected.set(false);
      this.resetConversation();
    }
  }

  async joinChat(
    jobId: string,
    professionalId: string,
    take = 20,
  ): Promise<{ messages: MessageResponse[]; hasMore: boolean }> {
    await this.connect();
    const chat = this.toChatRef(jobId, professionalId);

    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Não conectado ao servidor'));
        return;
      }

      this.resetConversation();
      this._currentChat.set(chat);

      this.socket.emit('chat:join', { ...chat, take }, (response: JoinResponse) => {
        // A pessoa pode ter trocado de conversa antes do ack chegar.
        if (!isSameChat(chat, this._currentChat())) {
          resolve({ messages: [], hasMore: false });
          return;
        }
        if (response.ok && response.messages) {
          this._messages.set(response.messages);
          this._hasMore.set(response.hasMore ?? false);
          this.updateChat(chat, { unreadCount: 0 });
          resolve({ messages: response.messages, hasMore: response.hasMore ?? false });
        } else {
          this._error.set(response.error?.message || 'Erro ao entrar no chat');
          reject(new Error(response.error?.message || 'Erro ao entrar no chat'));
        }
      });
    });
  }

  leaveChat(jobId: string, professionalId: string): Promise<void> {
    const chat = this.toChatRef(jobId, professionalId);

    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        resolve();
        return;
      }

      this.socket.emit('chat:leave', chat, (response) => {
        if (response.ok) {
          if (isSameChat(chat, this._currentChat())) {
            this.resetConversation();
          }
          resolve();
        } else {
          reject(new Error(response.error?.message || 'Erro ao sair do chat'));
        }
      });
    });
  }

  async sendMessage(jobId: string, professionalId: string, content: string): Promise<MessageResponse> {
    await this.connect();
    const chat = this.toChatRef(jobId, professionalId);

    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Não conectado ao servidor'));
        return;
      }

      this.socket.emit('chat:send', { ...chat, content }, (response: SendResponse) => {
        if (response.ok && response.message) {
          // O ack garante que o remetente veja a mensagem mesmo se o broadcast
          // da room chegar antes do join ou for perdido.
          this.receiveMessage(response.message);
          resolve(response.message);
        } else {
          this._error.set(response.error?.message || 'Erro ao enviar mensagem');
          reject(new Error(response.error?.message || 'Erro ao enviar mensagem'));
        }
      });
    });
  }

  async loadHistory(
    jobId: string,
    professionalId: string,
    before?: Date,
    take = 20,
  ): Promise<{ messages: MessageResponse[]; hasMore: boolean }> {
    await this.connect();
    const chat = this.toChatRef(jobId, professionalId);

    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Não conectado ao servidor'));
        return;
      }

      this.socket.emit(
        'chat:history',
        { ...chat, before: before?.toISOString(), take },
        (response: HistoryResponse) => {
          if (response.ok && response.messages) {
            if (isSameChat(chat, this._currentChat())) {
              const known = new Set(this._messages().map((m) => m.id));
              const older = response.messages.filter((m) => !known.has(m.id));
              this._messages.update((current) => [...older, ...current].sort(byCreatedAt));
              this._hasMore.set(response.hasMore ?? false);
            }
            resolve({ messages: response.messages, hasMore: response.hasMore ?? false });
          } else {
            reject(new Error(response.error?.message || 'Erro ao carregar histórico'));
          }
        },
      );
    });
  }

  clearError(): void {
    this._error.set(null);
  }

  addChat(chat: ChatListItem): void {
    this._chats.update((current) => {
      if (current.some((c) => isSameChat(c, chat))) return current;
      return [...current, chat].sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
    });
  }

  updateChat(chat: ChatRef, updates: Partial<ChatListItem>): void {
    this._chats.update((current) => current.map((c) => (isSameChat(c, chat) ? { ...c, ...updates } : c)));
  }

  removeChat(chat: ChatRef): void {
    this._chats.update((current) => current.filter((c) => !isSameChat(c, chat)));
  }

  clearChats(): void {
    this._chats.set([]);
  }

  loadUserChats(): Promise<ChatListItem[]> {
    this._error.set(null);

    return this.http
      .get<ChatListItem[]>(`${environment.apiUrl}/jobs/my-chats`)
      .toPromise()
      .then((chats) => {
        if (chats) {
          this._chats.set(chats);
        }
        this._error.set(null);
        return chats ?? [];
      })
      .catch((error) => {
        this._error.set('Erro ao carregar conversas');
        throw error;
      });
  }

  /**
   * Candidaturas ainda nao aprovadas: alimenta a secao "Aguardando aprovacao"
   * da lista. So existe para profissional — o restaurante nao tem candidaturas.
   */
  loadPendingApplications(): Promise<void> {
    if (this.authService.getUser()?.role !== 'PROFISSIONAL') {
      return Promise.resolve();
    }

    return this.http
      .get<{ data: PendingApplication[] }>(
        `${environment.apiUrl}/users/me/applications?status=PENDENTE`,
      )
      .toPromise()
      .then((response) => this._pending.set(response?.data ?? []))
      .catch(() => this._pending.set([]));
  }

  /** Para o profissional a conversa e sempre com ele mesmo: o id vem da sessao. */
  private toChatRef(jobId: string, professionalId: string): ChatRef {
    const user = this.authService.getUser();
    return { jobId, professionalId: user?.role === 'PROFISSIONAL' ? user.id : professionalId };
  }

  private resetConversation(): void {
    this._currentChat.set(null);
    this._messages.set([]);
    this._hasMore.set(false);
    this._otherPartyOnline.set(false);
  }

  // Mensagem de outra conversa nao entra na tela aberta: so conta como nao lida.
  private receiveMessage(message: MessageResponse): void {
    this.updateChat(message, {
      lastMessageContent: message.content,
      lastMessageTime: message.createdAt,
    });

    if (isSameChat(message, this._currentChat())) {
      this._messages.update((current) =>
        current.some((m) => m.id === message.id) ? current : [...current, message].sort(byCreatedAt),
      );
      return;
    }

    // Ceiling: volta a 0 no reload (sem leitura persistida no backend).
    if (message.senderId !== this.authService.getUser()?.id) {
      this._chats.update((chats) =>
        chats.map((c) => (isSameChat(c, message) ? { ...c, unreadCount: c.unreadCount + 1 } : c)),
      );
    }
  }
}
