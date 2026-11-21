export interface Message {
  id: string;
  jobId: string;
  /** A conversa e por vaga + profissional: com 2 aprovados, a mesma vaga tem 2 chats. */
  professionalId: string;
  senderId: string;
  content: string;
  createdAt: Date | string;
}

export interface MessageResponse {
  id: string;
  jobId: string;
  /** A conversa e por vaga + profissional: com 2 aprovados, a mesma vaga tem 2 chats. */
  professionalId: string;
  senderId: string;
  content: string;
  createdAt: Date | string;
}