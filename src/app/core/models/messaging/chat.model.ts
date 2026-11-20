import { Message } from './message.model';

export interface Chat {
  jobId: string;
  jobTitle: string;
  restaurantName: string;
  professionalName: string;
  lastMessage?: Message;
  unreadCount: number;
  isOwner: boolean;
}

export interface ChatListItem {
  jobId: string;
  professionalId: string;
  jobTitle: string;
  otherPartyName: string;
  otherPartyPhoto: string | null;
  otherPartyRole: 'PROFISSIONAL' | 'RESTAURANTE';
  lastMessageContent?: string;
  lastMessageTime?: Date | string;
  unreadCount: number;
}

/** Uma conversa: a vaga e o profissional aprovado nela. */
export interface ChatRef {
  jobId: string;
  professionalId: string;
}

export function chatKey(chat: ChatRef): string {
  return `${chat.jobId}:${chat.professionalId}`;
}

export function isSameChat(a: ChatRef | null | undefined, b: ChatRef | null | undefined): boolean {
  return !!a && !!b && a.jobId === b.jobId && a.professionalId === b.professionalId;
}
