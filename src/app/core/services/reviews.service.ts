import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateReviewPayload, Review } from '../models/profile.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;
  // TODO API: nenhuma rota diz se o usuario ja avaliou; ate la guardamos so em memoria (201 ou 409).
  private readonly reviewed = signal<ReadonlySet<string>>(new Set());

  create(payload: CreateReviewPayload): Observable<Review> {
    return this.http.post<Review>(`${this.base}/users/reviews`, payload);
  }

  isReviewed(jobId: string, receiverId: string): boolean {
    return this.reviewed().has(this.key(jobId, receiverId));
  }

  markReviewed(jobId: string, receiverId: string): void {
    const key = this.key(jobId, receiverId);
    this.reviewed.update((keys) => new Set(keys).add(key));
  }

  // Inclui quem avalia: outra conta na mesma aba nao herda o "Avaliado".
  private key(jobId: string, receiverId: string): string {
    return `${this.auth.getUser()?.id ?? ''}:${jobId}:${receiverId}`;
  }
}
