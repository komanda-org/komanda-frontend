import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification, NotificationsPage } from '../models/notifications.model';

export const NOTIFICATIONS_PAGE_SIZE = 20;
// Limite do DTO da API.
const MAX_TAKE = 50;

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users/me/notifications`;

  list(skip = 0, take = NOTIFICATIONS_PAGE_SIZE): Observable<NotificationsPage> {
    const params = new HttpParams()
      .set('skip', Math.max(0, skip))
      .set('take', Math.min(Math.max(1, take), MAX_TAKE));
    return this.http.get<NotificationsPage>(this.base, { params });
  }

  markAsRead(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.base}/${encodeURIComponent(id)}/read`, {});
  }
}
