/** Item de GET /users/me/notifications. Nao traz tipo nem id da vaga: so o titulo diz do que se trata. */
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  data: AppNotification[];
  total: number;
  skip: number;
  take: number;
}
