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
  jobTitle: string;
  otherPartyName: string;
  otherPartyPhoto: string | null;
  otherPartyRole: 'PROFISSIONAL' | 'RESTAURANTE';
  lastMessageContent?: string;
  lastMessageTime?: Date | string;
  unreadCount: number;
}