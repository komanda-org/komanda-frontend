import { Component, DestroyRef, OnInit, OnDestroy, signal, computed, effect, viewChild, ElementRef, afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MessagingService } from '../../../core/services/messaging/messaging.service';
import { MessageResponse } from '../../../core/models/messaging/message.model';
import { ChatRef, isSameChat } from '../../../core/models/messaging/chat.model';

@Component({
  selector: 'app-mensagens-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './mensagens-chat.html',
  styleUrl: './mensagens-chat.scss',
})
export class MensagensChat implements OnInit, OnDestroy {
  readonly jobId = signal<string>('');
  readonly professionalId = signal<string>('');
  private readonly chatRef = computed<ChatRef>(() => ({ jobId: this.jobId(), professionalId: this.professionalId() }));
  private readonly destroyRef = inject(DestroyRef);
  readonly sending = signal(false);
  readonly newMessage = signal('');

  // Use computed to access messagingService after constructor initialization
  readonly messages = computed(() => this.messagingService.messages());
  readonly currentChat = computed(() => this.messagingService.currentChat());
  readonly hasMore = computed(() => this.messagingService.hasMore());
  readonly loading = computed(() => this.messagingService.connecting());
  readonly error = computed(() => this.messagingService.error());
  readonly currentUser = computed(() => this.authService.getUser());
  readonly otherPartyOnline = computed(() => this.messagingService.otherPartyOnline());
  private readonly chatItem = computed(() =>
    this.messagingService.chats().find((c) => isSameChat(c, this.chatRef())),
  );
  readonly otherPartyName = computed(() => this.chatItem()?.otherPartyName ?? '');
  readonly isInChat = computed(() => isSameChat(this.currentChat(), this.chatRef()));
  readonly titulo = computed(() => this.chatItem()?.otherPartyName ?? '');
  readonly subtitulo = computed(() => this.chatItem()?.jobTitle ?? '');

  readonly chatMessages = computed(() => this.messages().filter((m) => {
    if (m.professionalId === '') return true; // mensagem do restaurante: exibe em toda conversa da vaga
    return isSameChat(m, this.chatRef());
  }));

  /** Agrupa mensagens consecutivas do mesmo remetente para mostrar o avatar so no primeiro. */
  readonly messageGroups = computed(() => {
    const messages = this.chatMessages();
    const groups: Array<{ senderId: string; messages: MessageResponse[] }> = [];

    for (const message of messages) {
      const last = groups[groups.length - 1];
      if (last && last.senderId === message.senderId) {
        last.messages.push(message);
      } else {
        groups.push({ senderId: message.senderId, messages: [message] });
      }
    }

    return groups;
  });

  private messagesEnd = viewChild<ElementRef<HTMLDivElement>>('messagesEnd');
  private shouldScrollToBottom = false;

  constructor(
    public readonly messagingService: MessagingService,
    private readonly authService: AuthService,
    public readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    afterNextRender(() => {
      this.scrollToBottom();
    });

    effect(() => {
      if (this.shouldScrollToBottom && this.chatMessages()) {
        this.scrollToBottom();
        this.shouldScrollToBottom = false;
      }
    });
  }

  ngOnInit(): void {
    this.messagingService.connect();
    // O shell reaproveita este componente ao trocar de conversa: reage a cada troca de rota.
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const jobId = params.get('jobId');
      const professionalId = params.get('professionalId');
      if (!jobId || !professionalId) {
        this.router.navigate(['/mensagens']);
        return;
      }
      if (jobId === this.jobId() && professionalId === this.professionalId()) {
        return;
      }
      if (this.jobId()) {
        this.messagingService.leaveChat(this.jobId(), this.professionalId());
      }
      this.jobId.set(jobId);
      this.professionalId.set(professionalId);
      this.newMessage.set('');
      this.loadChat(jobId, professionalId);
    });
  }

  ngOnDestroy(): void {
    if (this.jobId()) {
      this.messagingService.leaveChat(this.jobId(), this.professionalId());
    }
  }

  private async loadChat(jobId: string, professionalId: string): Promise<void> {
    try {
      await this.messagingService.joinChat(jobId, professionalId);
      this.shouldScrollToBottom = true;
    } catch (err) {
      console.error('Erro ao carregar chat:', err);
    }
  }

  isNewDateGroup(message: MessageResponse): boolean {
    const messages = this.chatMessages();
    const index = messages.findIndex((m) => m.id === message.id);
    if (index <= 0) return true;
    const prev = messages[index - 1];
    return this.formatDate(message.createdAt) !== this.formatDate(prev.createdAt);
  }

  getUserDisplayName(): string {
    const user = this.currentUser();
    if (!user) return 'Usuário';
    // AuthUser only has id and role, so we use role as fallback
    return user.role === 'PROFISSIONAL' ? 'Profissional' : 'Restaurante';
  }

  async sendMessage(): Promise<void> {
    const content = this.newMessage().trim();
    if (!content || this.sending()) return;

    this.sending.set(true);
    this.newMessage.set('');

    try {
      await this.messagingService.sendMessage(this.jobId(), this.professionalId(), content);
      this.shouldScrollToBottom = true;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      this.sending.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.chatMessages().length === 0) return;

    const oldest = this.chatMessages()[0];
    try {
      await this.messagingService.loadHistory(this.jobId(), this.professionalId(), new Date(oldest.createdAt));
    } catch (err) {
      console.error('Erro ao carregar mais mensagens:', err);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    const el = this.messagesEnd()?.nativeElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (msgDate.getTime() === today.getTime()) {
      return 'Hoje';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.getTime() === yesterday.getTime()) {
      return 'Ontem';
    }

    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  trackByMessageId(index: number, message: MessageResponse): string {
    return message.id;
  }
}