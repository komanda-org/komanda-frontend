export interface Message {
  id: string;
  jobId: string;
  senderId: string;
  content: string;
  createdAt: Date | string;
}

export interface MessageResponse {
  id: string;
  jobId: string;
  senderId: string;
  content: string;
  createdAt: Date | string;
}