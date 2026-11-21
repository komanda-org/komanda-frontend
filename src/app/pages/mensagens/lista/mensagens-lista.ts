import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessagingService } from '../../../core/services/messaging/messaging.service';
import { ChatListItem, chatKey, isSameChat } from '../../../core/models/messaging/chat.model';

@Component({
  selector: 'app-mensagens-lista',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mensagens-lista.html',
  styleUrl: './mensagens-lista.scss',
})
export class MensagensLista implements OnInit, OnDestroy {
  readonly chats = computed(() => this.messagingService.chats());
  readonly loading = computed(() => this.messagingService.connecting());
  readonly error = computed(() => this.messagingService.error());
  readonly query = signal('');

  readonly conversasAtivas = computed(() => {
    const termo = this.query().trim().toLowerCase();
    if (!termo) {
      return this.chats();
    }

    return this.chats().filter((chat) =>
      [chat.jobTitle, chat.otherPartyName].some((nome) => nome.toLowerCase().includes(termo)),
    );
  });

  readonly pendentes = computed(() => this.messagingService.pendingApplications());
  readonly conversaAtiva = computed(() => this.messagingService.currentChat());
  readonly chatKey = chatKey;

  constructor(public readonly messagingService: MessagingService) {}

  ngOnInit(): void {
    this.messagingService.connect();
    this.messagingService.loadUserChats().catch(() => {
      // O erro ja esta no sinal de error, exibido no template.
    });
    this.messagingService.loadPendingApplications().catch(() => {});
  }

  ngOnDestroy(): void {
    this.messagingService.disconnect();
  }

  isActive(chat: ChatListItem): boolean {
    return isSameChat(chat, this.conversaAtiva());
  }

  /** Restaurante com 2 aprovados na mesma vaga: o nome do profissional distingue as conversas. */
  chatTitle(chat: ChatListItem): string {
    return chat.otherPartyRole === 'PROFISSIONAL' ? `${chat.otherPartyName} · ${chat.jobTitle}` : chat.otherPartyName;
  }

  isToday(date: Date | string | undefined): boolean {
    if (!date) {
      return false;
    }

    const d = new Date(date);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  formatTime(date: Date | string | undefined): string {
    if (!date) {
      return '';
    }

    const d = new Date(date);
    const now = new Date();
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diasAtras = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);

    if (diasAtras <= 0) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diasAtras === 1) {
      return 'Ontem';
    }
    if (diasAtras < 7) {
      return `${diasAtras}d`;
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
